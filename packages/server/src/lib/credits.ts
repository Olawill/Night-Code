import {
  findSupportedChatModel,
  SUPPORTED_CHAT_MODELS,
  type ModelPricing,
} from "@nightcode/shared";
import type { LanguageModelUsage } from "ai";

type CalculateCreditsForUsageParams = {
  provider: string;
  model: string;
  usage: LanguageModelUsage;
};

type BillableUsage = {
  credits: number;
};

type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
};

const TOKENS_PER_MILLION = 1_000_000;

const USD_PER_CREDIT = 0.01;

const getTokenCounts = (usage: LanguageModelUsage): TokenCounts => {
  const inputTokens = usage.inputTokens;
  const outputTokens = usage.outputTokens;

  if (
    inputTokens == null ||
    outputTokens == null ||
    !Number.isFinite(inputTokens) ||
    !Number.isFinite(outputTokens) ||
    !Number.isInteger(inputTokens) ||
    !Number.isInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    throw new Error(
      "Credits conversion requires input and output token counts",
    );
  }

  return {
    inputTokens,
    outputTokens,
  };
};

const getModelPricing = (provider: string, model: string): ModelPricing => {
  const supportedModel = findSupportedChatModel(model);

  if (!supportedModel || supportedModel.provider !== provider) {
    if (
      !SUPPORTED_CHAT_MODELS.some(
        (supportedModel) => supportedModel.provider === provider,
      )
    ) {
      throw new Error(`Unsupported billing provider: ${provider}`);
    }

    throw new Error(`Unsupported billing model: ${model}`);
  }

  return supportedModel.pricing;
};

const estimateCostUsd = (
  { inputTokens, outputTokens }: TokenCounts,
  pricing: ModelPricing,
) => {
  return (
    (inputTokens * pricing.inputUsdPerMillionTokens +
      outputTokens * pricing.outputUsdPerMillionTokens) /
    TOKENS_PER_MILLION
  );
};

const convertUsdToCredits = (estimatedCostUsd: number) => {
  if (estimatedCostUsd <= 0) {
    return 0;
  }

  // If a request cost any non-zero amount, charge at least 1 credit, then
  // round up so partial credits always become a whole credit.
  return Math.max(1, Math.ceil(estimatedCostUsd / USD_PER_CREDIT));
};

export const calculateCreditsForUsage = ({
  provider,
  model,
  usage,
}: CalculateCreditsForUsageParams): BillableUsage => {
  const tokenCounts = getTokenCounts(usage);
  const pricing = getModelPricing(provider, model);
  const estimatedCostUsd = estimateCostUsd(tokenCounts, pricing);
  const credits = convertUsdToCredits(estimatedCostUsd);

  return { credits };
};
