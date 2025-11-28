/**
 * EU AI Act Compliance Agent
 * Vercel AI SDK v5 implementation with MCP tools
 * 
 * Uses the AI SDK MCP client to connect to the EU AI Act MCP server
 * and retrieve tools dynamically.
 */

import { xai } from "@ai-sdk/xai";
import { generateText, streamText } from "ai";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SYSTEM_PROMPT } from "./prompts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the built MCP server
const MCP_SERVER_PATH = resolve(__dirname, "../../../../packages/eu-ai-act-mcp/dist/index.js");

/**
 * Create MCP client and retrieve tools
 */
async function createMCPClientWithTools() {
  const transport = new StdioMCPTransport({
    command: "node",
    args: [MCP_SERVER_PATH],
  });

  const client = await createMCPClient({ transport });
  const tools = await client.tools();

  return { client, tools };
}

/**
 * Create EU AI Act compliance agent
 */
export function createAgent() {
  const model = xai("grok-4-1-fast-reasoning");
  
  return {
    /**
     * Generate a single response
     */
    async generateText(params: { messages: any[] }) {
      const { client, tools } = await createMCPClientWithTools();

      try {
        const result = await generateText({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...params.messages,
          ],
          // MCP tools are compatible at runtime but have different TypeScript types
          tools: tools as any,
          maxSteps: 10,
        });

        return result;
      } finally {
        await client.close();
      }
    },

    /**
     * Stream a response with MCP tools
     */
    async streamText(params: { messages: any[] }) {
      const { client, tools } = await createMCPClientWithTools();

      const result = streamText({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...params.messages,
        ],
        // MCP tools are compatible at runtime but have different TypeScript types
        tools: tools as any,
        // Increase maxSteps to ensure all 3 tools + final response
        maxSteps: 15,
        // Log each step for debugging
        onStepFinish: async (step) => {
          console.log(`[Agent] Step finished:`, {
            stepType: step.stepType,
            toolCalls: step.toolCalls?.map(t => t.toolName) || [],
            hasText: !!step.text,
          });
        },
        onFinish: async () => {
          console.log("[Agent] Stream finished, closing MCP client");
          await client.close();
        },
        onError: async (error) => {
          console.error("[Agent] Stream error:", error);
          await client.close();
        },
      });

      return result;
    },

    /**
     * Get available tools from MCP server
     */
    async getTools() {
      const { client, tools } = await createMCPClientWithTools();
      const toolList = Object.entries(tools).map(([name, t]) => ({
        name,
        description: (t as any).description || "No description",
      }));
      await client.close();
      return toolList;
    },
  };
}
