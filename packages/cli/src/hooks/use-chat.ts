import { useChat as useAIChat } from "@ai-sdk/react";
import {
  type InferUITools,
  type LanguageModelUsage,
  type UIMessage,
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useMemo } from "react";

import {
  type ModeType,
  type SupportedChatModelId,
  type ToolContracts,
} from "@nightcode/shared";
import { apiClient } from "../lib/api-client";
import { getAuth } from "../lib/auth";
import { executeLocalTool, toolNameSchema } from "../lib/local-tools";

export type ChatMessageMetadata = {
  mode?: ModeType;
  model?: SupportedChatModelId | string;
  durationMs?: number;
  usage?: LanguageModelUsage;
  status?: "complete" | "interrupted";
};

type ChatTools = {
  [Name in keyof InferUITools<ToolContracts>]: {
    input: InferUITools<ToolContracts>[Name]["input"];
    output: unknown;
  };
};

export type Message = UIMessage<ChatMessageMetadata, never, ChatTools>;

export const useChat = (sessionId: string, initialMessages: Message[]) => {
  const transport = useMemo(() => {
    return new DefaultChatTransport<Message>({
      api: apiClient.chat.$url().toString(),
      headers() {
        const auth = getAuth();
        return auth ? { Authorization: `Bearer ${auth.token}` } : new Headers();
      },
      prepareSendMessagesRequest({ messages }) {
        const message = messages[messages.length - 1];
        if (!message) throw new Error("No message to send");

        const metadata = messages.findLast(
          (m) => m.metadata?.mode && m.metadata.model,
        )?.metadata;
        const previousMessage = messages[messages.length - 2];
        const requestMessages =
          message.role === "assistant" && previousMessage?.role === "user"
            ? [previousMessage, message]
            : [message];

        return {
          body: {
            id: sessionId,
            messages: requestMessages,
            mode: message.metadata?.mode ?? metadata?.mode,
            model: message.metadata?.model ?? metadata?.model,
          },
        };
      },
    });
  }, [sessionId]);

  const chat = useAIChat<Message>({
    id: sessionId,
    messages: initialMessages,
    transport,
    onToolCall({ toolCall }) {
      const mode = chat.messages.at(-1)?.metadata?.mode ?? "BUILD";

      const parsedToolName = toolNameSchema.parse(toolCall.toolName);

      void executeLocalTool(parsedToolName, toolCall.input, mode)
        .then((output) =>
          chat.addToolOutput({
            tool: toolCall.toolName as keyof ChatTools,
            toolCallId: toolCall.toolCallId,
            output,
          }),
        )
        .catch((error) =>
          chat.addToolOutput({
            tool: toolCall.toolName as keyof ChatTools,
            toolCallId: toolCall.toolCallId,
            state: "output-error",
            errorText: error instanceof Error ? error.message : String(error),
          }),
        );
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    submit: (params: {
      userText: string;
      mode: ModeType;
      model: SupportedChatModelId;
    }) => {
      return chat.sendMessage({
        text: params.userText,
        metadata: {
          mode: params.mode,
          model: params.model,
        },
      });
    },
    abort: chat.stop,
    interrupt: async () => {
      // Optimistically update client message status
      const lastMsg = chat.messages.at(-1);
      if (lastMsg?.role === "assistant") {
        chat.setMessages(
          chat.messages.map((m) =>
            m.id === lastMsg.id
              ? {
                  ...m,
                  metadata: {
                    ...m.metadata,
                    status: "interrupted" as const,
                  },
                }
              : m,
          ),
        );
      }

      // Stop the stream immediately — don't wait for the server call
      chat.stop();

      // Persist + bill in the background
      try {
        await apiClient.chat.interrupt[":sessionId"].$post({
          param: { sessionId },
        });
      } catch {
        // Best effort
      }
    },
  };
};
