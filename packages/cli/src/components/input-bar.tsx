import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

import type {
  KeyBinding,
  ScrollBoxRenderable,
  TextareaRenderable,
} from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useNavigate } from "react-router";

import { env } from "@nightcode/shared";
import { platform } from "node:os";
import type { Message } from "../hooks/use-chat";
import { copyToClipboard, readFromClipboard } from "../lib/export-messages";
import { useDialog } from "../providers/dialog";
import { useKeyboardLayer } from "../providers/keyboard-layer";
import { usePromptConfig } from "../providers/prompt-config";
import { useTheme } from "../providers/theme";
import { useToast } from "../providers/toast";
import { EmptyBorder } from "./border";
import { CommandMenu } from "./command-menu";
import type { Command } from "./command-menu/types";
import { useCommandMenu } from "./command-menu/use-command-menu";
import { StatusBar } from "./status-bar";

const MAX_VISIBLE_MENTIONS = 8;
const CURRENT_DIRECTORY = process.cwd();
const MAX_FALLBACK_MENTION_CANDIDATES = 32;
const MENTION_QUERY_CHARACTER = /[A-Za-z0-9._/-]/;
const RECURSIVE_MENTION_IGNORED_DIRECTORIES = new Set(["node_modules"]);

type MentionMatch = {
  start: number;
  end: number;
  query: string;
};

type MentionCandidate = {
  path: string;
  kind: "file" | "directory";
};

