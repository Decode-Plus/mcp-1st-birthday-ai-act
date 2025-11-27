/**
 * Test Agent for EU AI Act MCP Server
 * Demonstrates MCP server usage and validates functionality
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Load .env from workspace root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootEnvPath = resolve(__dirname, "../../../.env");
config({ path: rootEnvPath });

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

  // Test 2: Discover Organization (domain auto-discovery)
  console.log("🏢 Test 2: Discovering organization (domain auto-discovered from research)...");
  const orgResult = await client.callTool({
    name: "discover_organization",
    arguments: {
      organizationName: "IBM",
      context: "A technology company that provides AI and consulting solutions",
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
        systemNames: ["watson ai"],
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

      // Test 4: Compliance Assessment with AI
      console.log("\n📋 Test 4: Running AI-powered compliance assessment...");
      console.log("   (This requires OPENAI_API_KEY to be set)");
      
      try {
        const complianceResult = await client.callTool({
          name: "assess_compliance",
          arguments: {
            organizationContext: orgData,
            aiServicesContext: servicesData,
            focusAreas: ["Technical Documentation", "Risk Management", "Conformity Assessment"],
            generateDocumentation: true,
          },
        });

        if (complianceResult.content && Array.isArray(complianceResult.content) && complianceResult.content[0]?.type === "text") {
          const complianceData = JSON.parse(complianceResult.content[0].text);
          
          console.log("\n🎯 Compliance Assessment Results:");
          console.log(`  Overall Score: ${complianceData.assessment.overallScore}/100`);
          console.log(`  Risk Level: ${complianceData.assessment.riskLevel}`);
          console.log(`  Total Gaps: ${complianceData.assessment.gaps.length}`);
          console.log(`  Recommendations: ${complianceData.assessment.recommendations.length}`);
          console.log();

          // Display gaps by severity
          const criticalGaps = complianceData.assessment.gaps.filter((g: any) => g.severity === "CRITICAL");
          const highGaps = complianceData.assessment.gaps.filter((g: any) => g.severity === "HIGH");
          const mediumGaps = complianceData.assessment.gaps.filter((g: any) => g.severity === "MEDIUM");
          const lowGaps = complianceData.assessment.gaps.filter((g: any) => g.severity === "LOW");

          console.log("📊 Gap Analysis:");
          console.log(`  🔴 CRITICAL: ${criticalGaps.length}`);
          console.log(`  🟠 HIGH: ${highGaps.length}`);
          console.log(`  🟡 MEDIUM: ${mediumGaps.length}`);
          console.log(`  🟢 LOW: ${lowGaps.length}`);
          console.log();

          // Display top 3 critical/high gaps
          const topGaps = [...criticalGaps, ...highGaps].slice(0, 3);
          if (topGaps.length > 0) {
            console.log("⚠️  Top Priority Gaps:");
            for (const gap of topGaps) {
              console.log(`\n  [${gap.severity}] ${gap.category}`);
              console.log(`    Description: ${gap.description.substring(0, 100)}...`);
              console.log(`    Article: ${gap.articleReference}`);
              console.log(`    Effort: ${gap.remediationEffort}`);
            }
            console.log();
          }

          // Display top 3 recommendations
          if (complianceData.assessment.recommendations.length > 0) {
            console.log("💡 Top Recommendations:");
            const sortedRecs = [...complianceData.assessment.recommendations].sort((a: any, b: any) => a.priority - b.priority);
            for (const rec of sortedRecs.slice(0, 3)) {
              console.log(`\n  Priority ${rec.priority}: ${rec.title}`);
              console.log(`    Article: ${rec.articleReference}`);
              console.log(`    Effort: ${rec.estimatedEffort}`);
              console.log(`    Steps: ${rec.implementationSteps.length} implementation steps`);
            }
            console.log();
          }

          // Display compliance by article
          console.log("📖 Compliance by EU AI Act Article:");
          for (const [article, status] of Object.entries(complianceData.assessment.complianceByArticle)) {
            const articleStatus = status as { compliant: boolean; gaps: string[] };
            const statusIcon = articleStatus.compliant ? "✅" : "❌";
            console.log(`  ${statusIcon} ${article}: ${articleStatus.compliant ? "Compliant" : `${articleStatus.gaps.length} gap(s)`}`);
          }
          console.log();

          // Display documentation templates summary
          if (complianceData.documentation) {
            console.log("📄 Generated Documentation Templates:");
            const docs = complianceData.documentation;
            if (docs.riskManagementTemplate) console.log("  ✅ Risk Management System (Article 9)");
            if (docs.technicalDocumentation) console.log("  ✅ Technical Documentation (Article 11)");
            if (docs.conformityAssessment) console.log("  ✅ Conformity Assessment (Article 43)");
            if (docs.transparencyNotice) console.log("  ✅ Transparency Notice (Article 50)");
            if (docs.qualityManagementSystem) console.log("  ✅ Quality Management System (Article 17)");
            if (docs.humanOversightProcedure) console.log("  ✅ Human Oversight Procedure (Article 14)");
            if (docs.dataGovernancePolicy) console.log("  ✅ Data Governance Policy (Article 10)");
            if (docs.incidentReportingProcedure) console.log("  ✅ Incident Reporting Procedure");
            console.log();
          }

          // Display reasoning summary
          if (complianceData.reasoning) {
            console.log("🧠 AI Reasoning Summary:");
            const reasoningPreview = complianceData.reasoning.substring(0, 500);
            console.log(`  ${reasoningPreview}${complianceData.reasoning.length > 500 ? "..." : ""}`);
            console.log();
          }

          // Display metadata
          console.log("📋 Assessment Metadata:");
          console.log(`  Assessment Date: ${complianceData.metadata.assessmentDate}`);
          console.log(`  Model Used: ${complianceData.metadata.modelUsed}`);
          console.log(`  Systems Assessed: ${complianceData.metadata.systemsAssessed.join(", ")}`);
          console.log(`  Focus Areas: ${complianceData.metadata.focusAreas.join(", ")}`);
        }
      } catch (complianceError: any) {
        if (complianceError.message?.includes("OPENAI_API_KEY")) {
          console.log("⚠️  Skipping compliance assessment: OPENAI_API_KEY not set");
          console.log("   Set OPENAI_API_KEY environment variable to enable AI-powered compliance assessment");
        } else {
          console.error("❌ Compliance assessment failed:", complianceError.message);
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

