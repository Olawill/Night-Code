import { zValidator } from "@hono/zod-validator";
import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
  type InferUITools,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import { Hono } from "hono";
import { z } from "zod";

import type { Prisma } from "@nightcode/database";
import { db } from "@nightcode/database/client";

import {
  getToolContracts,
  modeSchema,
  type ModeType,
  type ToolContracts,
} from "@nightcode/shared";
import { calculateCreditsForUsage } from "../lib/credits";
import { isSupportedChatModel, resolveChatModel } from "../lib/models";
import { ingestAIUsage } from "../lib/polar";
import type { AuthenticatedEnv } from "../middleware/require-auth";
import { requireCreditsBalance } from "../middleware/require-credits-balance";
import { buildSystemPrompt } from "../system-prompt";

type ChatMessageMetadata = {
  mode?: ModeType;
  model?: string;
  durationMs?: number;
  usage?: LanguageModelUsage;
  status?: "complete" | "interrupted";
};

type NightcodeUIMessage = UIMessage<
  ChatMessageMetadata,
  never,
  InferUITools<ToolContracts>
>;

// In-memory store for in-progress stream state
const activeStreams = new Map<
  string,
  {
    startTime: number;
    usage: LanguageModelUsage | null;
    messages: NightcodeUIMessage[];
    model: ReturnType<typeof resolveChatModel>;
    mode: ModeType;
  }
>();

const submitSchema = z.object({
  id: z.string(),
  messages: z
    .array(
      z.custom<NightcodeUIMessage>((value) => {
        return (
          value != null &&
          typeof value === "object" &&
          "id" in value &&
          "parts" in value
        );
      }),
    )
    .min(1),
  mode: modeSchema,
  model: z.string().refine(isSupportedChatModel, "Unsupported model"),
});

const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

const hasPendingToolCalls = (message: NightcodeUIMessage) => {
  return message.parts.some((part) => {
    if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
      const state = (part as { state?: string }).state;
      return state !== "output-available" && state !== "output-error";
    }
    return false;
  });
};

