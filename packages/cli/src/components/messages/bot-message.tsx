import { TextAttributes } from "@opentui/core";
import prettyMs from "pretty-ms";

import { type ModeType } from "@nightcode/shared";

import { useKeyboard } from "@opentui/react";
import { useState } from "react";
import type { Message } from "../../hooks/use-chat";
import { useTheme } from "../../providers/theme";
import { SplitBorder } from "../border";
import { MarkdownRenderer } from "../shared-markdown";

type ClientMessagePart = Message["parts"][number];
type ToolPart = Extract<
  ClientMessagePart,
  { type: `tool-${string}` | "dynamic-tool" }
>;

type Props = {
  parts: ClientMessagePart[];
  model: string;
  mode: ModeType;
  durationMs?: number;
  streaming?: boolean;
  interrupted?: boolean;
};

export const showSentenceCase = (val: unknown) => {
  const valStr = String(val);
  return valStr.at(0)?.toUpperCase() + valStr.slice(1).toLowerCase();
};

const formatToolName = (name: string) => {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
};

const isToolPart = (part: ClientMessagePart): part is ToolPart => {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
};

const formatToolArgs = (tc: ToolPart): string => {
  if (!("input" in tc) || tc.input == null) return "";
  if (typeof tc.input !== "object") return String(tc.input);
  return Object.values(tc.input).map(String).join(" ");
};

type PartGroup = {
  type: ClientMessagePart["type"];
  parts: ClientMessagePart[];
  key: string;
};

const groupConsecutiveParts = (parts: ClientMessagePart[]): PartGroup[] => {
  const groups: PartGroup[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.type === part.type) {
      lastGroup.parts.push(part);
    } else {
      const key = isToolPart(part)
        ? `group-tc-${part.toolCallId}`
        : `group-${part.type}-${i}`;
      groups.push({ type: part.type, parts: [part], key });
    }
  }
  return groups;
};

