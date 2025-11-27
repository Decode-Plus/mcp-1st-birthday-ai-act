/**
 * Test Agent for EU AI Act MCP Server
 * Demonstrates MCP server usage and validates functionality
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Test the MCP Server
 */
async function testMCPServer() {
  console.log("🚀 Starting EU AI Act MCP Server Test Agent\n");

  // Create MCP client
  const client = new Client(
    {
      name: "test-agent",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );

  // Connect to MCP server via stdio
  const serverPath = new URL("../../eu-ai-act-mcp/src/index.ts", import.meta.url);
  
  const transport = new StdioClientTransport({
    command: "tsx",
    args: [serverPath.pathname],
  });

  await client.connect(transport);

  console.log("✅ Connected to MCP Server\n");

  // Test 1: List available tools
  console.log("📋 Test 1: Listing available tools...");
  const toolsList = await client.listTools();
  console.log(`Found ${toolsList.tools.length} tools:`);
  for (const tool of toolsList.tools) {
    const desc = tool.description ? tool.description.split("\n")[0] : "No description";
    console.log(`  - ${tool.name}: ${desc}`);
  }
  console.log();

  // Test 2: Discover Organization
  console.log("🏢 Test 2: Discovering organization...");
  const orgResult = await client.callTool({
    name: "discover_organization",
    arguments: {
      organizationName: "Acme AI Solutions GmbH",
      domain: "acme-ai.de",
      context: "German AI startup focused on healthcare solutions",
    },
  });

  console.log("Raw result:", JSON.stringify(orgResult, null, 2));
  
  if (orgResult.content && Array.isArray(orgResult.content) && orgResult.content[0]?.type === "text") {
    const orgData = JSON.parse(orgResult.content[0].text);
    console.log("Organization Profile:");
    console.log(`  Name: ${orgData.organization.name}`);
    console.log(`  Sector: ${orgData.organization.sector}`);
    console.log(`  Size: ${orgData.organization.size}`);
    console.log(`  AI Maturity: ${orgData.organization.aiMaturityLevel}`);
    console.log(`  Primary Role: ${orgData.organization.primaryRole}`);
    console.log(`  EU Presence: ${orgData.organization.euPresence}`);
    console.log(`  Compliance Deadlines: ${orgData.regulatoryContext.complianceDeadlines.length}`);
    console.log(`  Completeness Score: ${orgData.metadata.completenessScore}%`);
    console.log();

    // Test 3: Discover AI Services with organization context
    console.log("🤖 Test 3: Discovering AI services...");
    const servicesResult = await client.callTool({
      name: "discover_ai_services",
      arguments: {
        organizationContext: orgData,
        scope: "all",
      },
    });

    if (servicesResult.content && Array.isArray(servicesResult.content) && servicesResult.content[0]?.type === "text") {
      const servicesData = JSON.parse(servicesResult.content[0].text);
      
      console.log("AI Systems Discovery Results:");
      console.log(`  Total Systems: ${servicesData.riskSummary.totalCount}`);
      console.log(`  High-Risk: ${servicesData.riskSummary.highRiskCount}`);
      console.log(`  Limited Risk: ${servicesData.riskSummary.limitedRiskCount}`);
      console.log(`  Minimal Risk: ${servicesData.riskSummary.minimalRiskCount}`);
      console.log();

      console.log("Compliance Summary:");
      console.log(`  Fully Compliant: ${servicesData.complianceSummary.fullyCompliantCount}`);
      console.log(`  Partially Compliant: ${servicesData.complianceSummary.partiallyCompliantCount}`);
      console.log(`  Non-Compliant: ${servicesData.complianceSummary.nonCompliantCount}`);
      console.log(`  Requires Attention: ${servicesData.complianceSummary.requiresAttention.length}`);
      console.log();

      // Display systems requiring attention
      if (servicesData.complianceSummary.requiresAttention.length > 0) {
        console.log("⚠️  Systems Requiring Attention:");
        for (const system of servicesData.complianceSummary.requiresAttention) {
          console.log(`\n  📍 ${system.system.name}`);
          console.log(`     Risk Category: ${system.riskClassification.category}`);
          console.log(`     Risk Score: ${system.riskClassification.riskScore}/100`);
          console.log(`     Status: ${system.system.status}`);
          console.log(`     Compliance Gaps (${system.complianceStatus.identifiedGaps.length}):`);
          for (const gap of system.complianceStatus.identifiedGaps) {
            console.log(`       - ${gap}`);
          }
        }
        console.log();
      }

      // Display detailed system information
      console.log("📊 Detailed System Information:");
      for (const system of servicesData.systems) {
        console.log(`\n  System: ${system.system.name}`);
        console.log(`    Purpose: ${system.system.intendedPurpose}`);
        console.log(`    Risk: ${system.riskClassification.category}`);
        console.log(`    Technology: ${system.technicalDetails.aiTechnology.join(", ")}`);
        console.log(`    Deployment: ${system.technicalDetails.deploymentModel}`);
        console.log(`    Human Oversight: ${system.technicalDetails.humanOversight.enabled ? "Yes" : "No"}`);
        if (system.riskClassification.annexIIICategory) {
          console.log(`    Annex III Category: ${system.riskClassification.annexIIICategory}`);
        }
      }
    }
  }

  console.log("\n✅ All tests completed successfully!");
  console.log("\n📚 MCP Server is ready for use with:");
  console.log("   - Claude Desktop");
  console.log("   - ChatGPT Apps SDK");
  console.log("   - Any MCP-compliant client");

  await client.close();
  process.exit(0);
}

// Run tests
testMCPServer().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});