const app = new Hono<AuthenticatedEnv>()
  .post(
    "/interrupt/:sessionId",
    zValidator("param", z.object({ sessionId: z.string() })),
    async (c) => {
      const userId = c.get("userId");
      const { sessionId } = c.req.valid("param");

      const session = await db.session.findUnique({
        where: { id: sessionId, userId },
      });

      if (!session) return c.json({ error: "Session not found" }, 404);

      // Get the active stream state for usage + messages
      const stream = activeStreams.get(sessionId);

      const baseMessages =
        stream?.messages ??
        (Array.isArray(session.messages)
          ? (session.messages as unknown as NightcodeUIMessage[])
          : []);

      const usage = stream?.usage ?? null;
      const startTime = stream?.startTime ?? Date.now();
      const resolvedModel = stream?.model;
      const mode = stream?.mode;

      // Tag the last assistant message as interrupted
      const updatedMessages = baseMessages.map((m, i) =>
        i === baseMessages.length - 1 && m.role === "assistant"
          ? {
              ...m,
              metadata: {
                ...m.metadata,
                ...(mode ? { mode } : {}),
                ...(resolvedModel ? { model: resolvedModel.modelId } : {}),
                durationMs: Date.now() - startTime,
                status: "interrupted" as const,
                ...(usage ? { usage } : {}),
              },
            }
          : m,
      );

      await db.session.update({
        where: { id: sessionId, userId },
        data: {
          messages: updatedMessages as unknown as Prisma.InputJsonValue,
        },
      });

      // Bill for partial usage
      if (usage && resolvedModel) {
        try {
          const billableUsage = calculateCreditsForUsage({
            provider: resolvedModel.provider,
            model: resolvedModel.modelId,
            usage,
          });

          await ingestAIUsage({
            externalCustomerId: userId,
            eventId: `chat-interrupt:${sessionId}:${Date.now()}`,
            credits: billableUsage.credits,
          });
        } catch (error) {
          console.error("Failed to ingest usage for interrupted message", {
            error,
            sessionId,
            userId,
          });
        }
      }

      // Clean up active stream
      activeStreams.delete(sessionId);

      return c.json({ ok: true });
    },
  )
  .post("/", requireCreditsBalance, submitValidator, async (c) => {
    const userId = c.get("userId");
    const { id, messages, mode, model } = c.req.valid("json");

    const session = await db.session.findUnique({
      where: { id, userId },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const startTime = Date.now();
    const tools = getToolContracts(mode);
    const resolvedModel = resolveChatModel(model);
    const previousMessages = Array.isArray(session.messages)
      ? (session.messages as unknown as NightcodeUIMessage[])
      : [];

    const mergedMessages = [...previousMessages];

    for (const message of messages) {
      const incomingMessage = {
        ...message,
        metadata: { ...message.metadata, mode, model },
      } satisfies NightcodeUIMessage;

      const existingMessageIndex = mergedMessages.findIndex(
        (m) => m.id === incomingMessage.id,
      );

      if (existingMessageIndex === -1) {
        mergedMessages.push(incomingMessage);
      } else {
        mergedMessages[existingMessageIndex] = incomingMessage;
      }
    }

    const nextMessages = await validateUIMessages<NightcodeUIMessage>({
      messages: mergedMessages,
      tools,
    });

    const modelMessages = await convertToModelMessages(nextMessages, { tools });
    let completedUsage: LanguageModelUsage | null = null;

    // Register stream as active
    activeStreams.set(id, {
      startTime,
      usage: null,
      messages: nextMessages,
      model: resolvedModel,
      mode,
    });

    // Track partial assistant response as it streams
    let partialText = "";
    let partialAssistantMessageId = crypto.randomUUID();

    const result = streamText({
      model: resolvedModel.model,
      system: buildSystemPrompt({ mode }),
      messages: modelMessages,
      tools,
      providerOptions: resolvedModel.providerOptions,
      onChunk({ chunk }) {
        if (chunk.type === "text-delta") {
          partialText += chunk.text;
          // Update active stream with latest partial messages
          const stream = activeStreams.get(id);
          if (stream) {
            stream.messages = [
              ...nextMessages,
              {
                id: partialAssistantMessageId,
                role: "assistant",
                content: partialText,
                parts: [{ type: "text", text: partialText }],
                metadata: {
                  mode,
                  model,
                },
              } as unknown as NightcodeUIMessage,
            ];
          }
        }
      },
      onFinish: (event) => {
        completedUsage = event.totalUsage;
        const stream = activeStreams.get(id);
        if (stream) {
          stream.usage = completedUsage;
          // Replace partial with the fully resolved messages from the SDK
          stream.messages = [
            ...nextMessages,
            ...event.response.messages,
          ] as NightcodeUIMessage[];
        }
      },
    });

    return result.toUIMessageStreamResponse<NightcodeUIMessage>({
      originalMessages: nextMessages,
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return { mode, model };
        }

        if (part.type !== "finish") return undefined;

        return {
          mode,
          model,
          durationMs: Date.now() - startTime,
          status: "complete" as const,
          ...(completedUsage ? { usage: completedUsage } : {}),
        };
      },
      async onFinish(event) {
        // Always clean up active stream
        activeStreams.delete(id);

        if (event.isAborted) return;

        if (hasPendingToolCalls(event.responseMessage)) return;

        await db.session.update({
          where: { id, userId },
          data: {
            messages: event.messages as unknown as Prisma.InputJsonValue,
          },
        });

        if (!completedUsage) return;

        try {
          const billableUsage = calculateCreditsForUsage({
            provider: resolvedModel.provider,
            model: resolvedModel.modelId,
            usage: completedUsage,
          });

          await ingestAIUsage({
            externalCustomerId: userId,
            eventId: `chat-message:${event.responseMessage.id}`,
            credits: billableUsage.credits,
          });
        } catch (error) {
          console.error("Failed to ingest Polar AI usage for chat message", {
            error,
            sessionId: id,
            messageId: event.responseMessage.id,
            userId,
          });
        }
      },
      onError(error) {
        activeStreams.delete(id);
        return error instanceof Error ? error.message : String(error);
      },
    });
  });

export default app;
