import * as Sentry from "@sentry/hono/bun";
import { sentry } from "@sentry/hono/bun";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { auth as betterAuth } from "./lib/auth";
import { requireAuth } from "./middleware/require-auth";
import auth from "./routes/auth";
import chat from "./routes/chat";
import sessions from "./routes/sessions";

const signInHtml = readFileSync(
  join(import.meta.dir, "./pages/sign-in.html"),
  "utf-8",
);
const consentHtml = readFileSync(
  join(import.meta.dir, "./pages/consent.html"),
  "utf-8",
);

const app = new Hono();

app.use(
  sentry(app, {
    dsn: "https://6e12e4a25b92c4784c3a0c57b61811f9@o4511474908528640.ingest.us.sentry.io/4511474919145473",
    tracesSampleRate: 1.0,
    enableLogs: true,
    sendDefaultPii: true,
  }),
);

app.get("/debug-sentry", () => {
  // Send a log before throwing the error
  Sentry.logger.info("User triggered test error", {
    action: "test_error_endpoint",
  });
  // Send a test metric before throwing the error
  Sentry.metrics.count("test_counter", 1);
  throw new Error("My first Sentry error!");
});

app.on(["POST", "GET"], "/api/auth/*", (c) => betterAuth.handler(c.req.raw));

// packages/server/src/index.ts
app.all("/.well-known/*", (c) => {
  return betterAuth.handler(c.req.raw);
});

app.get("/sign-in", (c) => c.html(signInHtml));

app.get("/consent", (c) => c.html(consentHtml));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    Sentry.logger.warn("Handled HTTP error", {
      status: error.status,
      message: error.message || "Request failed",
      path: c.req.path,
      method: c.req.method,
    });
    return c.json(
      {
        error: error.message || "Request failed",
      },
      error.status,
    );
  }

  Sentry.logger.error("Unhandled server error", {
    path: c.req.path,
    method: c.req.method,
    message: error instanceof Error ? error.message : "Unknown error",
  });

  return c.json({ error: "Internal server error" }, 500);
});

app.use("/sessions/*", requireAuth);
app.use("/chat/*", requireAuth);

const routes = app
  .route("/auth", auth)
  .route("/sessions", sessions)
  .route("/chat", chat);

export type AppType = typeof routes;

// IdleTimeout must be high, otherwise LLM tool calls might not complete
export default { port: 3000, fetch: app.fetch, idleTimeout: 255 };
