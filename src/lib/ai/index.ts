import type { AIProvider, EmbeddingProvider } from "./types";
import { GeminiProvider } from "./gemini-provider";
import { OpenRouterChatProvider } from "./openrouter-chat-provider";
import { OpenRouterEmbeddingProvider } from "./openrouter-embedding-provider";

// Model ID → provider routing
// Gemini models use direct Gemini API (free tier), others use OpenRouter
const MODEL_CONFIG: Record<string, { provider: "gemini" | "openrouter"; model: string }> = {
  // Direct Gemini API (zero-cost)
  "gemini-2.5-flash":  { provider: "gemini", model: "gemini-2.5-flash" },

  // OpenRouter (free tier models)
  "deepseek-v3.2":     { provider: "openrouter", model: "deepseek/deepseek-v3.2" },
  "step-3.5-flash":    { provider: "openrouter", model: "stepfun/step-3.5-flash:free" },
  "trinity-large":     { provider: "openrouter", model: "arcee-ai/trinity-large-preview:free" },
  "nemotron-3":        { provider: "openrouter", model: "nvidia/nemotron-3-nano-30b-a3b:free" },
};

export const DEFAULT_MODEL = "gemini-2.5-flash";

// Cache providers to avoid re-creating them for the same model
const providerCache = new Map<string, AIProvider>();
let embeddingProvider: EmbeddingProvider | null = null;

export function getAIProvider(modelId?: string): AIProvider {
  const id = modelId && modelId in MODEL_CONFIG ? modelId : DEFAULT_MODEL;

  if (providerCache.has(id)) {
    return providerCache.get(id)!;
  }

  const config = MODEL_CONFIG[id];
  let provider: AIProvider;

  if (config.provider === "gemini") {
    provider = new GeminiProvider(config.model);
  } else {
    provider = new OpenRouterChatProvider(config.model);
  }

  providerCache.set(id, provider);
  return provider;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    // Use Gemini embeddings (gemini-embedding-001 @ 768 dims) — better Bangla support
    embeddingProvider = new GeminiProvider();
  }
  return embeddingProvider;
}
