/**
 * MCP Tool Adapters for Vercel AI SDK v5
 * Wraps EU AI Act MCP tools for use with the agent
 */

import { tool } from "ai";
import { z } from "zod";

// Import MCP tools directly from dist (runtime imports)
// @ts-ignore - These will be available at runtime after building
import { discoverOrganization } from "../../../../packages/eu-ai-act-mcp/dist/tools/discover-organization.js";
// @ts-ignore
import { discoverAIServices } from "../../../../packages/eu-ai-act-mcp/dist/tools/discover-ai-services.js";
// @ts-ignore
import { assessCompliance } from "../../../../packages/eu-ai-act-mcp/dist/tools/assess-compliance.js";

/**
 * Tool 1: Organization Discovery
 */
export const discoverOrganizationTool = tool({
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
  
  parameters: z.object({
    organizationName: z.string().describe("Name of the organization to discover"),
    domain: z.string().optional().describe("Organization's website domain (optional, will be auto-discovered)"),
    context: z.string().optional().describe("Additional context about the organization (optional)"),
  }),

  execute: async ({ organizationName, domain, context }) => {
    try {
      const result = await discoverOrganization({
        organizationName,
        domain,
        context,
      });
      return result;
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Tool 2: AI Services Discovery
 */
export const discoverAIServicesTool = tool({
  description: `Discover and classify AI systems within an organization per EU AI Act requirements.

This tool scans for AI systems and provides comprehensive compliance analysis:
- Risk classification per Article 6 and Annex III (Unacceptable, High, Limited, Minimal)
- Technical documentation status per Article 11
- Conformity assessment requirements per Article 43
- Compliance gap analysis with specific Article references
- Registration status per Article 49

Generates reports for systems requiring immediate attention with EU database registration obligations (Article 49, Annex VIII).`,

  parameters: z.object({
    organizationContext: z.any().optional().describe("Organization profile from discover_organization tool (optional but recommended)"),
    systemNames: z.array(z.string()).optional().describe("Specific AI system names to discover (optional, scans all if not provided)"),
    scope: z.string().optional().describe("Scope of discovery: 'all' (default), 'high-risk-only', 'production-only'"),
    context: z.string().optional().describe("Additional context about the systems (optional)"),
  }),

  execute: async ({ organizationContext, systemNames, scope, context }) => {
    try {
      const result = await discoverAIServices({
        organizationContext,
        systemNames,
        scope,
        context,
      });
      return result;
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Tool 3: Compliance Assessment
 */
export const assessComplianceTool = tool({
  description: `Assess EU AI Act compliance and generate documentation using AI analysis.

This tool takes organization and AI services context to produce comprehensive compliance assessment:
- Gap analysis against AI Act requirements (Articles 9-15, 16-22, 43-50)
- Risk-specific compliance checklists
- Draft documentation templates in markdown format
- Remediation recommendations with priorities
- Overall compliance score (0-100)
- Chain-of-thought reasoning explanation

Uses GPT-4 to analyze compliance status and generate professional documentation templates for:
- Risk Management System (Article 9)
- Technical Documentation (Article 11, Annex IV)
- Conformity Assessment (Article 43)
- Transparency Notice (Article 50)
- Quality Management System (Article 17)
- Human Oversight Procedure (Article 14)
- Data Governance Policy (Article 10)

Requires OPENAI_API_KEY environment variable to be set.`,

  parameters: z.object({
    organizationContext: z.any().optional().describe("Organization profile from discover_organization tool (optional)"),
    aiServicesContext: z.any().optional().describe("AI services discovery results from discover_ai_services tool (optional)"),
    focusAreas: z.array(z.string()).optional().describe("Specific compliance areas to focus on (optional)"),
    generateDocumentation: z.boolean().optional().describe("Whether to generate documentation templates (default: true)"),
  }),

  execute: async ({ organizationContext, aiServicesContext, focusAreas, generateDocumentation }) => {
    try {
      const result = await assessCompliance({
        organizationContext,
        aiServicesContext,
        focusAreas,
        generateDocumentation,
      });
      return result;
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

