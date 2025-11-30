#!/bin/bash
# Deploy ChatGPT MCP Server to Hugging Face Spaces
# This is a SEPARATE space just for the MCP server
# Usage: ./scripts/deploy-chatgpt-mcp.sh

set -e

HF_SPACE="${HF_SPACE:-MCP-1st-Birthday/eu-ai-act-chatgpt-mcp}"

echo "🚀 Deploying ChatGPT MCP Server to HF Spaces: $HF_SPACE"

# Derive PUBLIC_URL from HF_SPACE
PUBLIC_URL="https://$(echo "$HF_SPACE" | tr '[:upper:]' '[:lower:]' | tr '/' '-').hf.space"
MCP_URL="${PUBLIC_URL}/gradio_api/mcp/"
echo "📡 Public URL: $PUBLIC_URL"
echo "🔗 MCP URL: $MCP_URL"

# Check HF CLI
if ! command -v huggingface-cli &> /dev/null; then
    echo "Installing huggingface_hub..."
    pip install huggingface_hub
fi

# Login check
huggingface-cli whoami || { echo "❌ Run: huggingface-cli login"; exit 1; }

# Create temp dir
TEMP_DIR=$(mktemp -d)
echo "📦 Preparing deployment in $TEMP_DIR"

# Get repo root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Copy everything except node_modules, .git, dist, .venv
rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.venv' --exclude='.turbo' "$REPO_ROOT/" "$TEMP_DIR/"
cd "$TEMP_DIR"

# Use the ChatGPT MCP Dockerfile
cp apps/eu-ai-act-agent/Dockerfile.chatgpt-mcp ./Dockerfile

# Update PUBLIC_URL in Dockerfile
sed -i.bak "s|PUBLIC_URL=https://.*\.hf\.space|PUBLIC_URL=$PUBLIC_URL|g" Dockerfile
rm -f Dockerfile.bak
echo "✅ Updated PUBLIC_URL in Dockerfile"

# Create a simple README for this space
cat > README.md << 'EOF'
---
title: EU AI Act - ChatGPT MCP Server
emoji: ⚖️
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
tags:
  - building-mcp-track-enterprise
  - mcp-in-action-track-enterprise
short_description: MCP Server for ChatGPT Apps - EU AI Act Compliance Tools
---

# 🇪🇺 EU AI Act - ChatGPT MCP Server

This is the **MCP Server** for integrating EU AI Act compliance tools with **ChatGPT Desktop**.

## 🔗 MCP URL

```
EOF

echo "${MCP_URL}" >> README.md

cat >> README.md << 'EOF'
```

## 📖 How to Use in ChatGPT

1. **Enable Developer Mode** in ChatGPT: Settings → Apps & Connectors → Advanced settings
2. **Create a Connector** with the MCP URL above (choose "No authentication")
3. **Chat with ChatGPT** using `@eu-ai-act` to access the tools

## 🔧 Available MCP Tools

| Tool | Description |
|------|-------------|
| `discover_organization` | Research and profile an organization for compliance |
| `discover_ai_services` | Discover and classify AI systems by risk level |
| `assess_compliance` | Generate compliance assessment and documentation |

## 🤖 Main Agent UI

For the full interactive chat experience, visit:
**[EU AI Act Compliance Agent](https://huggingface.co/spaces/MCP-1st-Birthday/eu-ai-act-compliance-agent)**

---

Built for the **MCP 1st Birthday Hackathon** 🎂

**🔗 Demo & Showcase:** [www.legitima.ai/mcp-hackathon](https://www.legitima.ai/mcp-hackathon)
**📹 Video:** [Guiddes](https://app.guidde.com/share/playlists/2wXbDrSm2YY7YnWMJbftuu?origin=wywDANMIvNhPu9kYVOXCPpdFcya2)
**📱 Social Media:** [LinkedIn Post 1](https://www.linkedin.com/posts/iordanis-sarafidis_mcp-1st-birthday-mcp-1st-birthday-activity-7400132272282144768-ZIir?utm_source=share&utm_medium=member_desktop&rcm=ACoAAB0ARLABGvUO6Q--hJP0cDG7h0LZT0-roLs)

[LinkedIn Post 2](https://www.linkedin.com/posts/billdrosatos_mcp-1st-birthday-mcp-1st-birthday-activity-7400135422502252544-C5BS?utm_source=share&utm_medium=member_desktop&rcm=ACoAAB0ARLABGvUO6Q--hJP0cDG7h0LZT0-roLs)
EOF

echo "✅ Created README.md with MCP URL"

# Remove git and push to HF
rm -rf .git
git init -b main
git add -A
git commit -m "Deploy ChatGPT MCP Server"

# Push to HF Space
git remote add hf "https://huggingface.co/spaces/$HF_SPACE"
git push hf main --force

echo ""
echo "✅ Deployed to: https://huggingface.co/spaces/$HF_SPACE"
echo ""
echo "🔗 MCP URL for ChatGPT:"
echo "   $MCP_URL"
echo ""

# Cleanup
cd -
rm -rf "$TEMP_DIR"

