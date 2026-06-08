import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export const findProjectRoot = (startDir = process.cwd()): string => {
  let current = startDir;

  while (true) {
    // Check for common project root markers
    const markers = [
      "package.json",
      ".git",
      "bun.lockb",
      "pnpm-lock.yaml",
      "yarn.lock",
      "package-lock.json",
    ];

    for (const marker of markers) {
      if (existsSync(join(current, marker))) {
        return current;
      }
    }

    const parent = dirname(current);
    // Reached filesystem root
    if (parent === current) return startDir;
    current = parent;
  }
};
