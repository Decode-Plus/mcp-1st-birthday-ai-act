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

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send user message confirmation immediately
    res.write(`data: ${JSON.stringify({ type: "user_message", content: message })}\n\n`);

    // Create agent instance
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
    
    // Check if this looks like an organization analysis that needs assess_compliance
    const hasOrgTools = toolsCalled.has("discover_organization") || toolsCalled.has("discover_ai_services");
    const needsAssessment = hasOrgTools && !toolsCalled.has("assess_compliance");
    
    // If organization tools were called but assess_compliance wasn't, make a follow-up request
    if (needsAssessment && !hasText) {
      console.log("⚠️ Organization tools called but assess_compliance missing. Making follow-up request...");
      
      // Build context from tool results
      const orgContext = toolResults.get("discover_organization");
      const aiServicesContext = toolResults.get("discover_ai_services");
      
      // Create a more explicit follow-up message that includes the context
      const contextSummary = `
Tool results received:
- discover_organization: Found ${orgContext?.organization?.name || "organization"} (${orgContext?.organization?.sector || "unknown sector"})
- discover_ai_services: Found ${aiServicesContext?.systems?.length || 0} AI systems

Now call assess_compliance with these parameters:
- organizationContext: Use the discover_organization result
- aiServicesContext: Use the discover_ai_services result  
- generateDocumentation: true

After assess_compliance returns, provide a human-readable summary of the compliance assessment.`;
      
      const followUpMessages = [
        ...messages,
        {
          role: "assistant",
          content: `I have gathered the organization profile and discovered ${aiServicesContext?.systems?.length || 0} AI systems. Now I will call assess_compliance to generate the full compliance report.`,
        },
        {
          role: "user", 
          content: contextSummary,
        },
      ];
      
      console.log("Making follow-up request to call assess_compliance...");
      
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
    
    // If still no text response, generate a fallback based on available tool results
    if (!hasTextNow && toolResults.size > 0) {
      console.log("Generating fallback summary from tool results...");
      
      // Create a summary from available data
      const orgData = toolResults.get("discover_organization");
      const aiData = toolResults.get("discover_ai_services");
      const assessData = toolResults.get("assess_compliance");
      
      let summary = "\n\n---\n\n";
      
      if (orgData?.organization) {
        summary += `## 📊 EU AI Act Compliance Report for ${orgData.organization.name}\n\n`;
        summary += `### Organization Profile\n`;
        summary += `- **Sector:** ${orgData.organization.sector}\n`;
        summary += `- **Size:** ${orgData.organization.size}\n`;
        summary += `- **EU Presence:** ${orgData.organization.euPresence ? "Yes" : "No"}\n`;
        summary += `- **AI Maturity:** ${orgData.organization.aiMaturityLevel}\n\n`;
      }
      
      if (aiData?.systems) {
        summary += `### AI Systems Analyzed\n`;
        for (const sys of aiData.systems) {
          summary += `- **${sys.system.name}**\n`;
          summary += `  - Risk Category: ${sys.riskClassification.category}\n`;
          summary += `  - Risk Score: ${sys.riskClassification.riskScore}/100\n`;
          summary += `  - Conformity Assessment: ${sys.complianceStatus.conformityAssessmentStatus}\n`;
        }
        summary += "\n";
        
        summary += `### Risk Summary\n`;
        summary += `- High-Risk Systems: ${aiData.riskSummary.highRiskCount}\n`;
        summary += `- Limited-Risk Systems: ${aiData.riskSummary.limitedRiskCount}\n`;
        summary += `- Minimal-Risk Systems: ${aiData.riskSummary.minimalRiskCount}\n\n`;
      }
      
      if (assessData?.assessment) {
        summary += `### Compliance Assessment\n`;
        summary += `- **Overall Score:** ${assessData.assessment.overallScore}/100\n`;
        summary += `- **Risk Level:** ${assessData.assessment.riskLevel}\n\n`;
        
        if (assessData.assessment.gaps?.length > 0) {
          summary += `### Key Gaps\n`;
          for (const gap of assessData.assessment.gaps.slice(0, 5)) {
            summary += `- ${gap.description}\n`;
          }
          summary += "\n";
        }
      }
      
      // Add compliance deadlines
      if (aiData?.complianceDeadlines) {
        summary += `### Key Compliance Deadlines\n`;
        summary += `- **High-Risk Systems:** ${aiData.complianceDeadlines.highRisk}\n`;
        summary += `- **Limited-Risk Systems:** ${aiData.complianceDeadlines.limitedRisk}\n`;
        summary += `- **GPAI Models:** ${aiData.complianceDeadlines.generalGPAI}\n\n`;
      }
      
      // Stream the fallback summary
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
