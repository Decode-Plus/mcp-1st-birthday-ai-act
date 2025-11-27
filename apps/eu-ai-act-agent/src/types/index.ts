/**
 * Type definitions for EU AI Act Compliance Agent
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  type: "text" | "tool_call" | "result" | "done" | "error";
  content?: string;
  tool?: string;
  data?: any;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
}

// Re-export types from MCP package
// @ts-ignore - These will be available at runtime after building
export type {
  OrganizationProfile,
  AIServiceDiscovery,
  ComplianceAssessment,
} from "../../../eu-ai-act-mcp/dist/types/index.js";

