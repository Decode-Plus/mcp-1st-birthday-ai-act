/**
 * Shared AI Model Utility
 * 
 * Get the AI model based on model selection and API keys from Gradio UI.
 * 
 * PRODUCTION: API keys MUST be provided by users via Gradio UI.
 *             No environment variable fallback!
 * 
 * LOCAL DEV:  Can use env vars for convenience (OPENAI_API_KEY, etc.)
 * 
 * Supports: "gpt-oss" (Modal FREE), "gpt-5" (OpenAI), "grok-4-1" (xAI), 
 *           "claude-4.5" (Anthropic), "claude-opus" (Anthropic), "gemini-3" (Google)
 * 
 * Default: gpt-oss (FREE via Modal.com - no API key required!)
 */

import { createXai } from "@ai-sdk/xai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Default GPT-OSS endpoint (FREE model hosted on Modal.com)
const DEFAULT_GPT_OSS_ENDPOINT = "https://vasilis--gpt-oss-vllm-inference-serve.modal.run";

/**
 * API Keys object - passed from Gradio UI via request headers
 */
export interface ApiKeys {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleApiKey?: string;
  xaiApiKey?: string;
  modalEndpointUrl?: string;
}

/**
 * Get API keys from either direct parameter or environment variables (LOCAL ONLY)
 * 
 * In PRODUCTION: Only use apiKeys parameter (from Gradio UI)
 * In LOCAL (development): Fall back to environment variables
 */
function resolveApiKeys(apiKeys?: ApiKeys): ApiKeys {
  const isProduction = process.env.NODE_ENV === "production";
  
  // In production, ONLY use API keys from Gradio UI (apiKeys parameter)
  // In local dev, allow env var fallback for convenience
  if (isProduction) {
    return {
      openaiApiKey: apiKeys?.openaiApiKey,
      anthropicApiKey: apiKeys?.anthropicApiKey,
      googleApiKey: apiKeys?.googleApiKey,
      xaiApiKey: apiKeys?.xaiApiKey,
      modalEndpointUrl: apiKeys?.modalEndpointUrl || DEFAULT_GPT_OSS_ENDPOINT,
    };
  }
  
  // LOCAL development: allow env var fallback
  return {
    openaiApiKey: apiKeys?.openaiApiKey || process.env.OPENAI_API_KEY,
    anthropicApiKey: apiKeys?.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    googleApiKey: apiKeys?.googleApiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    xaiApiKey: apiKeys?.xaiApiKey || process.env.XAI_API_KEY,
    modalEndpointUrl: apiKeys?.modalEndpointUrl || process.env.MODAL_ENDPOINT_URL || DEFAULT_GPT_OSS_ENDPOINT,
  };
}

/**
 * Get the AI model based on model selection and user-provided API keys
 * 
 * @param modelName - Model to use (default: "gpt-oss", or read from AI_MODEL env)
 * @param apiKeys - API keys provided by user via Gradio UI (optional, falls back to env vars)
 * @param context - Optional context string for logging
 * @returns The configured AI model instance
 * 
 * Supported Models:
 * - gpt-oss: OpenAI GPT-OSS 20B via Modal.com (FREE - no API key needed!)
 * - claude-4.5: Anthropic Claude Sonnet 4.5 (requires anthropicApiKey)
 * - claude-opus: Anthropic Claude Opus 4 (requires anthropicApiKey)
 * - gpt-5: OpenAI GPT-5 (requires openaiApiKey)
 * - grok-4-1: xAI Grok 4.1 Fast Reasoning (requires xaiApiKey)
 * - gemini-3: Google Gemini 3 Pro (requires googleApiKey)
 */
export function getModel(modelName?: string, apiKeys?: ApiKeys, context?: string) {
  // Model name: parameter > env var > default to gpt-oss
  const model = modelName || process.env.AI_MODEL || "gpt-oss";
  // Resolve API keys: parameter > env vars
  const keys = resolveApiKeys(apiKeys);
  const logPrefix = context ? `[${context}]` : "[getModel]";
  
  console.error(`${logPrefix} Using AI model: ${model}`);
  
  // GPT-OSS via Modal.com (FREE! No API key required!)
  if (model === "gpt-oss") {
    // Get endpoint and strip trailing slashes to avoid double-slash URLs
    const modalEndpoint = (keys.modalEndpointUrl || DEFAULT_GPT_OSS_ENDPOINT).replace(/\/+$/, "");
    // Create OpenAI-compatible client pointing to Modal endpoint
    // Pass a dummy apiKey because @ai-sdk/openai validates it exists,
    // even though Modal's public endpoint doesn't actually need authentication
    const modalClient = createOpenAI({
      baseURL: `${modalEndpoint}/v1`,
      apiKey: "not-needed-for-modal",  // Modal endpoint is public, but SDK requires a value
    });
    console.error(`${logPrefix} GPT-OSS endpoint: ${modalEndpoint}`);
    // Use .chat() to force Chat Completions API (/v1/chat/completions)
    return modalClient.chat("llm");  // Model name is "llm" on vLLM server
  }
  
  if (model === "gpt-5") {
    if (!keys.openaiApiKey) {
      throw new Error("OpenAI API key is required for GPT-5. Please enter your API key in the Model Settings panel.");
    }
    const client = createOpenAI({ apiKey: keys.openaiApiKey });
    return client("gpt-5");
  }
  
  if (model === "claude-4.5") {
    if (!keys.anthropicApiKey) {
      throw new Error("Anthropic API key is required for Claude 4.5. Please enter your API key in the Model Settings panel.");
    }
    const client = createAnthropic({ apiKey: keys.anthropicApiKey });
    return client("claude-sonnet-4-5");
  }
  
  if (model === "claude-opus") {
    if (!keys.anthropicApiKey) {
      throw new Error("Anthropic API key is required for Claude Opus. Please enter your API key in the Model Settings panel.");
    }
    const client = createAnthropic({ apiKey: keys.anthropicApiKey });
    return client("claude-opus-4-5");
  }
  
  if (model === "gemini-3") {
    if (!keys.googleApiKey) {
      throw new Error("Google API key is required for Gemini 3. Please enter your API key in the Model Settings panel.");
    }
    const client = createGoogleGenerativeAI({ apiKey: keys.googleApiKey });
    return client("gemini-3-pro-preview");
  }
  
  // Default to Grok-4-1
  if (!keys.xaiApiKey) {
    throw new Error("xAI API key is required for Grok 4.1. Please enter your API key in the Model Settings panel.");
  }
  const client = createXai({ apiKey: keys.xaiApiKey });
  return client("grok-4-1-fast-reasoning");
}

