/**
 * EU AI Act Compliance Agent
 * Vercel AI SDK v5 implementation with MCP tools
 * 
 * Uses the AI SDK MCP client to connect to the EU AI Act MCP server
 * and retrieve tools dynamically.
 * 
 * IMPORTANT: API keys are passed directly from Gradio UI via request headers.
 * NEVER read API keys from environment variables!
 * 
 * Supported Models:
 * - gpt-oss: OpenAI GPT-OSS 20B via Modal.com (FREE - no API key needed!) - DEFAULT
 * - claude-4.5: Anthropic Claude Sonnet 4.5 (user provides API key)
 * - claude-opus: Anthropic Claude Opus 4 (user provides API key)
 * - gpt-5: OpenAI GPT-5 (user provides API key)
 * - grok-4-1: xAI Grok 4.1 Fast Reasoning (user provides API key)
 * - gemini-3: Google Gemini 3 Pro (user provides API key)
 */

import { generateText, stepCountIs, streamText } from "ai";
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_GPT_OSS } from "./prompts.js";
import { getModel, type ApiKeys } from "@eu-ai-act/mcp-server";

// Re-export ApiKeys type for server.ts
export type { ApiKeys };

/**
 * Agent configuration passed from server
 */
export interface AgentConfig {
  modelName: string;
  apiKeys: ApiKeys;
  tavilyApiKey?: string;
}

/**
 * Get the appropriate system prompt based on the model
 * GPT-OSS uses a shorter prompt to fit within context limits
 */
