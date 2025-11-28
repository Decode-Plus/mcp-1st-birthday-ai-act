/**
 * EU AI Act Compliance Agent
 * Vercel AI SDK v5 implementation with MCP tools
 * 
 * Uses the AI SDK MCP client to connect to the EU AI Act MCP server
 * and retrieve tools dynamically.
 * 
 * Environment Variable:
 * - AI_MODEL: "gpt-5" | "grok-4-1" | "claude-4.5" (default: "gpt-5")
 * 
 * Supported Models:
 * - gpt-5: OpenAI GPT-5 (requires OPENAI_API_KEY)
 * - grok-4-1: xAI Grok 4.1 Fast Reasoning (requires XAI_API_KEY)
 * - claude-4.5: Anthropic Claude Sonnet 4.5 (requires ANTHROPIC_API_KEY)
 */

import { xai } from "@ai-sdk/xai";
import { generateText, streamText } from "ai";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SYSTEM_PROMPT } from "./prompts.js";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the built MCP server
const MCP_SERVER_PATH = resolve(__dirname, "../../../../packages/eu-ai-act-mcp/dist/index.js");

/**
 * Get the AI model based on AI_MODEL environment variable
 * Supports: "gpt-5" (OpenAI), "grok-4-1" (xAI), or "claude-4.5" (Anthropic)
 */
