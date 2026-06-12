import { config } from "dotenv";
import path from "path";
import { z } from "zod";

config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
});

const envSchema = z.object({
  API_URL: z.url().min(1),
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  OLLAMA_API_KEY: z.string().min(1),
  CLERK_FRONTEND_API: z.string().min(1),
  CLERK_OAUTH_CLIENT_SECRET: z.string().min(1),
  CLERK_OAUTH_CLIENT_ID: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url().min(1),
  BETTER_AUTH_CLI_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  POLAR_ACCESS_TOKEN: z.string().min(1),
  POLAR_PRODUCT_ID: z.string().min(1),
  POLAR_SERVER: z.string().min(1),
  POLAR_CREDITS_METER_ID: z.string().min(1),
  DEEPGRAM_API_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid env: ${parsed.error.message}`);
}

export const env = parsed.data;
