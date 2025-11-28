#!/usr/bin/env node

/**
 * EU AI Act Compliance Agent Server
 * Express API with Vercel AI SDK v5 agent
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
  origin: ["http://localhost:7860", "http://127.0.0.1:7860"], // Gradio default ports
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

// Main chat endpoint
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

    // Stream the response
    const result = await agent.streamText({
      messages,
    });

    // Send stream chunks
    for await (const chunk of result.textStream) {
      res.write(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`);
    }

    // Send final message
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Tool status endpoint
app.get("/api/tools", async (_req, res) => {
  try {
    const agent = createAgent();
    const tools = agent.getTools();
    
    res.json({
      tools: tools.map(tool => ({
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