function getModel() {
  const modelEnv = process.env.AI_MODEL || "gpt-5";
  
  console.log(`[Agent] Using AI model: ${modelEnv}`);
  
  if (modelEnv === "grok-4-1") {
    if (!process.env.XAI_API_KEY) {
      throw new Error("XAI_API_KEY environment variable is required when using grok-4-1");
    }
    return xai("grok-4-1-fast-reasoning");
  }
  
  if (modelEnv === "claude-4.5") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required when using claude-4.5");
    }
    return anthropic("claude-sonnet-4-5-20250514");
  }
  
  // Default to GPT-5
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required when using gpt-5");
  }
  return openai("gpt-5");
}

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
  const model = getModel();
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

        // Output tool results with detailed information
        if (result.steps) {
          for (const step of result.steps) {
            if (step.toolResults && step.toolResults.length > 0) {
              for (const toolResult of step.toolResults) {
                console.log(`\n📋 Tool Result: ${toolResult.toolName}`);
                console.log("─".repeat(50));
                
                try {
                  const parsed = typeof toolResult.result === 'string' 
                    ? JSON.parse(toolResult.result) 
                    : toolResult.result;
                  
                  // Handle assess_compliance results specially to show documentation
                  if (toolResult.toolName === 'assess_compliance' && parsed) {
                    if (parsed.assessment) {
                      console.log(`📊 Compliance Score: ${parsed.assessment.overallScore}/100`);
                      console.log(`⚠️  Risk Level: ${parsed.assessment.riskLevel}`);
                      console.log(`🔍 Gaps Found: ${parsed.assessment.gaps?.length || 0}`);
                      console.log(`💡 Recommendations: ${parsed.assessment.recommendations?.length || 0}`);
                    }
                    
                    // Show documentation templates
                    if (parsed.documentation) {
                      console.log(`\n📄 Documentation Templates Generated:`);
                      const docs = parsed.documentation;
                      if (docs.riskManagementTemplate) console.log("   ✓ Risk Management System (Article 9)");
                      if (docs.technicalDocumentation) console.log("   ✓ Technical Documentation (Article 11)");
                      if (docs.conformityAssessment) console.log("   ✓ Conformity Assessment (Article 43)");
                      if (docs.transparencyNotice) console.log("   ✓ Transparency Notice (Article 50)");
                      if (docs.qualityManagementSystem) console.log("   ✓ Quality Management System (Article 17)");
                      if (docs.humanOversightProcedure) console.log("   ✓ Human Oversight Procedure (Article 14)");
                      if (docs.dataGovernancePolicy) console.log("   ✓ Data Governance Policy (Article 10)");
                      if (docs.incidentReportingProcedure) console.log("   ✓ Incident Reporting Procedure");
                    }
                    
                    if (parsed.metadata) {
                      console.log(`\n🤖 Model Used: ${parsed.metadata.modelUsed}`);
                    }
                  } else if (toolResult.toolName === 'discover_ai_services' && parsed) {
                    if (parsed.riskSummary) {
                      console.log(`🤖 Total Systems: ${parsed.riskSummary.totalCount}`);
                      console.log(`   High-Risk: ${parsed.riskSummary.highRiskCount}`);
                      console.log(`   Limited-Risk: ${parsed.riskSummary.limitedRiskCount}`);
                      console.log(`   Minimal-Risk: ${parsed.riskSummary.minimalRiskCount}`);
                    }
                  } else if (toolResult.toolName === 'discover_organization' && parsed) {
                    if (parsed.organization) {
                      console.log(`🏢 Organization: ${parsed.organization.name}`);
                      console.log(`📍 Sector: ${parsed.organization.sector}`);
                      console.log(`🌍 EU Presence: ${parsed.organization.euPresence}`);
                    }
                  }
                } catch {
                  // If not JSON, just show raw result summary
                  const resultStr = String(toolResult.result);
                  console.log(`Result: ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
                }
                
                console.log("─".repeat(50));
              }
            }
          }
        }

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
          console.log(`\n[Agent] Step finished:`, {
            stepType: step.stepType,
            toolCalls: step.toolCalls?.map(t => t.toolName) || [],
            hasText: !!step.text,
          });
          
          // Output tool results with detailed information
          if (step.toolResults && step.toolResults.length > 0) {
            for (const toolResult of step.toolResults) {
              console.log(`\n📋 Tool Result: ${toolResult.toolName}`);
              console.log("─".repeat(50));
              
              try {
                const result = typeof toolResult.result === 'string' 
                  ? JSON.parse(toolResult.result) 
                  : toolResult.result;
                
                // Handle assess_compliance results specially to show documentation
                if (toolResult.toolName === 'assess_compliance' && result) {
                  if (result.assessment) {
                    console.log(`📊 Compliance Score: ${result.assessment.overallScore}/100`);
                    console.log(`⚠️  Risk Level: ${result.assessment.riskLevel}`);
                    console.log(`🔍 Gaps Found: ${result.assessment.gaps?.length || 0}`);
                    console.log(`💡 Recommendations: ${result.assessment.recommendations?.length || 0}`);
                  }
                  
                  // Show documentation templates
                  if (result.documentation) {
                    console.log(`\n📄 Documentation Templates Generated:`);
                    const docs = result.documentation;
                    if (docs.riskManagementTemplate) console.log("   ✓ Risk Management System (Article 9)");
                    if (docs.technicalDocumentation) console.log("   ✓ Technical Documentation (Article 11)");
                    if (docs.conformityAssessment) console.log("   ✓ Conformity Assessment (Article 43)");
                    if (docs.transparencyNotice) console.log("   ✓ Transparency Notice (Article 50)");
                    if (docs.qualityManagementSystem) console.log("   ✓ Quality Management System (Article 17)");
                    if (docs.humanOversightProcedure) console.log("   ✓ Human Oversight Procedure (Article 14)");
                    if (docs.dataGovernancePolicy) console.log("   ✓ Data Governance Policy (Article 10)");
                    if (docs.incidentReportingProcedure) console.log("   ✓ Incident Reporting Procedure");
                  }
                  
                  if (result.metadata) {
                    console.log(`\n🤖 Model Used: ${result.metadata.modelUsed}`);
                  }
                } else if (toolResult.toolName === 'discover_ai_services' && result) {
                  // Show AI systems discovery summary
                  if (result.riskSummary) {
                    console.log(`🤖 Total Systems: ${result.riskSummary.totalCount}`);
                    console.log(`   High-Risk: ${result.riskSummary.highRiskCount}`);
                    console.log(`   Limited-Risk: ${result.riskSummary.limitedRiskCount}`);
                    console.log(`   Minimal-Risk: ${result.riskSummary.minimalRiskCount}`);
                  }
                } else if (toolResult.toolName === 'discover_organization' && result) {
                  // Show organization discovery summary
                  if (result.organization) {
                    console.log(`🏢 Organization: ${result.organization.name}`);
                    console.log(`📍 Sector: ${result.organization.sector}`);
                    console.log(`🌍 EU Presence: ${result.organization.euPresence}`);
                  }
                }
              } catch {
                // If not JSON, just show raw result summary
                const resultStr = String(toolResult.result);
                console.log(`Result: ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
              }
              
              console.log("─".repeat(50));
            }
          }
        },
        onFinish: async () => {
          console.log("\n[Agent] Stream finished, closing MCP client");
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
