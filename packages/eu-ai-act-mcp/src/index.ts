/**
 * EU AI Act MCP Server
 * Model Context Protocol server providing EU AI Act compliance tools
 * 
 * Implements:
 * - Organization Discovery (Article 16, 49)
 * - AI Systems Discovery (Article 6, 11, Annex III)
 * 
 * Compatible with:
 * - Claude Desktop
 * - ChatGPT Apps SDK
 * - Any MCP-compliant client
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Load .env from workspace root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootEnvPath = resolve(__dirname, "../../../.env");
config({ path: rootEnvPath });

import { discoverOrganization } from "./tools/discover-organization.js";
import { discoverAIServices } from "./tools/discover-ai-services.js";
import { assessCompliance } from "./tools/assess-compliance.js";
import {
  DiscoverOrganizationInputSchema,
  DiscoverAIServicesInputSchema,
  ComplianceAssessmentInputSchema,
} from "./schemas/index.js";

// Export shared utilities for external use
export { getModel, type ApiKeys } from "./utils/model.js";

// Export tool functions for direct API use (ChatGPT Apps, REST API, etc.)
export { discoverOrganization, discoverAIServices, assessCompliance };

/**
 * MCP Server Instance
 */
const server = new McpServer({
  name: "@eu-ai-act/mcp-server",
  version: "0.1.0",
});

/**
 * Register Tools using McpServer API
 * Using registerTool (non-deprecated API)
 */