export const BotMessage = ({
  parts,
  model,
  mode,
  durationMs,
  streaming = false,
  interrupted = false,
}: Props) => {
  const { colors, getModeColor } = useTheme();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => {
      const initial = new Set<string>();
      parts.forEach((p) => {
        if (
          isToolPart(p) &&
          (p.state === "output-available" || p.state === "output-error")
        ) {
          initial.add(p.toolCallId);
        }
      });
      return initial;
    },
  );
  const [focusedSectionIndex, setFocusedSectionIndex] = useState<number>(0);

  // Collect all collapsible section keys in order
  const collapsibleKeys = parts
    .filter((p) => p.type === "reasoning" || isToolPart(p))
    .map((p) =>
      isToolPart(p) ? p.toolCallId : `reasoning-${parts.indexOf(p)}`,
    );

  useKeyboard((key) => {
    const isCtrlOrCmd = key.ctrl || key.meta;

    // Ctrl/Cmd+B — toggle ALL reasoning sections at once
    if (isCtrlOrCmd && key.name === "b") {
      key.preventDefault();
      const reasoningKeys = collapsibleKeys.filter((k) =>
        k.startsWith("reasoning-"),
      );
      if (reasoningKeys.length === 0) return;

      setCollapsedSections((prev) => {
        const next = new Set(prev);
        // If all are collapsed, expand all; otherwise collapse all
        const allCollapsed = reasoningKeys.every((k) => next.has(k));
        if (allCollapsed) {
          reasoningKeys.forEach((k) => next.delete(k));
        } else {
          reasoningKeys.forEach((k) => next.add(k));
        }
        return next;
      });
    }

    // Ctrl/Cmd+O — toggle ALL tool sections at once
    if (isCtrlOrCmd && key.name === "o") {
      key.preventDefault();
      const toolKeys = collapsibleKeys.filter(
        (k) => !k.startsWith("reasoning-"),
      );
      if (toolKeys.length === 0) return;

      setCollapsedSections((prev) => {
        const next = new Set(prev);
        // If all are collapsed, expand all; otherwise collapse all
        const allCollapsed = toolKeys.every((k) => next.has(k));
        if (allCollapsed) {
          toolKeys.forEach((k) => next.delete(k));
        } else {
          toolKeys.forEach((k) => next.add(k));
        }
        return next;
      });
    }
  });

  const renderCollapsible = (
    sectionKey: string,
    header: React.ReactNode,
    children: React.ReactNode,
    defaultCollapsed = false,
  ) => {
    const index = collapsibleKeys.indexOf(sectionKey);
    const isFocused = index === focusedSectionIndex;
    const isReasoning = sectionKey.startsWith("reasoning-");
    const shortcut = isReasoning ? "ctrl+b" : "ctrl+o";

    // Initialize collapsed state on first render
    const isCollapsed = collapsedSections.has(sectionKey) ?? defaultCollapsed;

    return (
      <box flexDirection="column" width="100%">
        <box
          flexDirection="row"
          gap={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <box flexDirection="row" gap={1} flexGrow={1}>
            <text attributes={TextAttributes.DIM}>
              {isCollapsed ? "▶" : "▼"}
            </text>
            {header}
          </box>
          {isFocused && collapsibleKeys.length > 0 && (
            <text attributes={TextAttributes.DIM}>{shortcut}</text>
          )}
        </box>
        {!isCollapsed && <box paddingTop={1}>{children}</box>}
      </box>
    );
  };

  return (
    <box width="100%" alignItems="center">
      {groupConsecutiveParts(parts).map((group, j) => (
        <box key={group.key} width="100%" paddingTop={j === 0 ? 0 : 1}>
          {group.parts.map((part, i) => {
            if (part.type === "reasoning") {
              const sectionKey = `reasoning-${parts.indexOf(part)}`;
              return (
                <box
                  key={`reasoning-${i}`}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  customBorderChars={{
                    ...SplitBorder.customBorderChars,
                  }}
                  width="100%"
                  paddingX={2}
                >
                  {renderCollapsible(
                    sectionKey,
                    <text attributes={TextAttributes.DIM}>
                      <em fg={colors.thinking}>Thinking:</em>{" "}
                    </text>,
                    <MarkdownRenderer content={part.text} mode={mode} />,
                    !streaming, // auto-collapse when done
                  )}
                </box>
              );
            }

            if (isToolPart(part)) {
              const toolName =
                part.type === "dynamic-tool"
                  ? part.toolName
                  : part.type.slice("tool-".length);

              const isDone =
                part.state === "output-available" ||
                part.state === "output-error";
              return (
                <box
                  key={part.toolCallId}
                  border={["left"]}
                  borderColor={colors.thinkingBorder}
                  customBorderChars={{
                    ...SplitBorder.customBorderChars,
                  }}
                  width="100%"
                  paddingX={2}
                >
                  {renderCollapsible(
                    part.toolCallId,
                    <box gap={1}>
                      <text attributes={TextAttributes.DIM}>
                        <em fg={colors.info}>{formatToolName(toolName)}:</em>
                        {formatToolArgs(part)}
                        {!isDone ? " ..." : ""}
                        {part.state === "output-error"
                          ? ` ${part.errorText}`
                          : ""}
                      </text>
                    </box>,
                    part.state === "output-available" ? (
                      <text attributes={TextAttributes.DIM}>
                        {typeof part.output === "string"
                          ? part.output
                          : JSON.stringify(part.output, null, 2)}
                      </text>
                    ) : null,
                    isDone, // auto-collapse when tool call completes
                  )}
                </box>
              );
            }

            if (part.type === "text") {
              return (
                <box key={`text-${i}`} paddingX={3} width="100%">
                  {/* <text>{part.text}</text> */}
                  <MarkdownRenderer content={part.text} mode={mode} />
                </box>
              );
            }

            return null;
          })}
        </box>
      ))}

      <box paddingX={3} paddingY={1} gap={1} width="100%">
        <box flexDirection="row" gap={2}>
          <text fg={getModeColor(mode)}>◉</text>

          <box flexDirection="row" gap={1}>
            <text>{showSentenceCase(mode)}</text>
            <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
              &raquo;
            </text>
            <text attributes={TextAttributes.DIM}>{model}</text>
            {!streaming && durationMs != null && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                  &raquo;
                </text>
                <text attributes={TextAttributes.DIM}>
                  {prettyMs(durationMs)}
                </text>
              </>
            )}

            {!streaming && interrupted && (
              <>
                <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
                  &raquo;
                </text>
                <text attributes={TextAttributes.DIM}>interrupted</text>
              </>
            )}
          </box>
        </box>
      </box>
    </box>
  );
};
