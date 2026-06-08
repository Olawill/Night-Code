import { useCallback, useRef, useState } from "react";

import { InputRenderable, TextAttributes } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import type { Message } from "../../hooks/use-chat";
import {
  copyToClipboard,
  formatMessagesAsMarkdown,
  formatMessagesAsText,
  saveToFile,
} from "../../lib/export-messages";
import { useDialog } from "../../providers/dialog";
import { useTheme } from "../../providers/theme";
import { useToast } from "../../providers/toast";
import { DialogSearchList } from "../dialog-search-list";

type ExportOption = {
  id: "markdown" | "text" | "clipboard";
  label: string;
  extension?: string;
};

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "markdown",
    label: "Export to markdown file",
    extension: ".md",
  },
  {
    id: "text",
    label: "Export to text file",
    extension: ".txt",
  },
  {
    id: "clipboard",
    label: "Copy to clipboard",
  },
];

// --- Filename input view ---

type FilenameInputProps = {
  defaultName: string;
  extension: string;
  onConfirm: (filename: string) => void;
  onCancel: () => void;
};

const FilenameInput = ({
  defaultName,
  extension,
  onConfirm,
  onCancel,
}: FilenameInputProps) => {
  const { colors } = useTheme();
  const [value, setValue] = useState(defaultName);
  const inputRef = useRef<InputRenderable>(null);

  useKeyboard((key) => {
    if (key.name === "return" || key.name === "enter") {
      key.preventDefault();
      const trimmed = value.trim();
      if (trimmed) onConfirm(trimmed);
    }
    if (key.name === "escape") {
      key.preventDefault();
      onCancel();
    }
  });

  return (
    <box flexDirection="column" gap={2} paddingX={1} paddingY={1}>
      <text attributes={TextAttributes.DIM}>
        Enter a filename — press enter to save, esc to go back
      </text>

      <box flexDirection="row" alignItems="center" gap={0}>
        <box
          flexGrow={1}
          backgroundColor={colors.surface}
          paddingX={1}
          borderStyle="rounded"
        >
          <input
            ref={inputRef}
            value={value}
            focused
            onChange={(val: string) => setValue(val)}
          />
        </box>
        <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
          {extension}
        </text>
      </box>

      <box flexDirection="row" gap={2}>
        <text attributes={TextAttributes.DIM}>enter</text>
        <text attributes={TextAttributes.DIM}>save</text>
        <text attributes={TextAttributes.DIM}>·</text>
        <text attributes={TextAttributes.DIM}>esc</text>
        <text attributes={TextAttributes.DIM}>back</text>
      </box>
    </box>
  );
};

// --- Main export dialog ---

type ExportDialogContentProps = {
  sessionId: string;
  getMessages: () => Message[];
};

export const ExportDialogContent = ({
  sessionId,
  getMessages,
}: ExportDialogContentProps) => {
  const dialog = useDialog();
  const toast = useToast();
  const [view, setView] = useState<"list" | "filename">("list");
  const [selectedOption, setSelectedOption] = useState<ExportOption | null>(
    null,
  );

  const defaultFilename = `session-${sessionId.slice(0, 8)}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19)}`;

  const handleSelect = useCallback(
    async (option: ExportOption) => {
      if (option.id === "clipboard") {
        const messages = getMessages();
        const formatted = formatMessagesAsMarkdown(messages);
        try {
          await copyToClipboard(formatted);
          toast.show({ variant: "success", message: "Copied to clipboard" });
        } catch (err) {
          toast.show({
            variant: "error",
            message: err instanceof Error ? err.message : "Copy failed",
          });
        }
        dialog.close();
        return;
      }

      // File export — show filename input
      setSelectedOption(option);
      setView("filename");
    },
    [getMessages, dialog, toast],
  );

  const handleConfirm = useCallback(
    async (filename: string) => {
      if (!selectedOption?.extension) return;

      const messages = getMessages();
      const formatted =
        selectedOption.id === "markdown"
          ? formatMessagesAsMarkdown(messages)
          : formatMessagesAsText(messages);

      try {
        const filepath = await saveToFile(
          formatted,
          sessionId,
          `${filename}${selectedOption.extension}`,
        );
        toast.show({ variant: "success", message: `Saved to ${filepath}` });
      } catch (err) {
        toast.show({
          variant: "error",
          message: err instanceof Error ? err.message : "Export failed",
        });
      }

      dialog.close();
    },
    [selectedOption, getMessages, sessionId, toast, dialog],
  );

  const handleBack = useCallback(() => {
    setView("list");
    setSelectedOption(null);
  }, []);

  if (view === "filename" && selectedOption?.extension) {
    return (
      <FilenameInput
        defaultName={defaultFilename}
        extension={selectedOption.extension}
        onConfirm={handleConfirm}
        onCancel={handleBack}
      />
    );
  }

  return (
    <DialogSearchList
      items={EXPORT_OPTIONS}
      onSelect={handleSelect}
      filterFn={(item, query) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(item, isSelected) => (
        <box flexDirection="row" gap={1}>
          <text selectable={false} fg={isSelected ? "black" : "white"}>
            {item.label}
          </text>
          {item.extension && (
            <text
              selectable={false}
              fg={isSelected ? "black" : "gray"}
              attributes={TextAttributes.DIM}
            >
              {item.extension}
            </text>
          )}
        </box>
      )}
      getKey={(item) => item.id}
      placeholder="Search export options"
      emptyText="No options found"
    />
  );
};
