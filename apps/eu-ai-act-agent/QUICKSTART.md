# 🚀 Quick Start Guide

Get the EU AI Act Compliance Agent running in under 5 minutes!

## ⚡ Fast Track

```bash
# 1. Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Set your OpenAI API key
export OPENAI_API_KEY="sk-your-key-here"

# 3. Install dependencies (from workspace root)
cd /path/to/mcp-1st-birthday-ai-act
pnpm install

# 4. Install Python packages
cd apps/eu-ai-act-agent
uv pip install -r requirements.txt

# 5. Start everything (automatic!)
chmod +x start.sh
./start.sh
```

That's it! Open http://localhost:7860 🎉

## 📋 Step-by-Step Instructions

### 1. Prerequisites

Install these first:
- **Node.js 18+**: https://nodejs.org/
- **pnpm**: `npm install -g pnpm`
- **Python 3.9+**: https://www.python.org/
- **uv**: https://docs.astral.sh/uv/ (fast Python package manager)
- **Git**: https://git-scm.com/

### 2. Get API Keys

**OpenAI (Required)**:
1. Sign up at https://platform.openai.com/
2. Go to API Keys section
3. Create a new key
4. Copy it (starts with `sk-`)

**Tavily (Optional but recommended)**:
1. Sign up at https://app.tavily.com
2. Get your API key (1,000 free credits/month)
3. Copy it (starts with `tvly-`)

### 3. Clone & Setup

```bash
# Clone the repository
git clone <repo-url>
cd mcp-1st-birthday-ai-act

# Install Node.js dependencies
pnpm install

# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Go to agent directory
cd apps/eu-ai-act-agent

# Install Python dependencies
uv pip install -r requirements.txt
```

### 4. Configure Environment

Create `.env` file in the **workspace root** (not in apps/eu-ai-act-agent):

```bash
# Go back to workspace root
cd ../..

# Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk-your-openai-api-key-here
TAVILY_API_KEY=tvly-your-tavily-api-key-here
PORT=3001
EOF
```

Or copy from example:
```bash
cp .env.example .env
# Then edit .env with your keys
```

### 5. Build MCP Server

The agent needs the MCP server tools:

```bash
# From workspace root
pnpm --filter @eu-ai-act/mcp-server build
```

### 6. Start the Agent

**Option A: Use startup script** (easiest)
```bash
cd apps/eu-ai-act-agent
chmod +x start.sh
./start.sh
```

**Option B: Manual start** (two terminals)

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

**Option C: Use workspace commands**
```bash
# Terminal 1
pnpm --filter @eu-ai-act/agent dev

# Terminal 2
pnpm --filter @eu-ai-act/agent gradio
```

### 7. Open the UI

Navigate to http://localhost:7860 in your browser!

## 🎯 Try It Out

### Example 1: General Question
```
You: What is the EU AI Act?
```

The agent will explain the regulation with key details.

### Example 2: Organization Analysis
```
You: Analyze OpenAI's EU AI Act compliance
```

The agent will:
1. Discover OpenAI's organization profile
2. Identify their AI systems
3. Assess compliance status
4. Provide recommendations

### Example 3: Risk Classification
```
You: Is a recruitment screening AI high-risk?
```

The agent will classify it per Annex III and explain requirements.

### Example 4: Documentation
```
You: Generate compliance documentation for a chatbot
```

The agent will create:
- Risk assessment
- Technical documentation
- Transparency notice
- Compliance checklist

## 🔧 Troubleshooting

### "Cannot connect to API server"

**Solution**:
```bash
# Check if API is running
curl http://localhost:3001/health

# If not, start it:
cd apps/eu-ai-act-agent
pnpm dev
```

### "OpenAI API error"

**Solution**:
```bash
# Verify your API key is set
echo $OPENAI_API_KEY

# Or check .env file
cat ../../.env | grep OPENAI_API_KEY

# Make sure it's valid at https://platform.openai.com/api-keys
```

### "Module not found" errors

**Solution**:
```bash
# Reinstall Node.js dependencies
cd /path/to/workspace/root
pnpm install

# Rebuild MCP server
pnpm --filter @eu-ai-act/mcp-server build

# Reinstall Python packages
cd apps/eu-ai-act-agent
pip3 install -r requirements.txt
```

### Port already in use

**Solution**:
```bash
# API Server (port 3001)
PORT=3002 pnpm dev

# Gradio (port 7860) - edit src/gradio_app.py
# Change server_port=7860 to server_port=7861
```

### Python package issues

**Solution**:
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies with uv
uv pip install -r requirements.txt

# Or create and use a virtual environment with uv
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

## 📊 What's Included

### Three MCP Tools

1. **discover_organization** - Profile organizations
   - Company research via Tavily
   - AI maturity assessment
   - Regulatory context

2. **discover_ai_services** - Catalog AI systems
   - Risk classification (Unacceptable/High/Limited/Minimal)
   - Compliance status
   - Gap analysis

3. **assess_compliance** - Generate documentation
   - Risk management templates
   - Technical documentation
   - Conformity assessments
   - Transparency notices

### Intelligent Features

- **Natural Language**: Chat in plain English
- **Contextual**: Remembers conversation history
- **Multi-Step**: Automatically chains tools
- **Streaming**: Real-time responses
- **Export**: Download generated documents

## 🎓 Learning Path

1. **Start Simple**: Ask "What is the EU AI Act?"
2. **Try Classification**: "Is [your AI] high-risk?"
3. **Explore Tools**: "Discover [company name]"
4. **Generate Docs**: "Create compliance documentation"
5. **Go Deep**: Ask about specific Articles or requirements

## 📚 Next Steps

- **Read the full README**: `cat README.md`
- **Check deployment guide**: `cat DEPLOYMENT.md`
- **Explore the MCP tools**: See `../../packages/eu-ai-act-mcp/README.md`
- **Learn about Vercel AI SDK**: https://ai-sdk.dev/docs
- **Understand Gradio**: https://gradio.app/guides/quickstart

## 💡 Tips

1. **Be specific**: "Analyze compliance for our recruitment AI" works better than "check compliance"
2. **Use context**: Mention company names, AI system types, industries
3. **Ask follow-ups**: The agent maintains conversation context
4. **Request docs**: Ask for specific templates or reports
5. **Cite articles**: Reference specific AI Act articles for detailed info

## 🆘 Getting Help

- 📖 **Full Documentation**: See README.md
- 🐛 **Found a bug?**: Open a GitHub issue
- 💬 **Questions?**: Check GitHub Discussions
- 📧 **Contact**: See package.json for maintainer info

## 🎯 Pro Tips

### For Developers
- Use `pnpm dev` for hot reload during development
- Check `/api/tools` endpoint to see available tools
- API logs show tool execution details
- Gradio supports custom CSS theming

### For Compliance Teams
- Start with organization discovery
- Document all AI systems systematically
- Focus on high-risk systems first
- Export and archive assessment reports
- Review compliance quarterly

### For Organizations
- Use as part of compliance workflow
- Train teams on EU AI Act basics
- Generate documentation templates
- Track compliance progress
- Prepare for audits

---

**Ready to go?** Open http://localhost:7860 and start chatting! 🚀


