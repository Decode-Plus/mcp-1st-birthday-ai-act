#!/usr/bin/env node

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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { discoverOrganization } from "./tools/discover-organization.js";
import { discoverAIServices } from "./tools/discover-ai-services.js";
import {
  DiscoverOrganizationInputSchema,
  DiscoverAIServicesInputSchema,
} from "./schemas/index.js";

/**
 * MCP Server Instance
 */
const server = new McpServer({
  name: "@eu-ai-act/mcp-server",
  version: "0.1.0",
});

/**
 * Register Tools using modern McpServer API
 */

// Tool 1: Organization Discovery
server.tool(
  "discover_organization",
  `Discover and profile an organization for EU AI Act compliance.

This tool researches an organization and creates a comprehensive profile including:
- Basic organization information (name, sector, size, location)
- Regulatory context and compliance deadlines
- AI maturity level assessment
- Provider role classification per Article 3(3)
- Quality management system status per Article 17

Based on EU AI Act Articles 16 (Provider Obligations), 22 (Authorized Representatives), and 49 (Registration Requirements).`,
  {
    organizationName: z.string().describe("Name of the organization to discover"),
    domain: z.string().optional().describe("Organization website domain (optional, helps with research)"),
    context: z.string().optional().describe("Additional context about the organization (optional)"),
  },
  async ({ organizationName, domain, context }) => {
    // Execute tool
    const result = await discoverOrganization({
      organizationName,
      domain,
      context,
    });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool 2: AI Services Discovery  
server.tool(
  "discover_ai_services",
  `Discover and classify AI systems within an organization per EU AI Act requirements.

This tool scans for AI systems and provides comprehensive compliance analysis:
- Risk classification per Article 6 and Annex III (Unacceptable, High, Limited, Minimal)
- Technical documentation status per Article 11
- Conformity assessment requirements per Article 43
- Compliance gap analysis with specific Article references
- Registration status per Article 49

Generates reports for systems requiring immediate attention with EU database registration obligations (Article 49, Annex VIII).`,
  {
    organizationContext: z.any().optional().describe("Organization profile from discover_organization tool (optional but recommended)"),
    systemNames: z.array(z.string()).optional().describe("Specific AI system names to discover (optional, scans all if not provided)"),
    scope: z.string().optional().describe("Scope of discovery: 'all' (default), 'high-risk-only', 'production-only'"),
  },
  async ({ organizationContext, systemNames, scope }) => {
    // Execute tool
    const result = await discoverAIServices({
      organizationContext,
      systemNames,
      scope,
    });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

/**
 * Start Server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("EU AI Act MCP Server running on stdio");
  console.error("Available tools: discover_organization, discover_ai_services");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

