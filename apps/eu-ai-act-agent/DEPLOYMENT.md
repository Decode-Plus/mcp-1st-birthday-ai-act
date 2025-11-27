# 🚀 Deployment Guide

## Prerequisites

### System Requirements
- **Node.js** 18+ and pnpm 8+
- **Python** 3.9+ with uv (fast package manager)
- **Git** for cloning the repository

### API Keys
1. **OpenAI API Key** (required)
   - Sign up at https://platform.openai.com/
   - Create an API key
   - Set as `OPENAI_API_KEY` environment variable

2. **Tavily API Key** (optional, recommended)
   - Sign up at https://app.tavily.com
   - Get 1,000 free credits/month
   - Set as `TAVILY_API_KEY` environment variable

## Local Development

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd mcp-1st-birthday-ai-act

# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Node.js dependencies (from workspace root)
pnpm install

# Install Python dependencies
cd apps/eu-ai-act-agent
uv pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file in the workspace root:

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key

# Optional (for enhanced organization discovery)
TAVILY_API_KEY=tvly-your-tavily-api-key

# Server configuration
PORT=3001
```

### 3. Build MCP Server

The agent depends on the MCP server tools, so build it first:

```bash
# From workspace root
pnpm --filter @eu-ai-act/mcp-server build
```

### 4. Start Development Servers

**Option A: Run both servers** (recommended)

Terminal 1 - API Server:
```bash
cd apps/eu-ai-act-agent
pnpm dev
```

Terminal 2 - Gradio UI:
```bash
cd apps/eu-ai-act-agent
pnpm gradio
# or: uv run src/gradio_app.py
```

**Option B: Use workspace commands**
```bash
# Terminal 1
pnpm --filter @eu-ai-act/agent dev

# Terminal 2
pnpm --filter @eu-ai-act/agent gradio
```

### 5. Access the Application

- **Gradio UI**: http://localhost:7860
- **API Server**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Production Deployment

### Option 1: Vercel (API) + Hugging Face Spaces (Gradio)

**Deploy API Server to Vercel:**

1. Create `vercel.json` in `apps/eu-ai-act-agent/`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ],
  "env": {
    "OPENAI_API_KEY": "@openai-api-key",
    "TAVILY_API_KEY": "@tavily-api-key"
  }
}
```

2. Deploy:
```bash
cd apps/eu-ai-act-agent
pnpm build
vercel --prod
```

**Deploy Gradio to Hugging Face Spaces:**

1. Create a new Space at https://huggingface.co/spaces
2. Choose Gradio SDK
3. Push your code:
```bash
git remote add hf https://huggingface.co/spaces/<username>/<space-name>
git push hf main
```

4. Set environment variables in Space settings:
   - `API_URL=https://your-vercel-app.vercel.app`

### Option 2: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
    restart: unless-stopped

  gradio:
    build:
      context: .
      dockerfile: Dockerfile.gradio
    ports:
      - "7860:7860"
    environment:
      - API_URL=http://api:3001
    depends_on:
      - api
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

### Option 3: Railway / Render

Both platforms support Node.js and Python apps:

1. **API Server**:
   - Build command: `pnpm build`
   - Start command: `pnpm start`
   - Add environment variables

2. **Gradio App**:
   - Build command: `curl -LsSf https://astral.sh/uv/install.sh | sh && uv pip install -r requirements.txt`
   - Start command: `uv run src/gradio_app.py`
   - Set `API_URL` to your API server URL

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key for GPT-4 (used by agent and assess_compliance tool)

### Optional
- `TAVILY_API_KEY` - Tavily API key for enhanced organization research
- `PORT` - API server port (default: 3001)
- `API_URL` - Full URL to API server (for Gradio, default: http://localhost:3001)

## Troubleshooting

### API Server Issues

**Problem**: Server won't start
```bash
# Check Node.js version
node --version  # Should be 18+

# Rebuild dependencies
pnpm install
pnpm --filter @eu-ai-act/mcp-server build
pnpm --filter @eu-ai-act/agent build
```

**Problem**: Tools not working
```bash
# Verify MCP server is built
ls packages/eu-ai-act-mcp/dist/

# Check environment variables
echo $OPENAI_API_KEY
```

### Gradio Issues

**Problem**: Can't connect to API
- Verify API server is running: `curl http://localhost:3001/health`
- Check `API_URL` in environment or `src/gradio_app.py`

**Problem**: Python dependencies missing
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv pip install -r requirements.txt
```

### General Issues

**Problem**: CORS errors
- Ensure Gradio runs on port 7860 (default)
- Check CORS settings in `src/server.ts`

**Problem**: Rate limits
- OpenAI has rate limits based on your plan
- Consider implementing request queuing or caching

## Performance Optimization

1. **Enable Caching**: Add Redis for caching organization/system discoveries
2. **Use Streaming**: Already enabled for real-time responses
3. **Optimize Tools**: Cache Tavily research results
4. **Load Balancing**: Use multiple API server instances behind a load balancer

## Monitoring

### Health Checks
```bash
# API health
curl http://localhost:3001/health

# Tools status
curl http://localhost:3001/api/tools
```

### Logging
- API logs: Check console output or configure logging service
- Gradio logs: Built-in console logging
- Consider adding: Sentry, LogRocket, or DataDog

## Security

1. **API Keys**: Never commit to Git, use environment variables
2. **CORS**: Restrict origins in production
3. **Rate Limiting**: Add rate limiting middleware
4. **Authentication**: Consider adding API authentication for production
5. **HTTPS**: Always use HTTPS in production

## Scaling

For high traffic:
1. Deploy multiple API server instances
2. Use Redis for session management
3. Implement request queuing (Bull/BullMQ)
4. Consider serverless functions for tools
5. Use CDN for static assets

## Support

- 📖 Documentation: See README.md
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions


