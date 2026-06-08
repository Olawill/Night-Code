import { tool } from "ai";
import { z } from "zod";

export const Mode = {
  BUILD: "BUILD",
  PLAN: "PLAN",
  REVIEW: "REVIEW",
  TEST: "TEST",
  DOC: "DOC",
} as const;

export const modeSchema = z.enum(Object.values(Mode));

export type ModeType = (typeof Mode)[keyof typeof Mode];

export const toolInputSchemas = {
  readFile: z.object({
    path: z.string().describe("Relative path to the file to read"),
  }),
  listDirectory: z.object({
    path: z
      .string()
      .describe(
        "Relative path to the directory to list (defaults to project root)",
      )
      .default("."),
  }),
  glob: z.object({
    pattern: z
      .string()
      .describe("Glob pattern to match (e.g. '**/*.ts', 'src/**/*.ts')"),
    path: z
      .string()
      .describe("Relative directory to search in (defaults to project root)")
      .default("."),
  }),
  grep: z.object({
    pattern: z.string().describe("Regex pattern to search for"),
    path: z
      .string()
      .describe("Relative directory to search in (defaults to project root)")
      .default("."),
    include: z
      .string()
      .describe("Optional Glob pattern to filter files (e.g. '*.ts', '*.tsx'")
      .optional(),
  }),
  writeFile: z.object({
    path: z.string().describe("Relative path to the file to write"),
    content: z.string().describe("The full content to write to the file"),
  }),
  editFile: z.object({
    path: z.string().describe("Relative path to the file to edit"),
    oldString: z
      .string()
      .describe(
        "The exact text to find and replace (must be unique in the file)",
      ),
    newString: z.string().describe("The text to replace it with"),
  }),
  bash: z.object({
    command: z.string().describe("The shell command to execute"),
    description: z
      .string()
      .optional()
      .describe("Short description of the command"),
    timeout: z.number().optional().describe("Timeout in milliseconds"),
  }),
} as const;

export const readOnlyToolContracts = {
  readFile: tool({
    description: "Read a file from the current project directory.",
    inputSchema: toolInputSchemas.readFile,
  }),
  listDirectory: tool({
    description:
      "List entries in a directory under the current project directory.",
    inputSchema: toolInputSchemas.listDirectory,
  }),
  grep: tool({
    description:
      "Search file contents with a regular expression under the current project directory.",
    inputSchema: toolInputSchemas.grep,
  }),
  glob: tool({
    description:
      "Find files matching a glob pattern under the current the project directory.",
    inputSchema: toolInputSchemas.glob,
  }),
} as const;

export const docToolContracts = {
  ...readOnlyToolContracts,
  writeFile: tool({
    description:
      "Create or overwrite a file under the current project directory.",
    inputSchema: toolInputSchemas.writeFile,
  }),
  editFile: tool({
    description:
      "Replace exact text in a file under the current project directory.",
    inputSchema: toolInputSchemas.editFile,
  }),
} as const;

export const buildToolContracts = {
  ...docToolContracts,
  bash: tool({
    description: "Run a shell command in the current project directory.",
    inputSchema: toolInputSchemas.bash,
  }),
} as const;

export type ToolContracts = typeof buildToolContracts;

export const getToolContracts = (mode: ModeType) => {
  if (mode === Mode.PLAN || mode === Mode.REVIEW) return readOnlyToolContracts;
  if (mode === Mode.BUILD || mode === Mode.TEST) return buildToolContracts;

  return docToolContracts;
};
