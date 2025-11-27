# 🎯 Final Setup Guide - EU AI Act Compliance Suite

Complete setup guide for running both Track 1 (MCP Server) and Track 2 (AI Agent) of our hackathon submission.

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **pnpm 8+** installed (`pnpm --version`)
- [ ] **Python 3.9+** installed (`python3 --version`)
- [ ] **uv** installed (`uv --version`) - Fast Python package manager
- [ ] **Git** installed (`git --version`)
- [ ] **OpenAI API key** (get from https://platform.openai.com/)
- [ ] **Tavily API key** (optional, get from https://app.tavily.com)

---

## 🚀 Complete Installation

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd mcp-1st-birthday-ai-act

# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install all Node.js dependencies
pnpm install

# Install Python dependencies for agent
cd apps/eu-ai-act-agent
uv pip install -r requirements.txt
cd ../..
```

### Step 2: Configure Environment

Create `.env` file in the **workspace root**:

```bash
cat > .env << EOF
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Tavily API Key (optional, for enhanced research)
TAVILY_API_KEY=tvly-your-tavily-api-key-here

# Server Configuration
PORT=3001
EOF
```

Or copy from example:
```bash
cp .env.example .env
# Then edit .env with your API keys
```

### Step 3: Build Packages

```bash
# Build the MCP server (required for agent)
pnpm --filter @eu-ai-act/mcp-server build

# Build the agent
pnpm --filter @eu-ai-act/agent build
```

---

## 🎯 Track 1: MCP Server

### Standalone Usage

**Option A: Use with Claude Desktop**

1. Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "eu-ai-act": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-1st-birthday-ai-act/packages/eu-ai-act-mcp/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key",
        "TAVILY_API_KEY": "tvly-your-key"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. Look for 🔌 icon with 3 tools:
   - `discover_organization`
   - `discover_ai_services`
   - `assess_compliance`

**Option B: Run as Standalone Server**

```bash
cd packages/eu-ai-act-mcp
pnpm dev
```

### Testing MCP Tools

In Claude Desktop:
```
User: Discover the organization profile for OpenAI

Claude: [Uses discover_organization tool]
        [Returns organization profile with sector, AI maturity, compliance context]
```

---

## 🤖 Track 2: AI Agent with Gradio UI

### Quick Start

**Option A: Automatic Startup** (easiest)

```bash
cd apps/eu-ai-act-agent
chmod +x start.sh
./start.sh
```

The script will:
- ✓ Check prerequisites
- ✓ Install Python dependencies if needed
- ✓ Build MCP server if needed
- ✓ Start API server (port 3001)
- ✓ Start Gradio UI (port 7860)

**Open**: http://localhost:7860

**Option B: Manual Startup** (two terminals)

Terminal 1 - API Server:
```bash
cd apps/eu-ai-act-agent
pnpm dev
```

Terminal 2 - Gradio UI:
```bash
cd apps/eu-ai-act-agent
uv run src/gradio_app.py
```

**Option C: Production Mode**

```bash
cd apps/eu-ai-act-agent
pnpm build
pnpm start  # Terminal 1
uv run src/gradio_app.py  # Terminal 2
```

---

## 🧪 Testing the Setup

### 1. Test API Server

```bash
# Health check
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","service":"EU AI Act Compliance Agent","version":"0.1.0"}

# List available tools
curl http://localhost:3001/api/tools

# Expected response:
# {"tools":[{"name":"discover_organization",...},...]}

# Test chat endpoint
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the EU AI Act?","history":[]}'

# Expected: Streaming response with EU AI Act explanation
```

### 2. Test Gradio UI

1. Open http://localhost:7860
2. Check API status indicator (should show ✅)
3. Try example query: "What is the EU AI Act?"
4. Should see streaming response in real-time

### 3. Test Tool Integration

In Gradio UI, try:
```
"Analyze OpenAI's EU AI Act compliance"
```

Expected workflow:
1. Agent calls `discover_organization("OpenAI")`
2. Agent calls `discover_ai_services(orgContext)`
3. Agent calls `assess_compliance(...)`
4. Agent synthesizes and displays comprehensive analysis

---

## 📊 Project Structure Overview

```
mcp-1st-birthday-ai-act/
├── packages/
│   └── eu-ai-act-mcp/          # Track 1: MCP Server
│       ├── src/
│       │   ├── index.ts        # MCP server entry
│       │   ├── tools/          # 3 compliance tools
│       │   ├── types/          # TypeScript types
│       │   └── schemas/        # Zod schemas
│       └── dist/               # Built output
│
├── apps/
│   └── eu-ai-act-agent/        # Track 2: AI Agent
│       ├── src/
│       │   ├── server.ts       # Express API
│       │   ├── gradio_app.py   # Gradio UI
│       │   └── agent/          # Vercel AI SDK v5
│       ├── README.md           # Agent documentation
│       ├── QUICKSTART.md       # Quick start guide
│       ├── DEPLOYMENT.md       # Deployment guide
│       ├── ARCHITECTURE.md     # Technical details
│       ├── EXAMPLES.md         # Usage examples
│       └── API.md              # API reference
│
├── .env                        # Environment variables
├── README.md                   # Main project README
├── AGENT_IMPLEMENTATION.md     # Agent implementation summary
└── FINAL_SETUP_GUIDE.md        # This file
```

---

## 🎓 Usage Examples

### Example 1: Simple Question
```
User: What is the EU AI Act?

Agent: Provides comprehensive explanation with key points
```

### Example 2: Organization Analysis
```
User: Discover and analyze Anthropic's compliance status

Agent: 
1. Researches Anthropic via Tavily
2. Discovers their AI systems
3. Assesses compliance requirements
4. Provides detailed report
```

### Example 3: Risk Classification
```
User: Is a facial recognition system for law enforcement high-risk?

Agent: 
- Yes, HIGH RISK per Annex III, Section 6(e)
- Lists all compliance requirements
- Explains timeline and obligations
```

### Example 4: Documentation Generation
```
User: Generate compliance documentation for our recommendation engine

Agent:
1. Classifies system risk level
2. Generates templates:
   - Risk assessment
   - Technical documentation
   - Transparency notice
3. Provides download options
```

---

## 🛠️ Development Workflow

### Working on MCP Server

```bash
cd packages/eu-ai-act-mcp

# Watch mode (auto-rebuild on changes)
pnpm dev

# Build for production
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix
```

### Working on Agent

```bash
cd apps/eu-ai-act-agent

# API server watch mode
pnpm dev

# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Working on Gradio UI

```bash
cd apps/eu-ai-act-agent

# Run with auto-reload
uv run src/gradio_app.py

# Install new dependencies
uv pip install <package>
uv pip freeze > requirements.txt
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to API server"

**Solution:**
```bash
# Check if API is running
curl http://localhost:3001/health

# If not, start it
cd apps/eu-ai-act-agent
pnpm dev
```

### Issue: "OpenAI API error"

**Solution:**
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Check .env file
cat .env | grep OPENAI_API_KEY

# Test API key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Reinstall dependencies
pnpm install

# Rebuild MCP server
pnpm --filter @eu-ai-act/mcp-server build

# Rebuild agent
pnpm --filter @eu-ai-act/agent build
```

### Issue: "Python package not found"

**Solution:**
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
cd apps/eu-ai-act-agent
uv pip install -r requirements.txt
```

### Issue: "Port already in use"

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001
# Kill it: kill -9 <PID>

# Find process using port 7860
lsof -i :7860
# Kill it: kill -9 <PID>

# Or use different ports
PORT=3002 pnpm dev  # API
# Edit gradio_app.py: server_port=7861 and run with: uv run src/gradio_app.py
```

### Issue: Build fails with TypeScript errors

**Solution:**
```bash
# Clean and rebuild
cd apps/eu-ai-act-agent
rm -rf dist node_modules
pnpm install
pnpm --filter @eu-ai-act/mcp-server build
pnpm build
```

---

## 🚢 Deployment

See detailed deployment guides:

- **Agent**: `apps/eu-ai-act-agent/DEPLOYMENT.md`
- **Vercel** (API): https://vercel.com/docs
- **Hugging Face Spaces** (Gradio): https://huggingface.co/docs/hub/spaces

Quick deployment:
```bash
# Vercel (API)
cd apps/eu-ai-act-agent
vercel --prod

# Hugging Face Spaces (Gradio)
# Push to HF repository
git remote add hf https://huggingface.co/spaces/<username>/<space-name>
git push hf main
```

---

## 📚 Documentation

| Document                                             | Description         |
| ---------------------------------------------------- | ------------------- |
| [Main README](README.md)                             | Project overview    |
| [Agent README](apps/eu-ai-act-agent/README.md)       | Agent documentation |
| [Quick Start](apps/eu-ai-act-agent/QUICKSTART.md)    | 5-minute setup      |
| [Architecture](apps/eu-ai-act-agent/ARCHITECTURE.md) | Technical details   |
| [Examples](apps/eu-ai-act-agent/EXAMPLES.md)         | Usage examples      |
| [API Reference](apps/eu-ai-act-agent/API.md)         | API docs            |
| [Deployment](apps/eu-ai-act-agent/DEPLOYMENT.md)     | Production setup    |

---

## 🎉 You're All Set!

### Track 1 (MCP Server)
✅ Built and ready to use with Claude Desktop or standalone

### Track 2 (AI Agent)
✅ API server running on http://localhost:3001
✅ Gradio UI running on http://localhost:7860

### Next Steps
1. Open http://localhost:7860
2. Try example queries
3. Explore compliance analysis
4. Generate documentation
5. Check out the full documentation

---

## 🆘 Getting Help

- 📖 **Documentation**: See all markdown files in `apps/eu-ai-act-agent/`
- 🐛 **Issues**: Open a GitHub issue
- 💬 **Questions**: Check GitHub Discussions
- 📧 **Contact**: See package.json for maintainer info

---

## 📊 Quick Reference

### Important URLs
- **Gradio UI**: http://localhost:7860
- **API Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Tools API**: http://localhost:3001/api/tools

### Important Commands
```bash
# Start everything
cd apps/eu-ai-act-agent && ./start.sh

# Build MCP server
pnpm --filter @eu-ai-act/mcp-server build

# Build agent
pnpm --filter @eu-ai-act/agent build

# Install all dependencies
pnpm install

# Check API health
curl http://localhost:3001/health
```

### Important Files
- `.env` - API keys and configuration
- `apps/eu-ai-act-agent/start.sh` - Startup script
- `packages/eu-ai-act-mcp/dist/index.js` - MCP server executable

---

<div align="center">

## 🎂 MCP 1st Birthday Hackathon

**Track 1**: MCP Server ✅  
**Track 2**: AI Agent ✅

**Made with ❤️ for AI compliance**

</div>