// Tool 1: Organization Discovery
server.registerTool(
  "discover_organization",
  {
    description: `Discover and profile an organization for EU AI Act compliance.

This tool researches an organization and creates a comprehensive profile including:
- Basic organization information (name, sector, size, location)
- Contact information (email, phone, website)
- Regulatory context and compliance deadlines
- AI maturity level assessment
- Certifications and compliance status
- Provider role classification per Article 3(3)
- Quality management system status per Article 17

The tool automatically discovers the company domain from web research if not provided.

Based on EU AI Act Articles 16 (Provider Obligations), 22 (Authorized Representatives), and 49 (Registration Requirements).`,
    inputSchema: z.object({
      organizationName: z.string().describe("Name of the organization to discover (required)"),
      domain: z.string().optional().nullable().describe("Organization's domain (e.g., 'ibm.com'). Auto-discovered if not provided."),
      context: z.string().optional().nullable().describe("Additional context about the organization"),
    }),
  },
  async ({ organizationName, domain, context }: { organizationName: string; domain?: string | null; context?: string | null }) => {
    // Convert null values to undefined
    const cleanDomain = domain ?? undefined;
    const cleanContext = context ?? undefined;
    
    console.error(`[discover_organization] Called with: organizationName="${organizationName}", domain="${cleanDomain}", context="${cleanContext}"`);
    
    try {
    // Execute tool
    const result = await discoverOrganization({
      organizationName,
      domain: cleanDomain,
      context: cleanContext,
    });
    
    console.error(`[discover_organization] Completed, result has ${JSON.stringify(result).length} chars`);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
    } catch (error) {
      console.error(`[discover_organization] Error:`, error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: true,
              message: error instanceof Error ? error.message : "Unknown error occurred",
              tool: "discover_organization",
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 2: AI Services Discovery  
server.registerTool(
  "discover_ai_services",
  {
    description: `Discover and classify AI systems within an organization per EU AI Act requirements.

This tool scans for AI systems and provides comprehensive compliance analysis:
- Risk classification per Article 6 and Annex III (Unacceptable, High, Limited, Minimal)
- Technical documentation status per Article 11
- Conformity assessment requirements per Article 43
- Compliance gap analysis with specific Article references
- Registration status per Article 49

Generates reports for systems requiring immediate attention with EU database registration obligations (Article 49, Annex VIII).`,
    inputSchema: z.object({
      organizationContext: z.any().optional().nullable().describe("Organization profile from discover_organization tool (optional but recommended)"),
      systemNames: z.array(z.string()).optional().nullable().describe("Specific AI system names to discover (optional, scans all if not provided)"),
      scope: z.string().optional().nullable().describe("Scope of discovery: 'all' (default), 'high-risk-only', 'production-only'"),
      context: z.string().optional().nullable().describe("Additional context about the systems"),
    }),
  },
  async ({ organizationContext, systemNames, scope, context }: { organizationContext?: any; systemNames?: string[] | null; scope?: string | null; context?: string | null }) => {
    // Convert null values to undefined
    const cleanOrgContext = organizationContext ?? undefined;
    const cleanSystemNames = systemNames ?? undefined;
    const cleanScope = scope ?? undefined;
    const cleanContext = context ?? undefined;
    
    console.error(`[discover_ai_services] Called with: systemNames=${JSON.stringify(cleanSystemNames)}, scope="${cleanScope}"`);
    
    try {
    // Execute tool
    const result = await discoverAIServices({
      organizationContext: cleanOrgContext,
      systemNames: cleanSystemNames,
      scope: cleanScope,
      context: cleanContext,
    });
    
    console.error(`[discover_ai_services] Completed, found ${result.systems?.length || 0} systems`);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
    } catch (error) {
      console.error(`[discover_ai_services] Error:`, error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: true,
              message: error instanceof Error ? error.message : "Unknown error occurred",
              tool: "discover_ai_services",
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: Compliance Assessment
server.registerTool(
  "assess_compliance",
  {
    description: `Assess EU AI Act compliance and generate documentation using AI analysis.

This tool takes organization and AI services context to produce comprehensive compliance assessment:
- Gap analysis against AI Act requirements (Articles 9-15, 16-22, 43-50)
- Risk-specific compliance checklists
- Draft documentation templates in markdown format
- Remediation recommendations with priorities
- Overall compliance score (0-100)
- Chain-of-thought reasoning explanation

Supports multiple AI models (set via 'model' parameter or AI_MODEL environment variable):
- claude-4.5: Anthropic Claude Sonnet 4.5 (default)
- claude-opus: Anthropic Claude Opus 4
- gpt-5: OpenAI GPT-5
- grok-4-1: xAI Grok 4.1 Fast Reasoning
- gemini-3: Google Gemini 3 Pro

Generates professional documentation templates for:
- Risk Management System (Article 9)
- Technical Documentation (Article 11, Annex IV)
- Conformity Assessment (Article 43)
- Transparency Notice (Article 50)
- Quality Management System (Article 17)
- Human Oversight Procedure (Article 14)
- Data Governance Policy (Article 10)

Requires appropriate API key environment variable based on selected model.`,
    inputSchema: z.object({
      organizationContext: z.any().optional().nullable().describe("Organization profile from discover_organization tool (optional)"),
      aiServicesContext: z.any().optional().nullable().describe("AI services discovery results from discover_ai_services tool (optional)"),
      focusAreas: z.array(z.string()).optional().nullable().describe("Specific compliance areas to focus on (optional)"),
      generateDocumentation: z.boolean().optional().nullable().describe("Whether to generate documentation templates (default: true)"),
      model: z.enum(["claude-4.5", "claude-opus", "gpt-5", "grok-4-1", "gemini-3"]).optional().nullable().describe("AI model to use: claude-4.5 (default), claude-opus, gpt-5, grok-4-1, gemini-3"),
    }),
  },
  async ({ organizationContext, aiServicesContext, focusAreas, generateDocumentation, model }: { organizationContext?: any; aiServicesContext?: any; focusAreas?: string[] | null; generateDocumentation?: boolean | null; model?: string | null }) => {
    // Convert null values to undefined for downstream functions
    const cleanFocusAreas = focusAreas ?? undefined;
    const cleanGenerateDocumentation = generateDocumentation ?? undefined;
    const cleanOrgContext = organizationContext ?? undefined;
    const cleanAiServicesContext = aiServicesContext ?? undefined;
    const cleanModel = model ?? undefined;
    
    console.error(`[assess_compliance] Called with: model="${cleanModel}", focusAreas=${JSON.stringify(cleanFocusAreas)}, generateDocumentation=${cleanGenerateDocumentation}`);
    
    try {
    // Execute tool
    const result = await assessCompliance({
      organizationContext: cleanOrgContext,
      aiServicesContext: cleanAiServicesContext,
      focusAreas: cleanFocusAreas,
      generateDocumentation: cleanGenerateDocumentation,
      model: cleanModel as any,
    });
    
    console.error(`[assess_compliance] Completed, score: ${result.assessment?.overallScore || 'N/A'}`);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
    } catch (error) {
      console.error(`[assess_compliance] Error:`, error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: true,
              message: error instanceof Error ? error.message : "Unknown error occurred",
              tool: "assess_compliance",
              hint: "Make sure XAI_API_KEY environment variable is set",
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Start Server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("EU AI Act MCP Server running on stdio");
  console.error("Available tools: discover_organization, discover_ai_services, assess_compliance");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

