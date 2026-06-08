import { writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { join } from "node:path";

import { mkdir } from "node:fs/promises";
import type { Message } from "../hooks/use-chat";
import { findProjectRoot } from "./project-root";

const formatPart = (part: Message["parts"][number]): string => {
  if (part.type === "text") return part.text;
  if (part.type === "reasoning")
    return `> Thinking:\n> ${part.text.split("\n").join("\n> ")}`;
  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    const toolName =
      part.type === "dynamic-tool"
        ? (part as any).toolName
        : part.type.slice("tool-".length);
    const input =
      "input" in part && part.input ? JSON.stringify(part.input, null, 2) : "";
    const output =
      "output" in part && part.output
        ? JSON.stringify(part.output, null, 2)
        : "";
    return [
      `[Tool: ${toolName}]`,
      input ? `Input:\n${input}` : "",
      output ? `Output:\n${output}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

export const formatMessagesAsMarkdown = (messages: Message[]): string => {
  return messages
    .map((msg) => {
      const content = msg.parts.map(formatPart).filter(Boolean).join("\n\n");

      if (!content.trim()) return null;

      if (msg.role === "user") {
        return `## You\n\n${content}`;
      }

      const meta = [
        msg.metadata?.mode,
        msg.metadata?.model,
        msg.metadata?.status === "interrupted" ? "interrupted" : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return `## Assistant${meta ? ` _(${meta})_` : ""}\n\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
};

export const formatMessagesAsText = (messages: Message[]): string => {
  return messages
    .map((msg) => {
      const content = msg.parts.map(formatPart).filter(Boolean).join("\n\n");

      if (!content.trim()) return null;

      const role = msg.role === "user" ? "You" : "Assistant";
      return `[${role}]\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n────────────────────────────────────────\n\n");
};

export const copyToClipboard = async (text: string): Promise<void> => {
  const os = platform();

  // Windows
  if (os === "win32") {
    const proc = Bun.spawn(
      ["powershell", "-NoProfile", "-Command", "Set-Clipboard -Value $input"],
      { stdin: "pipe", stdout: "ignore", stderr: "ignore" },
    );
    proc.stdin.write(text);
    proc.stdin.end();
    await proc.exited;
    if (proc.exitCode === 0) return;
    throw new Error("Failed to copy to clipboard on Windows");
  }

  // macOS
  if (os === "darwin") {
    const proc = Bun.spawn(["pbcopy"], {
      stdin: "pipe",
      stdout: "ignore",
      stderr: "ignore",
    });
    proc.stdin.write(text);
    proc.stdin.end();
    await proc.exited;
    if (proc.exitCode === 0) return;
    throw new Error("Failed to copy to clipboard on macOS");
  }

  // Linux — try in order of preference
  const linuxCommands: [string, ...string[]][] = [
    ["wl-copy"], // Wayland
    ["xclip", "-selection", "clipboard"], // X11 xclip
    ["xsel", "--clipboard", "--input"], // X11 xsel
  ];

  for (const [cmd, ...args] of linuxCommands) {
    try {
      const proc = Bun.spawn([cmd, ...args], {
        stdin: "pipe",
        stdout: "ignore",
        stderr: "ignore",
      });

      await proc.exited;
      if (proc.exitCode === 0) return;
    } catch {
      continue;
    }
  }

  throw new Error(
    "No clipboard utility found. Install wl-copy (Wayland) or xclip/xsel (X11).",
  );
};

export const readFromClipboard = async (): Promise<string> => {
  const os = platform();

  if (os === "win32") {
    const proc = Bun.spawn(
      ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
      { stdout: "pipe", stderr: "ignore" },
    );
    const text = await new Response(proc.stdout).text();
    return text.trimEnd();
  }

  if (os === "darwin") {
    const proc = Bun.spawn(["pbpaste"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const text = await new Response(proc.stdout).text();
    return text;
  }

  // Linux
  const linuxCommands: [string, ...string[]][] = [
    ["wl-paste", "--no-newline"], // Wayland
    ["xclip", "-selection", "clipboard", "-o"], // X11 xclip
    ["xsel", "--clipboard", "--output"], // X11 xsel
  ];

  for (const [cmd, ...args] of linuxCommands) {
    try {
      const proc = Bun.spawn([cmd, ...args], {
        stdout: "pipe",
        stderr: "ignore",
      });
      await proc.exited;
      if (proc.exitCode === 0) {
        return await new Response(proc.stdout).text();
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    "No clipboard utility found. Install wl-paste (Wayland) or xclip/xsel (X11).",
  );
};

export const saveToFile = async (
  text: string,
  sessionId: string,
  filename?: string,
): Promise<string> => {
  const projectRoot = findProjectRoot();
  const exportsDir = join(projectRoot, "exports");

  await mkdir(exportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const resolvedFilename =
    filename ??
    `session-${sessionId.slice(0, 8)}-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19)}.md`;

  const filepath = join(exportsDir, resolvedFilename);

  await writeFile(filepath, text, "utf-8");
  return filepath;
};
