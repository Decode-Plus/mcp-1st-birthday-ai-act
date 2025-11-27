# 🚀 Quick Start Guide - EU AI Act MCP Server

Get up and running with the EU AI Act compliance MCP server in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Git installed

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/your-org/mcp-1st-birthday-ai-act.git
cd mcp-1st-birthday-ai-act

# Install dependencies (only for the MCP server packages)
pnpm install --filter @eu-ai-act/mcp-server --filter @eu-ai-act/test-agent

# Build the MCP server
pnpm --filter @eu-ai-act/mcp-server build
```

## Step 2: Test It! (1 minute)

```bash
# Run the test agent
pnpm --filter @eu-ai-act/test-agent dev
```

You should see output like this:

```
🚀 Starting EU AI Act MCP Server Test Agent

✅ Connected to MCP Server

📋 Test 1: Listing available tools...
Found 2 tools:
  - discover_organization
  - discover_ai_services

🏢 Test 2: Discovering organization...
Organization Profile:
  Name: Acme AI Solutions GmbH
  Sector: Technology
  Size: SME
  ...

✅ All tests completed successfully!
```

## Step 3: Use with Claude Desktop (2 minutes)

### Option A: Using the built package

1. Find your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add this configuration:

```json
{
  "mcpServers": {
    "eu-ai-act": {
      "command": "node",
      "args": ["/FULL/PATH/TO/packages/eu-ai-act-mcp/dist/index.js"]
    }
  }
}
```

**Important:** Replace `/FULL/PATH/TO/` with the actual path to your cloned repository!

### Option B: Using tsx for development

```json
{
  "mcpServers": {
    "eu-ai-act": {
      "command": "npx",
      "args": ["tsx", "/FULL/PATH/TO/packages/eu-ai-act-mcp/src/index.ts"]
    }
  }
}
```

3. Restart Claude Desktop

4. Look for 🔨 icon in Claude Desktop - it indicates MCP tools are available!

## Step 4: Try It Out in Claude!

Start a conversation in Claude Desktop:

```
You: Can you discover my organization "Acme AI Solutions GmbH" with domain acme-ai.de?

Claude: I'll use the discover_organization tool to profile your organization...
[Uses the MCP tool]
Based on the discovery, your organization is classified as...
```

Then:

```
You: Now discover the AI systems we have

Claude: I'll scan for AI systems...
[Uses discover_ai_services tool]
Found 2 AI systems:
1. Recruitment AI Assistant (High Risk)
2. Customer Support Chatbot (Limited Risk)
...
```

## Common Use Cases

### 1. Organization Profiling

```
Prompt: "Analyze 'TechCorp GmbH' for EU AI Act compliance"
```

Claude will:
- Discover organization details
- Identify applicable regulatory frameworks
- List compliance deadlines
- Assess AI maturity level

### 2. AI System Inventory

```
Prompt: "What AI systems do we have and what are their compliance requirements?"
```

Claude will:
- Discover all AI systems
- Classify by risk (High, Limited, Minimal, Unacceptable)
- Identify compliance gaps
- List required documentation

### 3. Compliance Gap Analysis

```
Prompt: "Which of our AI systems need immediate attention for EU AI Act compliance?"
```

Claude will:
- Filter high-risk and non-compliant systems
- Show specific gaps with Article references
- Prioritize by risk score

## Troubleshooting

### "Command not found" error

Make sure you're using the full absolute path in your config, not a relative path.

**Bad:**
```json
"args": ["./packages/eu-ai-act-mcp/dist/index.js"]
```

**Good:**
```json
"args": ["/Users/username/mcp-1st-birthday-ai-act/packages/eu-ai-act-mcp/dist/index.js"]
```

### "Cannot find module" error

Run the build step again:
```bash
cd packages/eu-ai-act-mcp
pnpm build
```

### Claude doesn't show the 🔨 icon

1. Check your config file syntax (must be valid JSON)
2. Restart Claude Desktop completely
3. Check Claude Desktop logs for errors
4. Verify the path in the config is correct

### Test agent fails

Make sure you've installed dependencies:
```bash
pnpm install --filter @eu-ai-act/mcp-server --filter @eu-ai-act/test-agent
```

## Next Steps

### For Development

1. **Modify the tools** - Edit files in `packages/eu-ai-act-mcp/src/tools/`
2. **Add new schemas** - Update `packages/eu-ai-act-mcp/src/types/` and `src/schemas/`
3. **Rebuild:** `pnpm --filter @eu-ai-act/mcp-server build`
4. **Test:** `pnpm --filter @eu-ai-act/test-agent dev`

### For Production Use

1. **Integrate real research API** - Replace mock data in `discover-organization.ts`
2. **Add infrastructure scanning** - Implement actual system discovery
3. **Deploy as HTTP service** - Use the ChatGPT Apps SDK layer
4. **Add authentication** - Implement OAuth for secure access

## Key Files Reference

| File | Purpose |
|------|---------|
| `packages/eu-ai-act-mcp/src/index.ts` | Main MCP server entry point |
| `packages/eu-ai-act-mcp/src/tools/discover-organization.ts` | Organization discovery logic |
| `packages/eu-ai-act-mcp/src/tools/discover-ai-services.ts` | AI systems discovery logic |
| `packages/eu-ai-act-mcp/src/types/index.ts` | TypeScript type definitions |
| `packages/eu-ai-act-mcp/src/schemas/index.ts` | Zod validation schemas |
| `packages/test-agent/src/index.ts` | Test suite |

## Documentation

- **Full Documentation:** See `packages/eu-ai-act-mcp/README.md`
- **Implementation Details:** See `IMPLEMENTATION.md`
- **Main README:** See `README.md`

## Get Help

Found an issue? Have questions?

1. Check `IMPLEMENTATION.md` for architecture details
2. Review test output in `packages/test-agent/`
3. Check Claude Desktop logs for errors
4. Open an issue on GitHub

## What's Next?

Now that you have it running, you can:

1. ✅ Use it with Claude Desktop for organization analysis
2. ✅ Discover and classify AI systems
3. ✅ Get compliance gap reports with EU AI Act article references
4. 📚 Read the full README for advanced usage
5. 🔧 Extend it with your own tools
6. 🚀 Deploy it as a ChatGPT App

---

**Happy Compliance! 🇪🇺**

Built for the MCP 1st Birthday Hackathon 🎂

