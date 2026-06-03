import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type AuthData = {
  token: string;
};

const AUTH_DIR = join(homedir(), ".nightcode");
const AUTH_FILE = join(AUTH_DIR, "auth.json");

export const getAuth = (): AuthData | null => {
  try {
    const data = readFileSync(AUTH_FILE, "utf-8");
    const parsed = JSON.parse(data) as Partial<AuthData>;
    return typeof parsed.token === "string" ? { token: parsed.token } : null;
  } catch {
    return null;
  }
};

export const saveAuth = (data: AuthData) => {
  if (!existsSync(AUTH_DIR)) {
    // Owner only permissions (rwx------) so other users on the machine can't read tokens
    mkdirSync(AUTH_DIR, { mode: 0o700 });
  }
  writeFileSync(AUTH_FILE, JSON.stringify(data), { mode: 0o600 });
};

export const clearAuth = () => {
  try {
    unlinkSync(AUTH_FILE);
  } catch {
    // File doesn't exist
  }
};
