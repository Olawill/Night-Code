import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "path";
import { z } from "zod";

import {
  getToolContracts,
  toolInputSchemas,
  type ModeType,
} from "@nightcode/shared";

const MAX_FILE_SIZE = 10_000;
const MAX_RESULTS = 200;
const MAX_MATCHES = 50;
const MAX_OUTPUT = 20_000;
const DEFAULT_TIMEOUT = 30_000;

type ToolSchemas = typeof toolInputSchemas;

type ToolName = keyof ToolSchemas;

export const toolNameSchema = z.enum(
  Object.keys(toolInputSchemas) as [ToolName, ...ToolName[]],
);

const resolveInsideCwd = (path: string) => {
  const cwd = process.cwd();
  const resolved = resolve(cwd, path);
  const rel = relative(cwd, resolved);

  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Path is outside the project directory");
  }

  return { cwd, resolved };
};

const truncate = (value: string, limit: number) => {
  return value.length > limit
    ? `${value.slice(0, limit)}\n... (truncated, ${value.length} total chars)`
    : value;
};

export const executeLocalTool = async (
  toolName: ToolName,
  input: unknown,
  mode: ModeType,
) => {
  const availableTools = getToolContracts(mode);

  if (!(toolName in availableTools)) {
    throw new Error(`Tool ${toolName} is not available in ${mode} mode`);
  }

  switch (toolName) {
    case "readFile": {
      const { path } = toolInputSchemas.readFile.parse(input);
      const { resolved } = resolveInsideCwd(path);
      const content = await readFile(resolved, "utf-8");
      return content.length > MAX_FILE_SIZE
        ? {
            content: content.slice(0, MAX_FILE_SIZE),
            truncated: true,
            totalLength: content.length,
          }
        : { content };
    }
    case "listDirectory": {
      const { path } = toolInputSchemas.listDirectory.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path);
      const entries = await readdir(resolved);
      const results: { name: string; type: "file" | "directory" }[] = [];

      for (const entry of entries) {
        // Skip hidden files and common large directories
        if (entry.startsWith(".") || entry === "node_modules") continue;

        try {
          const entryPath = join(resolved, entry);
          const info = await stat(entryPath);
          results.push({
            name: entry,
            type: info.isDirectory() ? "directory" : "file",
          });
        } catch {
          // Skip entries we can't stat
        }
      }

      results.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return {
        path: relative(cwd, resolved) || ".",
        entries: results,
      };
    }

    case "glob": {
      const { pattern, path } = toolInputSchemas.glob.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path);
      const glob = new Bun.Glob(pattern);
      const files: string[] = [];
      let truncated = false;

      for await (const match of glob.scan({
        cwd: resolved,
        dot: false,
        onlyFiles: true,
      })) {
        // Skip node_modules matches
        if (match.includes("node_modules")) continue;

        if (files.length >= MAX_RESULTS) {
          truncated = true;
          break;
        }

        // Return paths relative to project root
        const absoluteMatch = resolve(resolved, match);
        files.push(relative(cwd, absoluteMatch));
      }

      files.sort();

      return {
        files,
        ...(truncated ? { truncated: true } : {}),
      };
    }
    case "grep": {
      const { pattern, path, include } = toolInputSchemas.grep.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path);
      const args = [
        "-rn",
        "--color=never",
        "--exclude-dir=node_modules",
        "--exclude-dir=.git",
        "-E",
      ];

      if (include) {
        args.push(`--include=${include}`);
      }

      args.push(pattern, resolved);

      const proc = Bun.spawn(["grep", ...args], {
        stdout: "pipe",
        stderr: "pipe",
        cwd,
      });

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;

      // grep exits with 1 when no matches found - not an error
      if (exitCode !== 0 && exitCode !== 1) {
        throw new Error(`grep failed: ${stderr.trim()}`);
      }

      if (!stdout.trim()) {
        return { matches: [], message: "No matches found" };
      }

      const lines = stdout.trim().split("\n");
      const matches: { file: string; line: number; content: string }[] = [];
      let truncated = false;

      for (const line of lines) {
        if (matches.length >= MAX_MATCHES) {
          truncated = true;
          break;
        }

        // grep output format: /absolute/path:linenum:content
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          matches.push({
            file: relative(cwd, match[1]!),
            line: Number(match[2]),
            content: match[3]!,
          });
        }
      }

      return {
        matches,
        ...(truncated ? { truncated: true, totalMatches: lines.length } : {}),
      };
    }
    case "bash": {
      const {
        command,
        description,
        timeout = DEFAULT_TIMEOUT,
      } = toolInputSchemas.bash.parse(input);

      const proc = Bun.spawn(["bash", "-c", command], {
        cwd: resolveInsideCwd(".").resolved,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, TERM: "dumb" },
      });

      const timer = setTimeout(() => {
        proc.kill();
      }, timeout);

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;
      clearTimeout(timer);

      return {
        stdout: truncate(stdout, MAX_OUTPUT),
        stderr: truncate(stderr, MAX_OUTPUT),
        exitCode,
      };
    }
    case "writeFile": {
      const { content, path } = toolInputSchemas.writeFile.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path);

      await mkdir(dirname(resolved), { recursive: true });
      await writeFile(resolved, content, "utf-8");

      return {
        success: true as const,
        path: relative(cwd, resolved),
        bytesWritten: Buffer.byteLength(content, "utf-8"),
      };
    }
    case "editFile": {
      const { oldString, newString, path } =
        toolInputSchemas.editFile.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path);

      const content = await readFile(resolved, "utf-8");

      const occurrences = content.split(oldString).length - 1;

      if (occurrences === 0) {
        throw new Error("oldString not found in file");
      }

      if (occurrences > 1) {
        throw new Error(`oldString is ambiguous; found ${occurrences} matches`);
      }

      const updated = content.replace(oldString, newString);

      await writeFile(resolved, updated, "utf-8");

      return {
        success: true as const,
        path: relative(cwd, resolved),
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
