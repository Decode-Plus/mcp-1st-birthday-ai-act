#!/usr/bin/env node

/**
 * EU AI Act Compliance Agent Server
 * Express API with Vercel AI SDK v5 agent
 * 
 * Supports streaming text and tool calls
 */

import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createAgent } from "./agent/index.js";

// Load environment variables from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, "../../../.env") });  // Go up from src -> eu-ai-act-agent -> apps -> root

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ["http://localhost:7860", "http://127.0.0.1:7860", "http://localhost:3000"], 
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    service: "EU AI Act Compliance Agent",
    version: "0.1.0",
  });
});

/**
 * Process stream events and write to response
 * Returns set of tool names that were called
 */
async function processStreamEvents(
  stream: AsyncIterable<any>,
  res: express.Response
): Promise<{ toolsCalled: Set<string>; toolResults: Map<string, any>; hasText: boolean }> {
  const toolsCalled = new Set<string>();
  const toolResults = new Map<string, any>();
  let hasText = false;

  for await (const event of stream) {
    if (event.type === "text-delta") {
      hasText = true;
    } else {
      console.log("Stream event:", event.type);
    }
    
    switch (event.type) {
      case "text-delta":
        const textContent = (event as any).textDelta ?? (event as any).delta ?? (event as any).text ?? "";
        res.write(`data: ${JSON.stringify({ type: "text", content: textContent })}\n\n`);
        break;

      case "tool-call":
        console.log("TOOL CALL:", event.toolName);
        toolsCalled.add(event.toolName);
        const toolArgs = (event as any).args ?? (event as any).input ?? {};
        res.write(`data: ${JSON.stringify({ 
          type: "tool_call", 
          toolName: event.toolName,
          toolCallId: event.toolCallId,
          args: toolArgs,
        })}\n\n`);
        break;

      case "tool-result":
        console.log("TOOL RESULT:", event.toolName);
        const toolOutput = (event as any).output;
        const directResult = (event as any).result;
        let parsedResult = null;
        
        if (directResult) {
          parsedResult = directResult;
        } else if (toolOutput?.content?.[0]?.text) {
          try {
            parsedResult = JSON.parse(toolOutput.content[0].text);
          } catch {
            parsedResult = toolOutput.content[0].text;
          }
        }
        
        toolResults.set(event.toolName, parsedResult);
        
        res.write(`data: ${JSON.stringify({ 
          type: "tool_result", 
          toolName: event.toolName,
          toolCallId: event.toolCallId,
          result: parsedResult,
        })}\n\n`);
        break;

      case "step-finish":
        res.write(`data: ${JSON.stringify({ 
          type: "step_finish",
          finishReason: event.finishReason,
        })}\n\n`);
        break;

      case "error":
        res.write(`data: ${JSON.stringify({ 
          type: "error", 
          error: String(event.error),
        })}\n\n`);
        break;
    }
  }

  return { toolsCalled, toolResults, hasText };
}

