/**
 * Shared AI Model Utility
 * 
 * Get the AI model based on AI_MODEL environment variable
 * Supports: "gpt-oss" (Modal FREE), "gpt-5" (OpenAI), "grok-4-1" (xAI), 
 *           "claude-4.5" (Anthropic), "claude-opus" (Anthropic), "gemini-3" (Google)
 * 
 * Default: gpt-oss (FREE via Modal.com)
 */

import { xai } from "@ai-sdk/xai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

// Default GPT-OSS endpoint (FREE model hosted on Modal.com)
const DEFAULT_GPT_OSS_ENDPOINT = "https://vasilis--gpt-oss-vllm-inference-serve.modal.run";

/**
 * Get the AI model based on AI_MODEL environment variable or parameter
 * 
 * @param modelParam - Model passed from tool input (takes precedence over env var)
 * @param context - Optional context string for logging (e.g., "assess_compliance", "discover_ai_services")
 * @returns The configured AI model instance
 * 
 * Supported Models:
 * - gpt-oss: OpenAI GPT-OSS 20B via Modal.com (FREE - uses DEFAULT_GPT_OSS_ENDPOINT or MODAL_ENDPOINT_URL)
 * - claude-4.5: Anthropic Claude Sonnet 4.5 (requires ANTHROPIC_API_KEY)
 * - claude-opus: Anthropic Claude Opus 4 (requires ANTHROPIC_API_KEY)
 * - gpt-5: OpenAI GPT-5 (requires OPENAI_API_KEY)
 * - grok-4-1: xAI Grok 4.1 Fast Reasoning (requires XAI_API_KEY)
 * - gemini-3: Google Gemini 3 Pro (requires GOOGLE_GENERATIVE_AI_API_KEY)
 */
export function getModel(modelParam?: string, context?: string) {
  // Use model parameter if provided, otherwise fall back to env var
  const modelEnv = modelParam || process.env.AI_MODEL || "gpt-oss";  // Default to FREE GPT-OSS model!
  const logPrefix = context ? `[${context}]` : "[getModel]";
  
  console.error(`${logPrefix} Using AI model: ${modelEnv}${modelParam ? " (from parameter)" : " (from env)"}`);
  
  // GPT-OSS via Modal.com (FREE!)
  if (modelEnv === "gpt-oss") {
    // Get endpoint and strip trailing slashes to avoid double-slash URLs
    const rawEndpoint = process.env.MODAL_ENDPOINT_URL || DEFAULT_GPT_OSS_ENDPOINT;
    const modalEndpoint = rawEndpoint.replace(/\/+$/, "");  // Remove trailing slashes
    // Create OpenAI-compatible client pointing to Modal endpoint
    const modalClient = createOpenAI({
      baseURL: `${modalEndpoint}/v1`,
    });
    console.error(`${logPrefix} GPT-OSS endpoint: ${modalEndpoint}`);
    // IMPORTANT: Use .chat() to force Chat Completions API (/v1/chat/completions)
    // AI SDK 5+ defaults to Responses API (/v1/responses) which vLLM doesn't support
    return modalClient.chat("llm");  // Model name is "llm" on vLLM server
  }
  
  if (modelEnv === "gpt-5") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required when using gpt-5");
    }
    return openai("gpt-5");
  }
  
  if (modelEnv === "claude-4.5") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required when using claude-4.5");
    }
    return anthropic("claude-sonnet-4-5-20250514");
  }
  
  if (modelEnv === "claude-opus") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required when using claude-opus");
    }
    return anthropic("claude-opus-4-5");
  }
  
  if (modelEnv === "gemini-3") {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY environment variable is required when using gemini-3");
    }
    // Gemini 3 Pro with thinking enabled for better reasoning
    return google("gemini-3-pro-preview");
  }
  
  // Default to Grok-4-1
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY environment variable is required when using grok-4-1");
  }
  return xai("grok-4-1-fast-reasoning");
}

