/**
 * EU AI Act Compliance Agent
 * Vercel AI SDK v5 implementation with MCP tools
 */

import { openai } from "@ai-sdk/openai";
import { generateText, streamText, tool } from "ai";
import { z } from "zod";
import { SYSTEM_PROMPT } from "./prompts.js";

/**
 * Create EU AI Act compliance agent
 */
export function createAgent() {
  const model = openai("gpt-5-chat-latest");

  // Define tools inline with proper schemas
  const tools = {
    discover_organization: tool({
      description: `Discover and profile a SPECIFIC organization for EU AI Act compliance.
ONLY use this tool when the user explicitly mentions an organization name and asks about their compliance.
DO NOT use for general EU AI Act questions.`,
      parameters: z.object({
        organizationName: z.string().describe("Name of the organization to discover"),
        domain: z.string().optional().describe("Organization's website domain (optional)"),
        context: z.string().optional().describe("Additional context (optional)"),
      }),
      execute: async ({ organizationName, domain, context }) => {
        // TODO: Integrate with MCP server
        return {
          organization: organizationName,
          domain: domain || "auto-discovered",
          context: context || "",
          status: "Discovery would be performed via MCP tools",
        };
      },
    }),

    discover_ai_services: tool({
      description: `Discover AI systems within a SPECIFIC organization.
ONLY use this tool after discover_organization has been called for a specific company.
DO NOT use for general questions.`,
      parameters: z.object({
        organizationName: z.string().describe("Organization name to discover AI services for"),
        scope: z.string().optional().describe("Scope: 'all', 'high-risk-only', 'production-only'"),
      }),
      execute: async ({ organizationName, scope }) => {
        return {
          organization: organizationName,
          scope: scope || "all",
          status: "AI services discovery would be performed via MCP tools",
        };
      },
    }),

    assess_compliance: tool({
      description: `Assess EU AI Act compliance for a SPECIFIC organization's AI systems.
ONLY use this tool when you have organization context and need to generate compliance reports.
DO NOT use for general EU AI Act questions.`,
      parameters: z.object({
        organizationName: z.string().describe("Organization name to assess"),
        focusAreas: z.array(z.string()).optional().describe("Specific areas to focus on"),
      }),
      execute: async ({ organizationName, focusAreas }) => {
        return {
          organization: organizationName,
          focusAreas: focusAreas || [],
          status: "Compliance assessment would be performed via MCP tools",
        };
      },
    }),
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
        maxSteps: 5,
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
      return Object.entries(tools).map(([name, t]) => ({
        name,
        description: t.description,
      }));
    },
  };
}