const isWithinCurrentDirectory = (targetPath: string) => {
  const relativePath = relative(CURRENT_DIRECTORY, targetPath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
};

const isMentionQueryCharacter = (character: string) => {
  return MENTION_QUERY_CHARACTER.test(character);
};

const VOICE_TMP_PATH = join(tmpdir(), "nightcode-voice.wav");

const getRecordingCommand = (): string[] => {
  const os = platform();

  if (os === "win32") {
    // ffmpeg with DirectShow audio input — produces a WAV file
    return [
      "ffmpeg",
      "-f",
      "dshow",
      "-i",
      "audio=@device_cm_{33D9A762-90C8-11D0-BD43-00A0C911CE86}\\wave_{default}",
      "-y",
      VOICE_TMP_PATH,
    ];
  }

  if (os === "darwin") {
    return ["sox", "-d", "-t", "wav", VOICE_TMP_PATH];
  }

  // Linux
  return ["arecord", "-f", "cd", "-t", "wav", VOICE_TMP_PATH];
};

const checkRecordingSupport = async (): Promise<boolean> => {
  const os = platform();
  const tool = os === "darwin" ? "sox" : os === "win32" ? "ffmpeg" : "arecord";
  try {
    const proc = Bun.spawn([tool, "-version"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
};
const findActiveMention = (
  text: string,
  cursorOffset: number,
): MentionMatch | null => {
  const safeOffset = Math.max(0, Math.min(cursorOffset, text.length));

  let start = safeOffset;
  while (start > 0 && !/\s/.test(text[start - 1]!)) {
    start -= 1;
  }

  let end = safeOffset;
  while (end < text.length && !/\s/.test(text[end]!)) {
    end += 1;
  }

  const token = text.slice(start, end);
  const relativeCursor = safeOffset - start;
  const mentionStart = token.lastIndexOf("@", relativeCursor);

  if (mentionStart === -1) {
    return null;
  }

  const previousCharacter = token[mentionStart - 1];
  if (previousCharacter && isMentionQueryCharacter(previousCharacter)) {
    return null;
  }

  let mentionEnd = mentionStart + 1;
  while (
    mentionEnd < token.length &&
    isMentionQueryCharacter(token[mentionEnd]!)
  ) {
    mentionEnd += 1;
  }

  if (relativeCursor < mentionStart || relativeCursor > mentionEnd) {
    return null;
  }

  return {
    start: start + mentionStart,
    end: start + mentionEnd,
    query: token.slice(mentionStart + 1, mentionEnd),
  };
};

const getMentionCandidate = async (
  query: string,
): Promise<MentionCandidate[]> => {
  const normalizedQuery = query.startsWith("./") ? query.slice(2) : query;
  if (normalizedQuery.startsWith("/")) {
    return [];
  }

  const hasTrailingSlash = normalizedQuery.endsWith("/");
  const lastSlashIndex = hasTrailingSlash
    ? normalizedQuery.length - 1
    : normalizedQuery.lastIndexOf("/");

  const directoryPart = hasTrailingSlash
    ? normalizedQuery.slice(0, -1)
    : lastSlashIndex === -1
      ? ""
      : normalizedQuery.slice(0, lastSlashIndex);

  const namePrefix = hasTrailingSlash
    ? ""
    : lastSlashIndex === -1
      ? normalizedQuery
      : normalizedQuery.slice(lastSlashIndex + 1);

  const absoluteDirectory = resolve(CURRENT_DIRECTORY, directoryPart || ".");
  if (!isWithinCurrentDirectory(absoluteDirectory)) {
    return [];
  }

  try {
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    const lowercasePrefix = namePrefix.toLowerCase();
    const showHiddenEntries = namePrefix.startsWith(".");

    const directMatches = entries
      .filter((entry) => showHiddenEntries || !entry.name.startsWith("."))
      .filter((entry) => {
        return (
          lowercasePrefix === "" ||
          entry.name.toLowerCase().startsWith(lowercasePrefix)
        );
      })
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      })
      .map((entry) => {
        const path = directoryPart
          ? `${directoryPart}/${entry.name}`
          : entry.name;
        const kind: MentionCandidate["kind"] = entry.isDirectory()
          ? "directory"
          : "file";
        return {
          path: kind === "directory" ? `${path}/` : path,
          kind,
        };
      });

    if (
      directMatches.length > 0 ||
      directoryPart !== "" ||
      namePrefix === "" ||
      namePrefix.length < 2
    ) {
      return directMatches;
    }

    const fallbackMatches: MentionCandidate[] = [];
    const visit = async (
      absoluteDirectory: string,
      directoryPart: string,
    ): Promise<void> => {
      const entries = await readdir(absoluteDirectory, { withFileTypes: true });

      for (const entry of entries) {
        if (!showHiddenEntries && entry.name.startsWith(".")) {
          continue;
        }

        if (
          entry.isDirectory() &&
          RECURSIVE_MENTION_IGNORED_DIRECTORIES.has(entry.name)
        ) {
          continue;
        }

        const path = directoryPart
          ? `${directoryPart}/${entry.name}`
          : entry.name;
        const kind: MentionCandidate["kind"] = entry.isDirectory()
          ? "directory"
          : "file";

        if (entry.name.toLowerCase().startsWith(lowercasePrefix)) {
          fallbackMatches.push({
            path: kind === "directory" ? `${path}/` : path,
            kind,
          });
          if (fallbackMatches.length >= MAX_FALLBACK_MENTION_CANDIDATES) {
            return;
          }
        }

        if (entry.isDirectory()) {
          await visit(resolve(absoluteDirectory, entry.name), path);
          if (fallbackMatches.length >= MAX_FALLBACK_MENTION_CANDIDATES) {
            return;
          }
        }
      }
    };

    await visit(CURRENT_DIRECTORY, "");

    return fallbackMatches.sort((left, right) =>
      left.path.localeCompare(right.path),
    );
  } catch {
    return [];
  }
};

type FileMentionMenuProps = {
  candidates: MentionCandidate[];
  selectedIndex: number;
  scrollRef: RefObject<ScrollBoxRenderable | null>;
  onSelect: (index: number) => void;
  onExecute: (index: number) => void;
};

const FileMentionMenu = ({
  candidates,
  selectedIndex,
  scrollRef,
  onSelect,
  onExecute,
}: FileMentionMenuProps) => {
  const { colors } = useTheme();
  const visibleHeight = Math.min(candidates.length, MAX_VISIBLE_MENTIONS);

  if (candidates.length === 0) {
    return (
      <box paddingX={1}>
        <text attributes={TextAttributes.DIM}>
          No matching files or folders
        </text>
      </box>
    );
  }

  return (
    <scrollbox ref={scrollRef} height={visibleHeight}>
      {candidates.map((candidate, index) => {
        const isSelected = index === selectedIndex;
        return (
          <box
            key={candidate.path}
            flexDirection="row"
            paddingX={1}
            height={1}
            overflow="hidden"
            backgroundColor={isSelected ? colors.selection : undefined}
            onMouseMove={() => onSelect(index)}
            onMouseDown={() => onExecute(index)}
          >
            <box flexGrow={1} flexShrink={1} overflow="hidden">
              <text selectable={false} fg={isSelected ? "black" : "white"}>
                {candidate.path}
              </text>
            </box>

            <box width={8} alignItems="flex-end" flexShrink={0}>
              <text selectable={false} fg={isSelected ? "black" : "gray"}>
                {candidate.kind === "directory" ? "Folder" : "File"}
              </text>
            </box>
          </box>
        );
      })}
    </scrollbox>
  );
};

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  sessionId?: string;
  getMessages?: () => Message[];
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "enter", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "enter", shift: true, action: "newline" },
];

