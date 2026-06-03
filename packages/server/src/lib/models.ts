import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";
import { ollama } from "ai-sdk-ollama";

import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider,
} from "@nightcode/shared";

// type OpenAIModelIds = Parameters<typeof openai>[0];
// type AnthropicModelIds = Parameters<typeof anthropic>[0];
// type GoogleModelIds = Parameters<typeof google>[0];
// type OllamaModelIds = Parameters<typeof ollama>[0];

type AnthropicModelId = Extract<
  SupportedChatModel,
  { provider: "anthropic" }
>["id"];
type OpenAIModelId = Extract<SupportedChatModel, { provider: "openai" }>["id"];
type GoogleModelId = Extract<SupportedChatModel, { provider: "google" }>["id"];
type OllamaModelId = Extract<SupportedChatModel, { provider: "ollama" }>["id"];

export type ResolvedModel = {
  model: LanguageModel;
  provider: SupportedProvider;
  modelId: SupportedChatModelId;
  providerOptions?: ProviderOptions;
};

const ANTHROPIC_PROVIDER_OPTIONS: Partial<
  Record<AnthropicModelId, ProviderOptions>
> = {
  "claude-opus-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: 10000,
      },
    },
  },
  "claude-sonnet-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: 10000,
      },
    },
  },
};

const OPENAI_PROVIDER_OPTIONS: Partial<Record<OpenAIModelId, ProviderOptions>> =
  {
    "gpt-5.4": {
      openai: {
        reasoningEffort: "medium",
      },
    },
    "gpt-5.4-mini": {
      openai: {
        reasoningEffort: "medium",
      },
    },
    "gpt-5.4-nano": {
      openai: {
        reasoningEffort: "medium",
      },
    },
  };

const GOOGLE_PROVIDER_OPTIONS: Partial<Record<GoogleModelId, ProviderOptions>> =
  {
    "gemini-2.5-flash": {
      google: {
        thinkingConfig: {
          thinkingBudget: 10000,
          includeThoughts: true,
        },
      },
    },
  };

const OLLAMA_PROVIDER_OPTIONS: Partial<Record<OllamaModelId, ProviderOptions>> =
  {
    "minimax-m2.7:cloud": {
      ollama: {
        headers: {
          think: "medium",
        },
      },
    },
    "minimax-m3:cloud": {
      ollama: {
        headers: {
          think: "medium",
        },
      },
    },
    "gemma4:31b-cloud": {
      ollama: {
        headers: {
          think: "medium",
        },
      },
    },
  };

const assertUnsupportedProvider = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

const resolveAnthropicModel = (modelId: AnthropicModelId): ResolvedModel => {
  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
    providerOptions: ANTHROPIC_PROVIDER_OPTIONS[modelId],
  };
};

const resolveOpenAIModel = (modelId: OpenAIModelId): ResolvedModel => {
  return {
    model: openai(modelId),
    provider: "openai",
    modelId,
    providerOptions: OPENAI_PROVIDER_OPTIONS[modelId],
  };
};

const resolveGoogleModel = (modelId: GoogleModelId): ResolvedModel => {
  return {
    model: google(modelId),
    provider: "google",
    modelId,
    providerOptions: GOOGLE_PROVIDER_OPTIONS[modelId],
  };
};

const resolveOllamaModel = (modelId: OllamaModelId): ResolvedModel => {
  return {
    model: ollama(modelId),
    provider: "ollama",
    modelId,
    providerOptions: OLLAMA_PROVIDER_OPTIONS[modelId],
  };
};

const resolveSupportedChatModel = (
  model: SupportedChatModel,
): ResolvedModel => {
  const provider = model.provider;

  switch (provider) {
    case "anthropic":
      return resolveAnthropicModel(model.id);

    case "openai":
      return resolveOpenAIModel(model.id);

    case "google":
      return resolveGoogleModel(model.id);

    case "ollama":
      return resolveOllamaModel(model.id);

    default:
      return assertUnsupportedProvider(provider);
  }
};

export const isSupportedChatModel = (
  modelId: string,
): modelId is SupportedChatModelId => {
  return findSupportedChatModel(modelId) != null;
};

export const resolveChatModel = (modelId: string): ResolvedModel => {
  const model = findSupportedChatModel(modelId);
  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  return resolveSupportedChatModel(model);
};
