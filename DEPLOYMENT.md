# 🚀 Deployment Guide

This guide covers deploying the EU AI Act Compliance Suite for the MCP 1st Birthday Hackathon.

## 📋 Table of Contents

- [Deployment Options](#deployment-options)
- [Hugging Face Spaces (Recommended)](#hugging-face-spaces-recommended)
- [Manual Deployment](#manual-deployment)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Environment Variables](#environment-variables)
- [Hackathon Submission Checklist](#hackathon-submission-checklist)

---

## 🎯 Deployment Options

| Option | Best For | Difficulty |
|--------|----------|------------|
| **Hugging Face Spaces** | Hackathon submission, public demos | ⭐ Easy |
| **Docker** | Self-hosted, production | ⭐⭐ Medium |
| **Local Development** | Testing, development | ⭐ Easy |

---

## 🤗 Hugging Face Spaces (Recommended)

The easiest way to deploy for the hackathon is using **Hugging Face Spaces**.

### Method 1: Automated Deployment (GitHub Actions)

1. **Fork this repository** to your GitHub account

2. **Add GitHub Secrets:**
   - Go to your repo → Settings → Secrets and variables → Actions
   - Add `HF_TOKEN`: Your Hugging Face token with write access
   
   ```bash
   # Get your HF token from: https://huggingface.co/settings/tokens
   # Required scopes: write access to spaces
   ```

3. **Join the Hackathon Organization:**
   - Go to [MCP-1st-Birthday](https://huggingface.co/MCP-1st-Birthday)
   - Click "Request to join this org"
   - Wait for approval

4. **Trigger Deployment:**
   - Push to `main` branch (auto-deploys on changes to `spaces/` directory)
   - Or manually trigger via GitHub Actions → "Deploy to Hugging Face Spaces" → "Run workflow"

5. **Configure Space Secrets:**
   - Go to your Space settings: `https://huggingface.co/spaces/MCP-1st-Birthday/eu-ai-act-compliance/settings`
   - Add secrets:
     - `XAI_API_KEY` (required) - Get from [x.ai](https://x.ai/)
     - `TAVILY_API_KEY` (optional) - Get from [tavily.com](https://app.tavily.com/)

### Method 2: Manual Upload

1. **Create a new Space:**
   ```bash
   # Install huggingface_hub
   pip install huggingface_hub
   
   # Login
   huggingface-cli login
   
   # Create space
   huggingface-cli repo create eu-ai-act-compliance --type space --space-sdk gradio
   ```

2. **Upload files:**
   ```bash
   cd spaces/eu-ai-act-compliance
   
   # Clone the space
   git clone https://huggingface.co/spaces/YOUR_USERNAME/eu-ai-act-compliance
   
   # Copy files
   cp -r . eu-ai-act-compliance/
   
   # Push
   cd eu-ai-act-compliance
   git add .
   git commit -m "Initial deployment"
   git push
   ```

3. **Transfer to hackathon org** (for submission):
   - Go to Space Settings → Transfer
   - Transfer to `MCP-1st-Birthday` organization

### Method 3: Using the Deploy Script

```bash
# Run the deployment script
./scripts/deploy-hf.sh

# With custom org/name
./scripts/deploy-hf.sh --org MCP-1st-Birthday --name eu-ai-act-compliance
```

---

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t eu-ai-act-compliance -f Dockerfile .

# Run with environment variables
docker run -p 7860:7860 \
  -e XAI_API_KEY=your-key \
  -e TAVILY_API_KEY=your-key \
  eu-ai-act-compliance
```

### Docker Compose

```yaml
version: '3.8'
services:
  eu-ai-act-agent:
    build: .
    ports:
      - "7860:7860"
    environment:
      - XAI_API_KEY=${XAI_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
    restart: unless-stopped
```

---

## 🔧 Manual Deployment

### Prerequisites

- Node.js 18+
- Python 3.9+
- pnpm 8+

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-org/eu-ai-act-compliance.git
cd eu-ai-act-compliance

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

# 4. Build the MCP server
pnpm --filter @eu-ai-act/mcp-server build

# 5. Start the agent (API + Gradio)
cd apps/eu-ai-act-agent
./start.sh
```

### Production Mode

```bash
# Build everything
pnpm build

# Start in production
cd apps/eu-ai-act-agent
NODE_ENV=production node dist/server.js &
python src/gradio_app.py
```

---

## 🔄 GitHub Actions CI/CD

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR | Lint, typecheck, build |
| `deploy-hf-space.yml` | Push to main + `spaces/` changes | Deploy to HF Spaces |

### Required Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `HF_TOKEN` | Yes | Hugging Face token with write access |

### Manual Deployment Trigger

1. Go to Actions → "Deploy to Hugging Face Spaces"
2. Click "Run workflow"
3. Select branch and environment
4. Click "Run workflow"

---

## 🔐 Environment Variables

### Required

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `XAI_API_KEY` | xAI API key for Grok model | [console.x.ai](https://console.x.ai/) |

### Optional

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `TAVILY_API_KEY` | Tavily API for web research | [app.tavily.com](https://app.tavily.com/) |
| `PORT` | API server port (default: 3001) | - |

### Setting Secrets in Hugging Face Spaces

1. Go to your Space: `https://huggingface.co/spaces/ORG/SPACE_NAME`
2. Click ⚙️ Settings
3. Scroll to "Repository secrets"
4. Add each secret:
   - Name: `XAI_API_KEY`
   - Value: Your API key
   - Click "Add"

---

## ✅ Hackathon Submission Checklist

### Before Submission (Nov 30, 2025 11:59 PM UTC)

- [ ] **Join the organization**: [Request to join MCP-1st-Birthday](https://huggingface.co/MCP-1st-Birthday)
- [ ] **Deploy your Space**: Make sure it's running and accessible
- [ ] **Configure secrets**: Add `XAI_API_KEY` (and optionally `TAVILY_API_KEY`)
- [ ] **Test the demo**: Verify all features work

### README Requirements

Your Space README must include:

- [ ] **Hackathon tags** in frontmatter:
  ```yaml
  tags:
    - mcp
    - agents
    - track-1-mcp-servers
    - track-2-agentic-applications
  ```

- [ ] **Social media link**: Share your project and include the link
  ```markdown
  [🐦 Twitter Post](https://twitter.com/your-post-link)
  ```

### Track Tags

| Track | Tags |
|-------|------|
| Track 1: Building MCP | `track-1-mcp-servers`, `mcp` |
| Track 2: MCP in Action | `track-2-agentic-applications`, `agents` |

### Social Media Post Template

```
🇪🇺 Excited to share my #MCPHackathon submission!

EU AI Act Compliance Agent - AI-powered compliance assessment with MCP tools

✅ Discover organization profiles
✅ Classify AI systems by risk
✅ Generate compliance documentation

Try it: [HF Space Link]

#MCP #AIAct #Gradio @huggingface
```

---

## 🔍 Troubleshooting

### Space Not Building

1. Check `requirements.txt` for valid packages
2. Verify Python version compatibility
3. Check build logs in Space settings

### API Key Errors

1. Verify secrets are set in Space settings
2. Check secret names match exactly (case-sensitive)
3. Ensure API keys are valid and have required permissions

### Deployment Failing

1. Check GitHub Actions logs
2. Verify `HF_TOKEN` has write access
3. Ensure you're a member of the target organization

### Space Sleeping

Free HF Spaces sleep after inactivity. To wake:
1. Visit the Space URL
2. Wait for it to build/start
3. Consider upgrading for persistent uptime

---

## 📞 Support

- **Hackathon Discord**: [#agents-mcp-hackathon-winter25🏆](https://discord.gg/huggingface)
- **GitHub Issues**: [Create an issue](https://github.com/your-org/eu-ai-act-compliance/issues)
- **Email**: gradio-team@huggingface.co

---

## 📚 Additional Resources

- [Hugging Face Spaces Documentation](https://huggingface.co/docs/hub/spaces)
- [Gradio Deployment Guide](https://www.gradio.app/guides/sharing-your-app)
- [MCP Course](https://huggingface.co/learn/mcp-course)
- [Hackathon Page](https://huggingface.co/MCP-1st-Birthday)

---

<div align="center">

**Good luck with your submission! 🎂**

</div>

