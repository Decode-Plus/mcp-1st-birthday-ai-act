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
      domain: z.string().optional().describe("Organization's domain (e.g., 'ibm.com'). Auto-discovered if not provided."),
      context: z.string().optional().describe("Additional context about the organization"),
    }),
  },
  async ({ organizationName, domain, context }: { organizationName: string; domain?: string; context?: string }) => {
    console.error(`[discover_organization] Called with: organizationName="${organizationName}", domain="${domain}", context="${context}"`);
    
    try {
      // Execute tool
      const result = await discoverOrganization({
        organizationName,
        domain,
        context,
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
      organizationContext: z.any().optional().describe("Organization profile from discover_organization tool (optional but recommended)"),
      systemNames: z.array(z.string()).optional().describe("Specific AI system names to discover (optional, scans all if not provided)"),
      scope: z.string().optional().describe("Scope of discovery: 'all' (default), 'high-risk-only', 'production-only'"),
      context: z.string().optional().describe("Additional context about the systems"),
    }),
  },
  async ({ organizationContext, systemNames, scope, context }: { organizationContext?: any; systemNames?: string[]; scope?: string; context?: string }) => {
    console.error(`[discover_ai_services] Called with: systemNames=${JSON.stringify(systemNames)}, scope="${scope}"`);
    
    try {
      // Execute tool
      const result = await discoverAIServices({
        organizationContext,
        systemNames,
        scope,
        context,
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

Uses xAI Grok-4 to analyze compliance status and generate professional documentation templates for:
- Risk Management System (Article 9)
- Technical Documentation (Article 11, Annex IV)
- Conformity Assessment (Article 43)
- Transparency Notice (Article 50)
- Quality Management System (Article 17)
- Human Oversight Procedure (Article 14)
- Data Governance Policy (Article 10)

Requires XAI_API_KEY environment variable to be set.`,
    inputSchema: z.object({
      organizationContext: z.any().optional().describe("Organization profile from discover_organization tool (optional)"),
      aiServicesContext: z.any().optional().describe("AI services discovery results from discover_ai_services tool (optional)"),
      focusAreas: z.array(z.string()).optional().describe("Specific compliance areas to focus on (optional)"),
      generateDocumentation: z.boolean().optional().describe("Whether to generate documentation templates (default: true)"),
    }),
  },
  async ({ organizationContext, aiServicesContext, focusAreas, generateDocumentation }: { organizationContext?: any; aiServicesContext?: any; focusAreas?: string[]; generateDocumentation?: boolean }) => {
    console.error(`[assess_compliance] Called with: focusAreas=${JSON.stringify(focusAreas)}, generateDocumentation=${generateDocumentation}`);
    
    try {
      // Execute tool
      const result = await assessCompliance({
        organizationContext,
        aiServicesContext,
        focusAreas,
        generateDocumentation,
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

