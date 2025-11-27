/**
 * ChatGPT Apps SDK Compatibility Layer
 * Provides HTTP/SSE transport for ChatGPT Apps integration
 * 
 * Based on OpenAI Apps SDK documentation:
 * https://developers.openai.com/apps-sdk/
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";

/**
 * ChatGPT App Configuration
 */
export interface ChatGPTAppConfig {
  /** App name for ChatGPT */
  name: string;
  
  /** App description */
  description: string;
  
  /** App version */
  version: string;
  
  /** Base URL for the app (for OAuth/webhooks) */
  baseUrl?: string;
  
  /** OAuth configuration if needed */
  oauth?: {
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
}

/**
 * Create ChatGPT App Server
 * 
 * This creates an MCP server that can be used with ChatGPT Apps SDK
 * via HTTP/SSE transport instead of stdio.
 * 
 * Usage with Express:
 * ```typescript
 * import express from 'express';
 * import { createChatGPTAppServer } from './chatgpt-app.js';
 * 
 * const app = express();
 * const mcpServer = createChatGPTAppServer({
 *   name: "EU AI Act Compliance",
 *   description: "EU AI Act compliance tools",
 *   version: "0.1.0"
 * });
 * 
 * // MCP endpoint
 * app.get('/mcp', (req, res) => handleMCPEndpoint(mcpServer, req, res));
 * app.post('/mcp/messages', (req, res) => handleMCPMessages(mcpServer, req, res));
 * 
 * app.listen(3000);
 * ```
 */
export function createChatGPTAppServer(config: ChatGPTAppConfig): McpServer {
  const server = new McpServer({
    name: config.name,
    version: config.version,
  });

  return server;
}

/**
 * Handle MCP endpoint for ChatGPT Apps
 * GET /mcp - Returns MCP server capabilities
 */
export async function handleMCPEndpoint(
  server: McpServer,
  config: ChatGPTAppConfig,
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Return MCP server metadata
    res.json({
      name: config.name,
      version: config.version,
      protocol: "mcp",
      transports: ["sse"],
    });
  } catch (error) {
    console.error("Error handling MCP endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle MCP messages for ChatGPT Apps
 * POST /mcp/messages - Handles tool calls via SSE
 */
export async function handleMCPMessages(
  server: McpServer,
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Set up Streamable HTTP transport
    // @ts-expect-error - StreamableHTTPServerTransport signature varies by SDK version
    const transport = new StreamableHTTPServerTransport(res);
    
    // Connect server to transport
    await server.connect(transport);

    // Handle client disconnect
    req.on("close", () => {
      console.log("Client disconnected from MCP");
    });
  } catch (error) {
    console.error("Error handling MCP messages:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * ChatGPT App Manifest Generator
 * Generates the app manifest required by ChatGPT Apps SDK
 */
export function generateChatGPTAppManifest(
  config: ChatGPTAppConfig,
  mcpEndpoint: string
): object {
  return {
    name: config.name,
    description: config.description,
    version: config.version,
    mcp: {
      endpoint: mcpEndpoint,
      transport: "sse",
    },
    authentication: config.oauth
      ? {
          type: "oauth2",
          oauth2: {
            clientId: config.oauth.clientId,
            authorizationUrl: config.oauth.authorizationUrl,
            tokenUrl: config.oauth.tokenUrl,
            scopes: config.oauth.scopes,
          },
        }
      : {
          type: "none",
        },
    privacy: {
      policyUrl: config.baseUrl ? `${config.baseUrl}/privacy` : undefined,
      termsUrl: config.baseUrl ? `${config.baseUrl}/terms` : undefined,
    },
  };
}