export const InputBar = ({
  onSubmit,
  disabled,
  sessionId,
  getMessages,
}: Props) => {
  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => {});
  const activeMentionRef = useRef<MentionMatch | null>(null);
  const mentionScrollRef = useRef<ScrollBoxRenderable>(null);
  const recordingProcessRef = useRef<ReturnType<typeof Bun.spawn> | null>(null);

  const renderer = useRenderer();
  const navigate = useNavigate();
  const toast = useToast();
  const dialog = useDialog();
  const { isTopLayer, push, pop, setResponder } = useKeyboardLayer();
  const { colors, getModeColor } = useTheme();
  const { mode, setMode, toggleMode, setModel } = usePromptConfig();

  const [activeMention, setActiveMention] = useState<MentionMatch | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<
    MentionCandidate[]
  >([]);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const {
    commandQuery,
    showCommandMenu,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  } = useCommandMenu({ sessionId });

  const showMentionMenu = activeMention !== null;

  const closeMentionMenu = useCallback(() => {
    activeMentionRef.current = null;
    setActiveMention(null);
    setMentionCandidates([]);
    pop("mention");
  }, [pop]);

  const syncMentionMenu = useCallback(
    (text: string, cursorOffset: number) => {
      const nextMention = findActiveMention(text, cursorOffset);
      const previousMention = activeMentionRef.current;
      const mentionChanged =
        previousMention?.start !== nextMention?.start ||
        previousMention?.end !== nextMention?.end ||
        previousMention?.query !== nextMention?.query;

      if (!nextMention) {
        if (previousMention) {
          closeMentionMenu();
        }
        return;
      }

      activeMentionRef.current = nextMention;
      setActiveMention(nextMention);
      push("mention", () => {
        closeMentionMenu();
        return true;
      });

      if (mentionChanged) {
        setMentionSelectedIndex(0);
        mentionScrollRef.current?.scrollTo(0);
      }
    },
    [closeMentionMenu, push],
  );

  const startRecording = async () => {
    const cmd = getRecordingCommand();
    try {
      recordingProcessRef.current = Bun.spawn(cmd, {
        stdout: "ignore",
        stderr: "ignore",
      });
      setIsRecording(true);
      toast.show({ message: "Recording... press ctrl+r to stop" });
    } catch {
      toast.show({
        variant: "error",
        message: "Could not start recording. Is arecord/sox installed?",
      });
    }
  };

  const stopRecordingAndTranscribe = async () => {
    setIsRecording(false);
    recordingProcessRef.current?.kill();
    recordingProcessRef.current = null;

    try {
      const apiKey = env.DEEPGRAM_API_KEY;

      if (!apiKey) {
        toast.show({
          variant: "error",
          message: "DEEPGRAM_API_KEY environment variable not set",
        });
        return;
      }

      // Send to Deepgram
      const audioData = await Bun.file(VOICE_TMP_PATH).arrayBuffer();
      const res = await fetch(
        "https://api.deepgram.com/v1/listen?model=nova-2",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "audio/wav",
          },
          body: audioData,
          signal: AbortSignal.timeout(30000), // 30s timeout
        },
      );
      const data = (await res.json()) as {
        results: { channels: [{ alternatives: [{ transcript: string }] }] };
      };
      const transcript =
        data.results.channels[0]?.alternatives[0]?.transcript ?? "";

      if (transcript.trim() && textareaRef.current) {
        textareaRef.current.insertText(transcript);
      }
    } catch (err) {
      toast.show({ variant: "error", message: "Voice transcription failed" });
    }
  };

  const handleTextAreaContentChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.plainText;

    handleContentChange(textarea.plainText);
    syncMentionMenu(text, textarea.cursorOffset);
  }, [handleContentChange, syncMentionMenu]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.plainText.trim();
    if (text.length === 0) return;

    onSubmit(text);
    textarea.setText("");
  }, [disabled, onSubmit]);

  const handleMentionExecute = useCallback(
    (index: number) => {
      const textarea = textareaRef.current;
      const mention = activeMentionRef.current;
      const candidate = mentionCandidates[index];

      if (!textarea || !mention || !candidate) return;

      const insertion =
        candidate.kind === "directory" ? candidate.path : `${candidate.path} `;

      const text = textarea.plainText;
      const nextText = `${text.slice(0, mention.start)}@${insertion}${text.slice(mention.end)}`;

      textarea.replaceText(nextText);
      textarea.cursorOffset = mention.start + insertion.length + 1;
      syncMentionMenu(nextText, textarea.cursorOffset);
    },
    [mentionCandidates, syncMentionMenu],
  );

  const handleTextAreaCursorChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.plainText;

    syncMentionMenu(text, textarea.cursorOffset);
  }, [syncMentionMenu]);

  const handleCommand = useCallback(
    (command: Command | undefined) => {
      const textarea = textareaRef.current;
      if (!textarea || !command) return;

      textarea.setText("");

      if (command.action) {
        command.action({
          exit: () => renderer.destroy(),
          toast,
          dialog,
          navigate,
          mode,
          setMode,
          setModel,
          sessionId,
          getMessages,
        });
      } else {
        textarea.insertText(command.value + " ");
      }
    },
    [
      renderer,
      toast,
      dialog,
      navigate,
      mode,
      setMode,
      setModel,
      sessionId,
      getMessages,
    ],
  );

  const handleCommandExecute = useCallback(
    (index: number) => {
      const command = resolveCommand(index);
      handleCommand(command);
    },
    [resolveCommand, handleCommand],
  );

  useEffect(() => {
    checkRecordingSupport().then(setRecordingSupported);
  }, []);

  // Keep the file picker in sync with the current @mention token
  useEffect(() => {
    if (!activeMention) {
      setMentionCandidates([]);
      return;
    }

    let ignore = false;
    const loadCandidates = async () => {
      const nextCandidates = await getMentionCandidate(activeMention.query);
      if (ignore) return;

      setMentionCandidates(nextCandidates);
      setMentionSelectedIndex((currentIndex) => {
        if (nextCandidates.length === 0) {
          return 0;
        }
        return Math.min(currentIndex, nextCandidates.length - 1);
      });
    };

    const handle = setTimeout(() => {
      void loadCandidates();
    }, 120);

    return () => {
      ignore = true;
      clearTimeout(handle);
    };
  }, [activeMention]);

  // Wire up the textarea submit handler once so it always reads the latest state.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.onSubmit = () => {
      onSubmitRef.current();
    };
  }, []);

  onSubmitRef.current = () => {
    if (disabled) return;

    if (showCommandMenu) {
      const command = resolveCommand(selectedIndex);
      handleCommand(command);
      return;
    }

    if (showMentionMenu) {
      const candidate = mentionCandidates[mentionSelectedIndex];
      if (candidate) {
        handleMentionExecute(mentionSelectedIndex);
        return;
      }
    }

    handleSubmit();
  };

  useKeyboard((key) => {
    if (disabled) return;
    if (!isTopLayer("base")) return;

    const isCtrlOrCmd = key.ctrl || key.meta;

    // Ctrl/Cmd+V — paste from clipboard into textarea
    if (isCtrlOrCmd && key.name === "v") {
      key.preventDefault();
      readFromClipboard()
        .then((text) => {
          if (text && textareaRef.current) {
            textareaRef.current.insertText(text);
          }
        })
        .catch(() => {
          // Silently fail — clipboard may be empty or unavailable
        });
      return;
    }

    if (isCtrlOrCmd && key.name === "l") {
      key.preventDefault();
      renderer.console.toggle();
      return;
    }

    // Ctrl/Cmd+Shift+C — copy full textarea content to clipboard
    // When no selection exists, intercept and copy full content.
    // When a selection exists we can't detect it via TextareaRenderable,
    // so we always copy full content and show a toast on success.
    if (isCtrlOrCmd && (key.name === "C" || (key.shift && key.name === "c"))) {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const text = textarea.plainText.trim();
      if (!text) return;

      // If the renderer has an active selection, don't intercept —
      // let opentui handle copying the selected text natively
      if (renderer.hasSelection) return;

      key.preventDefault();
      copyToClipboard(text)
        .then(() => {
          toast.show({ variant: "success", message: "Copied" });
        })
        .catch(() => {});
      return;
    }

    if (key.name === "tab") {
      key.preventDefault();
      toggleMode();
    }
  });

  useKeyboard((key) => {
    if (disabled) return;
    if (!isTopLayer("base")) return;

    if ((key.ctrl || key.meta) && key.name === "r") {
      key.preventDefault();
      if (isRecording) {
        void stopRecordingAndTranscribe();
      } else {
        void startRecording();
      }
    }
  });

  // Register the base layer responder for Ctrl+c dismissal
  useEffect(() => {
    setResponder("base", () => {
      if (disabled) return false;

      const textarea = textareaRef.current;
      if (textarea && textarea.plainText.length > 0) {
        textarea.setText("");
        return true;
      }
      return false;
    });

    return () => setResponder("base", null);
  }, [disabled, setResponder]);

  useKeyboard((key) => {
    if (disabled) return;
    if (!showMentionMenu || !isTopLayer("mention")) return;

    if (key.name === "escape") {
      key.preventDefault();
      closeMentionMenu();
    } else if (key.name === "up") {
      key.preventDefault();
      setMentionSelectedIndex((currentIndex) => {
        const nextIndex = Math.max(0, currentIndex - 1);
        const scrollbox = mentionScrollRef.current;
        if (scrollbox && nextIndex < scrollbox.scrollTop) {
          scrollbox.scrollTo(nextIndex);
        }
        return nextIndex;
      });
    } else if (key.name === "down") {
      key.preventDefault();
      setMentionSelectedIndex((currentIndex) => {
        if (mentionCandidates.length === 0) {
          return 0;
        }

        const nextIndex = Math.min(
          mentionCandidates.length - 1,
          currentIndex + 1,
        );
        const scrollbox = mentionScrollRef.current;

        if (scrollbox) {
          const viewportHeight = scrollbox.viewport.height;
          const visibleEnd = scrollbox.scrollTop + viewportHeight - 1;
          if (nextIndex > visibleEnd) {
            scrollbox.scrollTo(nextIndex - viewportHeight + 1);
          }
        }
        return nextIndex;
      });
    }
  });

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={getModeColor(mode)}
        customBorderChars={{
          ...EmptyBorder,
          vertical: "┃",
          bottomLeft: "╹",
        }}
        width="100%"
      >
        <box
          position="relative"
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width="100%"
          gap={1}
        >
          {showCommandMenu && (
            <box
              position="absolute"
              bottom="100%"
              left={0}
              width="100%"
              backgroundColor={colors.surface}
              zIndex={10}
            >
              <CommandMenu
                query={commandQuery}
                sessionId={sessionId}
                selectedIndex={selectedIndex}
                scrollRef={scrollRef}
                onSelect={setSelectedIndex}
                onExecute={handleCommandExecute}
              />
            </box>
          )}

          {!showCommandMenu && showMentionMenu && (
            <box
              position="absolute"
              bottom="100%"
              left={0}
              width="100%"
              backgroundColor={colors.surface}
              zIndex={10}
            >
              <FileMentionMenu
                candidates={mentionCandidates}
                selectedIndex={mentionSelectedIndex}
                scrollRef={mentionScrollRef}
                onSelect={setMentionSelectedIndex}
                onExecute={handleMentionExecute}
              />
            </box>
          )}

          <textarea
            ref={textareaRef}
            focused={
              !disabled &&
              (isTopLayer("base") ||
                isTopLayer("command") ||
                isTopLayer("mention"))
            }
            keyBindings={TEXTAREA_KEY_BINDINGS}
            onContentChange={handleTextAreaContentChange}
            onCursorChange={handleTextAreaCursorChange}
            placeholder={`Ask anything... "Fix a bug in the codebase"`}
          />
          <box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <StatusBar />
            <box flexDirection="row" gap={2} alignItems="center">
              {isRecording ? (
                <box flexDirection="row" gap={1} alignItems="center">
                  <text fg={colors.error}>⏺</text>
                  <text attributes={TextAttributes.DIM}>
                    recording... ctrl+r to stop
                  </text>
                </box>
              ) : (
                recordingSupported && (
                  <box flexDirection="row" gap={1} alignItems="center">
                    <text attributes={TextAttributes.DIM}>🎤</text>
                    <text attributes={TextAttributes.DIM}>ctrl+r</text>
                  </box>
                )
              )}
            </box>
          </box>
        </box>
      </box>
    </box>
  );
};
