#!/bin/bash
# Deploy to Hugging Face Spaces
# Usage: ./scripts/deploy-hf.sh

set -e

HF_SPACE="${HF_SPACE:-MCP-1st-Birthday/eu-ai-act-compliance-agent}"

echo "🚀 Deploying to HF Spaces: $HF_SPACE"

# Derive PUBLIC_URL from HF_SPACE (org/repo -> org-repo.hf.space)
# Convert to lowercase and replace / with -
PUBLIC_URL="https://$(echo "$HF_SPACE" | tr '[:upper:]' '[:lower:]' | tr '/' '-').hf.space"
echo "📡 Public URL: $PUBLIC_URL"

# Check HF CLI
if ! command -v huggingface-cli &> /dev/null; then
    echo "Installing huggingface_hub..."
    pip install huggingface_hub
fi

# Login check
huggingface-cli whoami || { echo "❌ Run: huggingface-cli login"; exit 1; }

# Create temp dir with full repo
TEMP_DIR=$(mktemp -d)
echo "📦 Preparing deployment in $TEMP_DIR"

# Get repo root directory
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Copy everything except node_modules, .git, dist, .venv
rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='.venv' --exclude='.turbo' "$REPO_ROOT/" "$TEMP_DIR/"
cd "$TEMP_DIR"

# Move Space files to root (from apps/eu-ai-act-agent)
cp apps/eu-ai-act-agent/Dockerfile ./
cp apps/eu-ai-act-agent/README.md ./

# Update PUBLIC_URL in Dockerfile to match the actual HF Space URL
sed -i.bak "s|PUBLIC_URL=https://.*\.hf\.space|PUBLIC_URL=$PUBLIC_URL|g" Dockerfile
rm -f Dockerfile.bak
echo "✅ Updated PUBLIC_URL in Dockerfile"

# Remove git and push to HF
rm -rf .git
git init -b main
git add -A
git commit -m "Deploy"

# Push to HF Space
git remote add hf "https://huggingface.co/spaces/$HF_SPACE"
git push hf main --force

echo "✅ Deployed: https://huggingface.co/spaces/$HF_SPACE"

# Cleanup
cd -
rm -rf "$TEMP_DIR"