function getSystemPrompt(modelName: string): string {
  if (modelName === "gpt-oss") {
    console.log("[Agent] Using shorter system prompt for GPT-OSS");
    return SYSTEM_PROMPT_GPT_OSS;
  }
  return SYSTEM_PROMPT;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get path to the MCP server
 * 
 * In production (Docker/HF Spaces): Use MCP_SERVER_PATH env var
 * In development (tsx watch): Calculate relative path from source
 * In local production (node dist/server.js): Calculate relative path from dist
 */
function getMCPServerPath(): string {
  // 1. Use environment variable if set (for Docker/production deployments)
  if (process.env.MCP_SERVER_PATH) {
    console.log(`[Agent] Using MCP_SERVER_PATH from env: ${process.env.MCP_SERVER_PATH}`);
    return process.env.MCP_SERVER_PATH;
  }
  
  // 2. Calculate relative path based on whether we're running from dist or src
  // - From src/agent/index.ts: need to go up 4 levels (agent -> src -> eu-ai-act-agent -> apps -> root)
  // - From dist/server.js: need to go up 3 levels (dist -> eu-ai-act-agent -> apps -> root)
  const isRunningFromDist = __dirname.includes('/dist') || __dirname.endsWith('/dist');
  const levelsUp = isRunningFromDist ? "../../../" : "../../../../";
  const relativePath = resolve(__dirname, levelsUp, "packages/eu-ai-act-mcp/dist/index.js");
  
  console.log(`[Agent] MCP server path (${isRunningFromDist ? 'dist' : 'src'}): ${relativePath}`);
  return relativePath;
}

// Path to the built MCP server
const MCP_SERVER_PATH = getMCPServerPath();

/**
 * HIGH-RISK KEYWORDS based on EU AI Act Annex III
 * Source: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689
 */
const HIGH_RISK_KEYWORDS = [
  // Annex III Point 8(a) - Administration of justice (LEGAL AI)
  "legal", "law", "lawyer", "attorney", "judicial", "justice", "court",
  "litigation", "contract", "compliance", "regulatory", "statute",
  "legal advice", "legal consulting", "legal assistant", "legal research",
  "dispute resolution", "arbitration", "mediation",
  // Annex III Point 4 - Employment
  "recruitment", "hiring", "hr", "human resources", "employee", "workforce",
  "resume", "cv", "candidate", "job application", "termination",
  // Annex III Point 5 - Essential services
  "credit", "scoring", "loan", "insurance", "financial risk",
  "creditworthiness", "emergency services",
  // Annex III Point 1 - Biometrics  
  "biometric", "facial recognition", "face recognition", "fingerprint",
  "identity verification", "remote identification",
  // Annex III Point 3 - Education
  "education", "student", "academic", "exam", "grading", "admission",
  // Annex III Point 6 - Law enforcement
  "law enforcement", "police", "crime", "profiling", "polygraph",
  // Annex III Point 2 - Critical infrastructure
  "critical infrastructure", "safety component", "water supply",
  "gas supply", "electricity", "transport",
  // Annex III Point 5(b) - Healthcare
  "healthcare", "medical", "diagnosis", "clinical", "patient", "health",
];

/**
 * Validate risk classification for a system based on EU AI Act Annex III
 * Ensures legal AI systems are correctly classified as HIGH RISK per Point 8(a)
 */
function validateSystemRiskClassification(system: any): any {
  if (!system) return system;
  
  const name = (system.system?.name || system.name || "").toLowerCase();
  const description = (system.system?.description || system.description || "").toLowerCase();
  const purpose = (system.system?.intendedPurpose || system.intendedPurpose || "").toLowerCase();
  const contextString = `${name} ${description} ${purpose}`;
  
  // Check for legal AI indicators (Annex III Point 8(a))
  const isLegalAI = contextString.includes("legal") || 
                    contextString.includes("law") ||
                    contextString.includes("lawyer") ||
                    contextString.includes("attorney") ||
                    contextString.includes("judicial") ||
                    contextString.includes("justice") ||
                    contextString.includes("court") ||
                    contextString.includes("litigation") ||
                    contextString.includes("contract review") ||
                    contextString.includes("compliance advi") ||
                    contextString.includes("regulatory advi");
  
  // Check for other high-risk keywords
  const matchedHighRiskKeywords = HIGH_RISK_KEYWORDS.filter(keyword => 
    contextString.includes(keyword.toLowerCase())
  );
  const hasHighRiskKeywords = matchedHighRiskKeywords.length > 0;
  
  const rc = system.riskClassification || {};
  let needsCorrection = false;
  
  if (isLegalAI && rc.category !== "High" && rc.category !== "Unacceptable") {
    console.log(`⚠️  [Agent Risk Validation] Legal AI detected - correcting "${rc.category}" to "High"`);
    console.log(`   System: ${name}`);
    console.log(`   Reason: Legal AI per EU AI Act Annex III Point 8(a) - Administration of justice`);
    rc.category = "High";
    rc.annexIIICategory = "Annex III, Point 8(a) - Administration of justice and democratic processes";
    rc.justification = "AI system providing legal assistance, consulting, or advice. Per EU AI Act Annex III Point 8(a), such systems are HIGH RISK.";
    rc.riskScore = Math.max(rc.riskScore || 0, 85);
    rc.conformityAssessmentRequired = true;
    rc.conformityAssessmentType = "Internal Control";
    needsCorrection = true;
  } else if (hasHighRiskKeywords && rc.category !== "High" && rc.category !== "Unacceptable") {
    console.log(`⚠️  [Agent Risk Validation] High-risk keywords detected - correcting "${rc.category}" to "High"`);
    console.log(`   System: ${name}`);
    console.log(`   Keywords: ${matchedHighRiskKeywords.slice(0, 3).join(", ")}`);
    rc.category = "High";
    rc.riskScore = Math.max(rc.riskScore || 0, 75);
    rc.conformityAssessmentRequired = true;
    rc.conformityAssessmentType = "Internal Control";
    needsCorrection = true;
  }
  
  if (needsCorrection) {
    return {
      ...system,
      riskClassification: rc,
    };
  }
  
  return system;
}

/**
 * Validate all systems in assess_compliance or discover_ai_services results
 */
function validateToolResult(toolName: string, result: any): any {
  if (!result) return result;
  
  if (toolName === "assess_compliance" || toolName === "discover_ai_services") {
    // Check if result has systems array
    if (result.systems && Array.isArray(result.systems)) {
      result.systems = result.systems.map((s: any) => validateSystemRiskClassification(s));
      
      // Recalculate risk summary
      if (result.riskSummary) {
        result.riskSummary = {
          ...result.riskSummary,
          highRiskCount: result.systems.filter((s: any) => s.riskClassification?.category === "High").length,
          limitedRiskCount: result.systems.filter((s: any) => s.riskClassification?.category === "Limited").length,
          minimalRiskCount: result.systems.filter((s: any) => s.riskClassification?.category === "Minimal").length,
          unacceptableRiskCount: result.systems.filter((s: any) => s.riskClassification?.category === "Unacceptable").length,
        };
      }
    }
    
    // Check assessment for gaps related to legal systems
    if (result.assessment?.gaps) {
      // Ensure legal AI systems have appropriate gaps flagged
    }
  }
  
  return result;
}

// getModel is now imported from @eu-ai-act/mcp-server

/**
 * Create MCP client and retrieve tools
 * Passes API keys to the MCP server for tool execution
 */
async function createMCPClientWithTools(apiKeys: ApiKeys, modelName: string, tavilyApiKey?: string) {
  // Pass API keys to MCP server child process via environment
  // MCP tools need these for Tavily research and AI model calls
  // IMPORTANT: These come from Gradio UI user input - NEVER from process.env!
  const env: Record<string, string> = {
    // Only pass MCP_SERVER_PATH and NODE_ENV, plus API keys
    NODE_ENV: process.env.NODE_ENV || "production",
  };
  
  // Pass MCP server path if set
  if (process.env.MCP_SERVER_PATH) {
    env.MCP_SERVER_PATH = process.env.MCP_SERVER_PATH;
  }
  
  // Pass model name from Gradio UI
  env.AI_MODEL = modelName;
  
  // Pass Tavily API key from Gradio UI if provided
  if (tavilyApiKey) {
    env.TAVILY_API_KEY = tavilyApiKey;
  }
  
  // Pass API keys from user (via Gradio UI) to MCP server
  // These are used by MCP tools for Tavily research and AI model calls
  if (apiKeys.openaiApiKey) env.OPENAI_API_KEY = apiKeys.openaiApiKey;
  if (apiKeys.anthropicApiKey) env.ANTHROPIC_API_KEY = apiKeys.anthropicApiKey;
  if (apiKeys.googleApiKey) env.GOOGLE_GENERATIVE_AI_API_KEY = apiKeys.googleApiKey;
  if (apiKeys.xaiApiKey) env.XAI_API_KEY = apiKeys.xaiApiKey;
  if (apiKeys.modalEndpointUrl) env.MODAL_ENDPOINT_URL = apiKeys.modalEndpointUrl;
  
  const transport = new StdioMCPTransport({
    command: "node",
    args: [MCP_SERVER_PATH],
    env,
  });

  const client = await createMCPClient({ transport });
  const tools = await client.tools();
  
  console.log(`[Agent] MCP client created`);

  return { client, tools };
}

/**
 * Create EU AI Act compliance agent
 * 
 * @param config - Agent configuration with model name and API keys from Gradio UI
 */
export function createAgent(config: AgentConfig) {
  const { modelName, apiKeys, tavilyApiKey } = config;
  
  // Log the model being used
  console.log(`[Agent] Creating agent with model: ${modelName}`);
  const model = getModel(modelName, apiKeys, "agent");
  console.log(`[Agent] Model instance created: ${model.constructor.name}`);
  return {
    /**
     * Generate a single response
     */
    async generateText(params: { messages: any[] }) {
      const { client, tools } = await createMCPClientWithTools(apiKeys, modelName, tavilyApiKey);

      try {
        const systemPrompt = getSystemPrompt(modelName);
        const result = await generateText({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...params.messages,
          ],
          // MCP tools are compatible at runtime but have different TypeScript types
          tools: tools as any,
          // stop when at least three tools runned and response is generated
          stopWhen: stepCountIs(3),
          // Reduce reasoning effort to prevent timeouts (LOW for speed)
          providerOptions: {
            anthropic: {
              thinking: { type: "enabled", budgetTokens: 2000 },  // Minimal thinking budget for Claude
            },
            openai: {
              reasoningEffort: "low",  // Low reasoning effort for GPT - faster responses
            },
            google: {
              thinkingConfig: {
                thinkingLevel: "low",  // Low thinking for faster responses
                includeThoughts: true,
              },
            },
          },
        });

        // Output tool results with detailed information
        if (result.steps) {
          for (const step of result.steps) {
            if (step.toolResults && step.toolResults.length > 0) {
              for (const toolResult of step.toolResults) {
                console.log(`\n📋 Tool Result: ${toolResult.toolName}`);
                console.log("─".repeat(50));
                
                try {
                  // Access result safely - TypedToolResult may have result in different property
                  const resultValue = (toolResult as any).result ?? (toolResult as any).output ?? toolResult;
                  let parsed = typeof resultValue === 'string' 
                    ? JSON.parse(resultValue) 
                    : resultValue;
                  
                  // Validate and correct risk classifications per EU AI Act Annex III
                  parsed = validateToolResult(toolResult.toolName, parsed);
                  
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
                    
                    // Show documentation files
                    if (parsed.metadata?.documentationFiles && parsed.metadata.documentationFiles.length > 0) {
                      console.log(`\n💾 Documentation Files Saved:`);
                      for (const filePath of parsed.metadata.documentationFiles) {
                        console.log(`   📄 ${filePath}`);
                      }
                    }
                    
                    if (parsed.metadata) {
                      console.log(`\n🤖 Model Used: ${parsed.metadata.modelUsed}`);
                    }
                  } else if (toolResult.toolName === 'discover_ai_services' && parsed) {
                    // Validate systems in discovery results
                    if (parsed.riskSummary) {
                      console.log(`🤖 Total Systems: ${parsed.riskSummary.totalCount}`);
                      console.log(`   High-Risk: ${parsed.riskSummary.highRiskCount}`);
                      console.log(`   Limited-Risk: ${parsed.riskSummary.limitedRiskCount}`);
                      console.log(`   Minimal-Risk: ${parsed.riskSummary.minimalRiskCount}`);
                    }
                    // Show any legal AI systems detected
                    if (parsed.systems) {
                      const legalSystems = parsed.systems.filter((s: any) => {
                        const ctx = `${s.system?.name || ""} ${s.system?.intendedPurpose || ""}`.toLowerCase();
                        return ctx.includes("legal") || ctx.includes("law") || ctx.includes("judicial");
                      });
                      if (legalSystems.length > 0) {
                        console.log(`\n⚖️  Legal AI Systems (HIGH RISK per Annex III Point 8(a)):`);
                        for (const sys of legalSystems) {
                          console.log(`   - ${sys.system?.name}: ${sys.riskClassification?.category}`);
                        }
                      }
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
                  const resultValue = (toolResult as any).result ?? (toolResult as any).output ?? toolResult;
                  const resultStr = String(resultValue);
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
      const { client, tools } = await createMCPClientWithTools(apiKeys, modelName, tavilyApiKey);
      const systemPrompt = getSystemPrompt(modelName);

      const result = streamText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...params.messages,
        ],
        // MCP tools are compatible at runtime but have different TypeScript types
        tools: tools as any,
        // Increase maxSteps to ensure all 3 tools + final response
        stopWhen: stepCountIs(3),
        // Reduce reasoning effort to prevent timeouts (LOW for speed)
        providerOptions: {
          anthropic: {
            thinking: { type: "enabled", budgetTokens: 2000 },  // Minimal thinking budget for Claude
          },
          openai: {
            reasoningEffort: "low",  // Low reasoning effort for GPT - faster responses
          },
          google: {
            thinkingConfig: {
              thinkingLevel: "low",  // Low thinking for faster responses
              includeThoughts: true,
            },
          },
        },
        // Log each step for debugging
        onStepFinish: async (step) => {
          // Output tool results with detailed information
          if (step.toolResults && step.toolResults.length > 0) {
            for (const toolResult of step.toolResults) {
              console.log(`\n📋 Tool Result: ${toolResult.toolName}`);
              console.log("─".repeat(50));
              
              try {
                // Access result safely - TypedToolResult may have result in different property
                const resultValue = (toolResult as any).result ?? (toolResult as any).output ?? toolResult;
                let result = typeof resultValue === 'string' 
                  ? JSON.parse(resultValue) 
                  : resultValue;
                
                // Validate and correct risk classifications per EU AI Act Annex III
                result = validateToolResult(toolResult.toolName, result);
                
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
                  
                  // Show documentation files
                  if (result.metadata?.documentationFiles && result.metadata.documentationFiles.length > 0) {
                    console.log(`\n💾 Documentation Files Saved:`);
                    for (const filePath of result.metadata.documentationFiles) {
                      console.log(`   📄 ${filePath}`);
                    }
                  }
                  
                  if (result.metadata) {
                    console.log(`\n🤖 Model Used: ${result.metadata.modelUsed}`);
                  }
                } else if (toolResult.toolName === 'discover_ai_services' && result) {
                  // Validate systems in discovery results
                  if (result.riskSummary) {
                    console.log(`🤖 Total Systems: ${result.riskSummary.totalCount}`);
                    console.log(`   High-Risk: ${result.riskSummary.highRiskCount}`);
                    console.log(`   Limited-Risk: ${result.riskSummary.limitedRiskCount}`);
                    console.log(`   Minimal-Risk: ${result.riskSummary.minimalRiskCount}`);
                  }
                  // Show any legal AI systems detected
                  if (result.systems) {
                    const legalSystems = result.systems.filter((s: any) => {
                      const ctx = `${s.system?.name || ""} ${s.system?.intendedPurpose || ""}`.toLowerCase();
                      return ctx.includes("legal") || ctx.includes("law") || ctx.includes("judicial");
                    });
                    if (legalSystems.length > 0) {
                      console.log(`\n⚖️  Legal AI Systems (HIGH RISK per Annex III Point 8(a)):`);
                      for (const sys of legalSystems) {
                        console.log(`   - ${sys.system?.name}: ${sys.riskClassification?.category}`);
                      }
                    }
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
                const resultValue = (toolResult as any).result ?? (toolResult as any).output ?? toolResult;
                const resultStr = String(resultValue);
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
      const { client, tools } = await createMCPClientWithTools(apiKeys, modelName, tavilyApiKey);
      const toolList = Object.entries(tools).map(([name, t]) => ({
        name,
        description: (t as any).description || "No description",
      }));
      await client.close();
      return toolList;
    },
  };
}