// Main chat endpoint with full streaming support
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Read model selection from headers (set by Gradio UI)
    const modelHeader = req.headers["x-ai-model"] as string;
    
    // SECURITY: Only read user-provided keys from headers if they want to override
    // Backend environment keys are the PRIMARY source and are NEVER exposed to frontend
    const openaiKeyHeader = req.headers["x-openai-api-key"] as string;
    const xaiKeyHeader = req.headers["x-xai-api-key"] as string;
    const anthropicKeyHeader = req.headers["x-anthropic-api-key"] as string;
    const tavilyKeyHeader = req.headers["x-tavily-api-key"] as string;

    // Set model selection if provided (default to claude-4.5 for Anthropic hackathon!)
    if (modelHeader) {
      process.env.AI_MODEL = modelHeader;
      console.log(`[API] Model set via header: ${modelHeader}`);
    } else if (!process.env.AI_MODEL) {
      process.env.AI_MODEL = "claude-4.5";
      console.log(`[API] Using default model: claude-4.5 (Anthropic)`);
    }
    
    // Only override env keys if user explicitly provides their own keys
    // This allows users to use their own keys if they prefer
    if (openaiKeyHeader && openaiKeyHeader.length > 10) {
      process.env.OPENAI_API_KEY = openaiKeyHeader;
      console.log(`[API] Using user-provided OpenAI API key`);
    }
    if (xaiKeyHeader && xaiKeyHeader.length > 10) {
      process.env.XAI_API_KEY = xaiKeyHeader;
      console.log(`[API] Using user-provided xAI API key`);
    }
    if (anthropicKeyHeader && anthropicKeyHeader.length > 10) {
      process.env.ANTHROPIC_API_KEY = anthropicKeyHeader;
      console.log(`[API] Using user-provided Anthropic API key`);
    }
    if (tavilyKeyHeader && tavilyKeyHeader.length > 10) {
      process.env.TAVILY_API_KEY = tavilyKeyHeader;
      console.log(`[API] Using user-provided Tavily API key`);
    }

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send user message confirmation immediately
    res.write(`data: ${JSON.stringify({ type: "user_message", content: message })}\n\n`);

    // Create agent instance (will use the env vars set above)
    const agent = createAgent();

    // Convert history to messages format
    const messages = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    console.log("Starting stream for message:", message);
    
    // First pass - stream the response
    const result = await agent.streamText({ messages });
    let { toolsCalled, toolResults, hasText } = await processStreamEvents(result.fullStream, res);
    
    console.log("First pass complete. Tools called:", [...toolsCalled]);
    
    // Check if this looks like an organization analysis that needs more tool calls
    const hasOrgDiscovery = toolsCalled.has("discover_organization");
    const hasAIServicesDiscovery = toolsCalled.has("discover_ai_services");
    const hasAssessCompliance = toolsCalled.has("assess_compliance");
    
    // Need AI services discovery if we have org but not AI services
    const needsAIServicesDiscovery = hasOrgDiscovery && !hasAIServicesDiscovery;
    
    // Need assessment if we have org/ai services but not assessment
    const needsAssessment = (hasOrgDiscovery || hasAIServicesDiscovery) && !hasAssessCompliance;
    
    // If discover_ai_services wasn't called but discover_organization was, make a follow-up request for AI services
    if (needsAIServicesDiscovery && !hasText) {
      console.log("⚠️ discover_organization called but discover_ai_services missing. Making follow-up request...");
      
      const orgContext = toolResults.get("discover_organization");
      
      // List which tools were already called to prevent duplicates
      const alreadyCalled = [...toolsCalled].join(", ");
      
      const aiServicesFollowUp = `
You called discover_organization but SKIPPED discover_ai_services.

## TOOLS ALREADY CALLED (DO NOT CALL AGAIN): ${alreadyCalled}

## CRITICAL: Call discover_ai_services NOW (ONLY ONCE)

Organization context is ready:
- Name: ${orgContext?.organization?.name || "Unknown"}
- Sector: ${orgContext?.organization?.sector || "Unknown"}

Call discover_ai_services ONCE with:
- organizationContext: Use the organization profile from discover_organization
- systemNames: Extract any AI systems mentioned in the user's original query

After discover_ai_services completes, call assess_compliance ONCE with BOTH contexts.

⚠️ EACH TOOL MUST BE CALLED EXACTLY ONCE - NO DUPLICATES!`;
      
      const aiServicesMessages = [
        ...messages,
        {
          role: "assistant",
          content: `I have gathered the organization profile for ${orgContext?.organization?.name || "the organization"}. Now I will discover their AI systems.`,
        },
        {
          role: "user",
          content: aiServicesFollowUp,
        },
      ];
      
      console.log("Making follow-up request to call discover_ai_services...");
      
      const aiServicesResult = await agent.streamText({ messages: aiServicesMessages });
      const aiServicesData = await processStreamEvents(aiServicesResult.fullStream, res);
      
      // Update tracking with follow-up results (only add new tools)
      for (const [tool, result] of aiServicesData.toolResults) {
        if (!toolResults.has(tool)) {
          toolResults.set(tool, result);
        }
      }
      for (const tool of aiServicesData.toolsCalled) {
        toolsCalled.add(tool);
      }
      hasText = hasText || aiServicesData.hasText;
      
      // Update needsAssessment check
      const nowHasAssessment = toolsCalled.has("assess_compliance");
      if (!nowHasAssessment) {
        console.log("discover_ai_services called but assess_compliance still missing...");
      }
    }
    
    // Recalculate if we still need assessment after AI services discovery
    const stillNeedsAssessment = (toolsCalled.has("discover_organization") || toolsCalled.has("discover_ai_services")) && !toolsCalled.has("assess_compliance");
    
    // If organization/AI services tools were called but assess_compliance wasn't, make a follow-up request
    if (stillNeedsAssessment && !hasText) {
      console.log("⚠️ Organization/AI tools called but assess_compliance missing. Making follow-up request...");
      
      // Build context from tool results - these are the FULL results from the previous tools
      const orgContext = toolResults.get("discover_organization");
      const aiServicesContext = toolResults.get("discover_ai_services");
      
      // Create a follow-up message that includes the COMPLETE tool results as JSON
      // This ensures the model has all the data needed to call assess_compliance correctly
      const alreadyCalledTools = [...toolsCalled].join(", ");
      
      const fullContextMessage = `
I have received the complete results from the previous tools. Now I need you to call assess_compliance with the FULL context.

## ⚠️ TOOLS ALREADY CALLED (DO NOT CALL AGAIN): ${alreadyCalledTools}

## COMPLETE ORGANIZATION CONTEXT (from discover_organization):
\`\`\`json
${JSON.stringify(orgContext, null, 2)}
\`\`\`

## COMPLETE AI SERVICES CONTEXT (from discover_ai_services):
\`\`\`json
${JSON.stringify(aiServicesContext, null, 2)}
\`\`\`

## INSTRUCTION:
Call assess_compliance ONCE with these EXACT parameters:
- organizationContext: Pass the COMPLETE organization context JSON shown above (not a summary)
- aiServicesContext: Pass the COMPLETE AI services context JSON shown above (not a summary)
- generateDocumentation: true

⚠️ CALL assess_compliance EXACTLY ONCE - DO NOT call any tool that was already called!
After assess_compliance returns, provide a human-readable summary of the compliance assessment.`;
      
      const followUpMessages = [
        ...messages,
        {
          role: "assistant",
          content: `I have gathered the organization profile for ${orgContext?.organization?.name || "the organization"} and discovered ${aiServicesContext?.systems?.length || 0} AI systems. Now I will call assess_compliance with the complete context to generate the full compliance report.`,
        },
        {
          role: "user", 
          content: fullContextMessage,
        },
      ];
      
      console.log("Making follow-up request to call assess_compliance with FULL context...");
      console.log(`Organization context size: ${JSON.stringify(orgContext || {}).length} chars`);
      console.log(`AI services context size: ${JSON.stringify(aiServicesContext || {}).length} chars`);
      
      const followUpResult = await agent.streamText({ messages: followUpMessages });
      const followUpData = await processStreamEvents(followUpResult.fullStream, res);
      
      // Update tracking with follow-up results
      for (const [tool, result] of followUpData.toolResults) {
        toolResults.set(tool, result);
      }
      for (const tool of followUpData.toolsCalled) {
        toolsCalled.add(tool);
      }
      // Update hasText from follow-up
      hasText = hasText || followUpData.hasText;
    }
    
    // Final check for text
    const hasTextNow = hasText;
    
    // If still no text response, generate a comprehensive summary based on available tool results
    if (!hasTextNow && toolResults.size > 0) {
      console.log("Generating comprehensive compliance report from tool results...");
      
      // Create a summary from available data
      const orgData = toolResults.get("discover_organization");
      const aiData = toolResults.get("discover_ai_services");
      const assessData = toolResults.get("assess_compliance");
      
      let summary = "\n\n---\n\n";
      
      // ================== HEADER ==================
      const orgName = orgData?.organization?.name || "Organization";
      summary += `# 🇪🇺 EU AI Act Compliance Report\n`;
      summary += `## ${orgName}\n\n`;
      summary += `*Assessment Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}*\n\n`;
      summary += `---\n\n`;
      
      // ================== ORGANIZATION PROFILE ==================
      if (orgData?.organization) {
        const org = orgData.organization;
        summary += `## 🏢 Organization Profile\n\n`;
        summary += `| Attribute | Value |\n`;
        summary += `|-----------|-------|\n`;
        summary += `| **Name** | ${org.name} |\n`;
        summary += `| **Sector** | ${org.sector} |\n`;
        summary += `| **Size** | ${org.size} |\n`;
        summary += `| **Headquarters** | ${org.headquarters?.city || "Unknown"}, ${org.headquarters?.country || "Unknown"} |\n`;
        summary += `| **EU Presence** | ${org.euPresence ? "✅ Yes" : "❌ No"} |\n`;
        summary += `| **AI Maturity Level** | ${org.aiMaturityLevel} |\n`;
        summary += `| **Primary Role** | ${org.primaryRole} (per Article 3) |\n`;
        summary += `| **Jurisdictions** | ${org.jurisdiction?.join(", ") || "Unknown"} |\n`;
        if (org.contact?.website) {
          summary += `| **Website** | ${org.contact.website} |\n`;
        }
        summary += `\n`;
        
        // Regulatory Context
        if (orgData.regulatoryContext) {
          const reg = orgData.regulatoryContext;
          summary += `### 📋 Regulatory Context\n\n`;
          summary += `- **Quality Management System (Article 17):** ${reg.hasQualityManagementSystem ? "✅ Implemented" : "⚠️ Not Implemented"}\n`;
          summary += `- **Risk Management System (Article 9):** ${reg.hasRiskManagementSystem ? "✅ Implemented" : "⚠️ Not Implemented"}\n`;
          if (reg.existingCertifications?.length > 0) {
            summary += `- **Certifications:** ${reg.existingCertifications.join(", ")}\n`;
          }
          if (!org.euPresence) {
            summary += `- **Authorized Representative (Article 22):** ${reg.hasAuthorizedRepresentative ? "✅ Appointed" : "⚠️ Required for non-EU entities"}\n`;
          }
          summary += `\n`;
        }
      }
      
      // ================== AI SYSTEMS ANALYSIS ==================
      if (aiData?.systems && aiData.systems.length > 0) {
        summary += `## 🤖 AI Systems Analysis\n\n`;
        
        // Risk Summary Table
        const riskSummary = aiData.riskSummary;
        summary += `### Risk Distribution\n\n`;
        summary += `| Risk Category | Count | Status |\n`;
        summary += `|---------------|-------|--------|\n`;
        if (riskSummary.unacceptableRiskCount > 0) {
          summary += `| 🔴 **Unacceptable Risk** | ${riskSummary.unacceptableRiskCount} | ⛔ PROHIBITED |\n`;
        }
        summary += `| 🟠 **High Risk** | ${riskSummary.highRiskCount} | Requires Conformity Assessment |\n`;
        summary += `| 🟡 **Limited Risk** | ${riskSummary.limitedRiskCount} | Transparency Obligations |\n`;
        summary += `| 🟢 **Minimal Risk** | ${riskSummary.minimalRiskCount} | No Specific Obligations |\n`;
        summary += `| **Total** | ${riskSummary.totalCount} | |\n\n`;
        
        // Detailed System Analysis
        summary += `### Detailed System Analysis\n\n`;
        
        for (const sys of aiData.systems) {
          const riskEmoji = sys.riskClassification.category === "High" ? "🟠" : 
                           sys.riskClassification.category === "Limited" ? "🟡" : 
                           sys.riskClassification.category === "Unacceptable" ? "🔴" : "🟢";
          
          summary += `#### ${riskEmoji} ${sys.system.name}\n\n`;
          summary += `**Risk Classification:** ${sys.riskClassification.category} Risk (Score: ${sys.riskClassification.riskScore}/100)\n\n`;
          
          // Purpose and Description
          summary += `**Intended Purpose:** ${sys.system.intendedPurpose}\n\n`;
          
          // Classification Reasoning
          if (sys.riskClassification.justification) {
            summary += `**Classification Reasoning:**\n> ${sys.riskClassification.justification}\n\n`;
          }
          
          // Annex III Category for High-Risk
          if (sys.riskClassification.category === "High" && sys.riskClassification.annexIIICategory) {
            summary += `**Annex III Category:** ${sys.riskClassification.annexIIICategory}\n\n`;
        }
          
          // Technical Details
          summary += `**Technical Details:**\n`;
          summary += `- AI Technology: ${sys.technicalDetails.aiTechnology?.join(", ") || "Not specified"}\n`;
          summary += `- Data Processed: ${sys.technicalDetails.dataProcessed?.join(", ") || "Not specified"}\n`;
          summary += `- Deployment: ${sys.technicalDetails.deploymentModel || "Not specified"}\n`;
          summary += `- Human Oversight: ${sys.technicalDetails.humanOversight?.enabled ? "✅ Enabled" : "⚠️ Not enabled"}\n`;
          if (sys.technicalDetails.humanOversight?.description) {
            summary += `  - *${sys.technicalDetails.humanOversight.description}*\n`;
          }
          summary += `\n`;
          
          // Compliance Status
          summary += `**Compliance Status:**\n`;
          summary += `- Conformity Assessment: ${sys.complianceStatus.conformityAssessmentStatus}\n`;
          summary += `- Technical Documentation: ${sys.complianceStatus.hasTechnicalDocumentation ? "✅" : "❌"}\n`;
          summary += `- EU Database Registration: ${sys.complianceStatus.registeredInEUDatabase ? "✅" : "❌"}\n`;
          summary += `- Post-Market Monitoring: ${sys.complianceStatus.hasPostMarketMonitoring ? "✅" : "❌"}\n`;
          if (sys.complianceStatus.complianceDeadline) {
            summary += `- **Deadline:** ${sys.complianceStatus.complianceDeadline}\n`;
          }
          if (sys.complianceStatus.estimatedComplianceEffort) {
            summary += `- **Estimated Effort:** ${sys.complianceStatus.estimatedComplianceEffort}\n`;
          }
          summary += `\n`;
          
          // Regulatory References
          if (sys.riskClassification.regulatoryReferences?.length > 0) {
            summary += `**Applicable Articles:** ${sys.riskClassification.regulatoryReferences.join(", ")}\n\n`;
      }
      
          summary += `---\n\n`;
        }
      }
      
      // ================== COMPLIANCE ASSESSMENT ==================
      if (assessData?.assessment) {
        const assess = assessData.assessment;
        
        summary += `## 📊 Compliance Assessment Results\n\n`;
        
        // Score Card
        const scoreEmoji = assess.overallScore >= 80 ? "🟢" : assess.overallScore >= 60 ? "🟡" : assess.overallScore >= 40 ? "🟠" : "🔴";
        summary += `### Overall Score: ${scoreEmoji} ${assess.overallScore}/100\n`;
        summary += `**Risk Level:** ${assess.riskLevel}\n\n`;
        
        // Compliance by Article
        if (assess.complianceByArticle && Object.keys(assess.complianceByArticle).length > 0) {
          summary += `### Compliance by EU AI Act Article\n\n`;
          summary += `| Article | Status | Issues |\n`;
          summary += `|---------|--------|--------|\n`;
          for (const [article, statusData] of Object.entries(assess.complianceByArticle)) {
            const articleStatus = statusData as { compliant: boolean; gaps?: string[] };
            const icon = articleStatus.compliant ? "✅" : "❌";
            const issues = articleStatus.gaps?.length ? articleStatus.gaps.length + " gap(s)" : "None";
            summary += `| ${article} | ${icon} | ${issues} |\n`;
          }
          summary += `\n`;
        }
        
        // Gap Analysis
        if (assess.gaps && assess.gaps.length > 0) {
          summary += `### 🔍 Gap Analysis\n\n`;
          
          // Group by severity
          const critical = assess.gaps.filter((g: any) => g.severity === "CRITICAL");
          const high = assess.gaps.filter((g: any) => g.severity === "HIGH");
          const medium = assess.gaps.filter((g: any) => g.severity === "MEDIUM");
          const low = assess.gaps.filter((g: any) => g.severity === "LOW");
          
          if (critical.length > 0) {
            summary += `#### 🔴 Critical Gaps (${critical.length})\n\n`;
            for (const gap of critical) {
              summary += `**${gap.category}** - ${gap.articleReference || "General"}\n`;
              summary += `> ${gap.description}\n`;
              if (gap.currentState) summary += `> *Current:* ${gap.currentState}\n`;
              if (gap.requiredState) summary += `> *Required:* ${gap.requiredState}\n`;
              if (gap.deadline) summary += `> ⏰ Deadline: ${gap.deadline}\n`;
              summary += `\n`;
            }
          }
          
          if (high.length > 0) {
            summary += `#### 🟠 High Priority Gaps (${high.length})\n\n`;
            for (const gap of high) {
              summary += `**${gap.category}** - ${gap.articleReference || "General"}\n`;
              summary += `> ${gap.description}\n`;
              if (gap.deadline) summary += `> ⏰ Deadline: ${gap.deadline}\n`;
              summary += `\n`;
            }
          }
          
          if (medium.length > 0) {
            summary += `#### 🟡 Medium Priority Gaps (${medium.length})\n\n`;
            for (const gap of medium.slice(0, 5)) {
              summary += `- **${gap.category}:** ${gap.description}\n`;
          }
            if (medium.length > 5) {
              summary += `- *...and ${medium.length - 5} more medium-priority gaps*\n`;
            }
            summary += `\n`;
          }
          
          if (low.length > 0) {
            summary += `#### 🟢 Low Priority Gaps (${low.length})\n\n`;
            summary += `*${low.length} low-priority gaps identified - see detailed report*\n\n`;
        }
      }
      
        // Recommendations
        if (assess.recommendations && assess.recommendations.length > 0) {
          summary += `### 💡 Priority Recommendations\n\n`;
          
          // Sort by priority
          const sortedRecs = [...assess.recommendations].sort((a: any, b: any) => a.priority - b.priority);
          
          for (const rec of sortedRecs.slice(0, 5)) {
            summary += `#### ${rec.priority}. ${rec.title}\n`;
            summary += `*${rec.articleReference || "General Compliance"}*\n\n`;
            summary += `${rec.description}\n\n`;
            
            if (rec.implementationSteps && rec.implementationSteps.length > 0) {
              summary += `**Implementation Steps:**\n`;
              for (let i = 0; i < Math.min(rec.implementationSteps.length, 5); i++) {
                summary += `${i + 1}. ${rec.implementationSteps[i]}\n`;
              }
              summary += `\n`;
            }
            
            if (rec.estimatedEffort) {
              summary += `**Estimated Effort:** ${rec.estimatedEffort}\n`;
            }
            if (rec.expectedOutcome) {
              summary += `**Expected Outcome:** ${rec.expectedOutcome}\n`;
            }
            summary += `\n`;
          }
          
          if (sortedRecs.length > 5) {
            summary += `*...and ${sortedRecs.length - 5} additional recommendations*\n\n`;
          }
        }
      }
      
      // ================== KEY COMPLIANCE DEADLINES ==================
      if (aiData?.complianceDeadlines) {
        summary += `## 📅 Key Compliance Deadlines\n\n`;
        summary += `| Deadline | Requirement |\n`;
        summary += `|----------|-------------|\n`;
        summary += `| **February 2, 2025** | Prohibited AI practices ban (Article 5) |\n`;
        summary += `| **August 2, 2025** | GPAI model obligations (Article 53) |\n`;
        summary += `| **${aiData.complianceDeadlines.limitedRisk}** | Limited-risk transparency (Article 50) |\n`;
        summary += `| **${aiData.complianceDeadlines.highRisk}** | High-risk AI full compliance |\n`;
        summary += `\n`;
      }
      
      // ================== DOCUMENTATION TEMPLATES ==================
      if (assessData?.documentation) {
        const docs = assessData.documentation;
        summary += `## 📝 Generated Documentation Templates\n\n`;
        summary += `The following EU AI Act compliance documentation templates have been generated:\n\n`;
        
        const docList = [
          { name: "Risk Management System", field: "riskManagementTemplate", article: "Article 9" },
          { name: "Technical Documentation", field: "technicalDocumentation", article: "Article 11, Annex IV" },
          { name: "Conformity Assessment", field: "conformityAssessment", article: "Article 43" },
          { name: "Transparency Notice", field: "transparencyNotice", article: "Article 50" },
          { name: "Quality Management System", field: "qualityManagementSystem", article: "Article 17" },
          { name: "Human Oversight Procedure", field: "humanOversightProcedure", article: "Article 14" },
          { name: "Data Governance Policy", field: "dataGovernancePolicy", article: "Article 10" },
          { name: "Incident Reporting Procedure", field: "incidentReportingProcedure", article: "General" },
        ];
        
        summary += `| Document | Article Reference | Status |\n`;
        summary += `|----------|-------------------|--------|\n`;
        for (const doc of docList) {
          const hasDoc = (docs as any)[doc.field];
          summary += `| ${doc.name} | ${doc.article} | ${hasDoc ? "✅ Generated" : "⚪ Not generated"} |\n`;
        }
        summary += `\n`;
        
        // Show first template as example
        const firstTemplate = docs.riskManagementTemplate || docs.technicalDocumentation || docs.transparencyNotice;
        if (firstTemplate) {
          summary += `### 📄 Sample Template: Risk Management System (Article 9)\n\n`;
          summary += `<details>\n<summary>Click to expand template</summary>\n\n`;
          summary += `${firstTemplate.substring(0, 2000)}${firstTemplate.length > 2000 ? "\n\n*...template truncated for display...*" : ""}\n`;
          summary += `\n</details>\n\n`;
        }
      }
      
      // ================== AI REASONING ==================
      if (assessData?.reasoning) {
        summary += `## 🧠 Assessment Reasoning\n\n`;
        summary += `<details>\n<summary>Click to expand AI analysis reasoning</summary>\n\n`;
        summary += `${assessData.reasoning}\n`;
        summary += `\n</details>\n\n`;
      }
      
      // ================== FOOTER ==================
      const modelUsed = assessData?.metadata?.modelUsed || process.env.AI_MODEL || "Unknown";
      const modelDisplayName = modelUsed.includes("gpt") ? "OpenAI GPT-5" : 
                                modelUsed.includes("claude") ? "Anthropic Claude 4.5" : 
                                modelUsed.includes("grok") ? "xAI Grok-4" : modelUsed;
      
      summary += `---\n\n`;
      summary += `### ℹ️ About This Report\n\n`;
      summary += `This compliance report was generated using:\n`;
      summary += `- **Organization Discovery:** Tavily AI-powered research\n`;
      summary += `- **AI Systems Discovery:** Automated system classification per Annex III\n`;
      summary += `- **Compliance Assessment:** ${modelDisplayName} analysis against EU AI Act requirements\n\n`;
      summary += `*Report generated on ${new Date().toISOString()}*\n\n`;
      summary += `**Disclaimer:** This report is for informational purposes only and does not constitute legal advice. Consult with qualified legal professionals for official compliance guidance.\n`;
      
      // Stream the comprehensive summary
      for (const char of summary) {
        res.write(`data: ${JSON.stringify({ type: "text", content: char })}\n\n`);
      }
    }

    // Send final done message
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

  } catch (error) {
    console.error("Chat error:", error);
    
    // Try to send error via stream if headers already sent
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ 
        type: "error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
});

// Tool status endpoint
app.get("/api/tools", async (_req, res) => {
  try {
    const agent = createAgent();
    const tools = await agent.getTools();
    
    res.json({
      tools: tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
      })),
    });
  } catch (error) {
    console.error("Tools error:", error);
    res.status(500).json({ error: "Failed to fetch tools" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🇪🇺 EU AI Act Compliance Agent Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`✓ Tools API: http://localhost:${PORT}/api/tools`);
  console.log(`\n💡 Start Gradio UI: pnpm gradio`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
