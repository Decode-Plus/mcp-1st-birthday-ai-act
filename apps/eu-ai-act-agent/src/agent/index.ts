/**
 * EU AI Act Compliance Agent
 * Vercel AI SDK v5 implementation with MCP tools
 */

import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import { discoverOrganizationTool, discoverAIServicesTool, assessComplianceTool } from "./tools.js";
import { SYSTEM_PROMPT } from "./prompts.js";

/**
 * Create EU AI Act compliance agent
 */
export function createAgent() {
  const model = openai("gpt-5-chat-latest");

  const tools = {
    discover_organization: discoverOrganizationTool,
    discover_ai_services: discoverAIServicesTool,
    assess_compliance: assessComplianceTool,
  };

  return {
    /**
     * Generate a single response
     */
    async generateText(params: { messages: any[] }) {
      return generateText({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...params.messages,
        ],
        tools,
        maxSteps: 5, // Allow multi-step tool use
      });
    },

    /**
     * Stream a response
     */
    async streamText(params: { messages: any[] }) {
      return streamText({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...params.messages,
        ],
        tools,
        maxSteps: 5,
      });
    },

    /**
     * Get available tools
     */
    getTools() {
      return Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        parameters: tool.parameters,
      }));
    },
  };
}

