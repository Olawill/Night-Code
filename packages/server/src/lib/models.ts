import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
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
};

const assertUnsupportedProvider = (provider: never): never => {
  throw new Error(`Unsupported provider: ${provider}`);
};

const resolveAnthropicModel = (modelId: AnthropicModelId): ResolvedModel => {
  return {
    model: anthropic(modelId),
    provider: "anthropic",
    modelId,
  };
};

const resolveOpenAIModel = (modelId: OpenAIModelId): ResolvedModel => {
  return {
    model: openai(modelId),
    provider: "openai",
    modelId,
  };
};

const resolveGoogleModel = (modelId: GoogleModelId): ResolvedModel => {
  return {
    model: google(modelId),
    provider: "google",
    modelId,
  };
};

const resolveOllamaModel = (modelId: OllamaModelId): ResolvedModel => {
  return {
    model: ollama(modelId),
    provider: "ollama",
    modelId,
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
