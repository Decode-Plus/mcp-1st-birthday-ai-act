#!/bin/bash

# =============================================================================
# Modal GPT-OSS Deployment Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Modal GPT-OSS vLLM Deployment"
echo "================================"
echo ""

# Check if modal is installed
if ! command -v modal &> /dev/null; then
    echo "❌ Modal CLI not found. Installing..."
    pip install modal
    echo ""
fi

# Check if authenticated
echo "📋 Checking Modal authentication..."
if ! modal token info &> /dev/null 2>&1; then
    echo "❌ Not authenticated with Modal."
    echo ""
    echo "Please run: modal setup"
    echo "Or set your token with: modal token set --token-id <ID> --token-secret <SECRET>"
    echo ""
    exit 1
fi

echo "✅ Authenticated with Modal"
echo ""

# Show options
echo "What would you like to do?"
echo ""
echo "  1) Test the server (temporary deployment)"
echo "  2) Deploy to production"
echo "  3) Stop the deployed app"
echo "  4) View logs"
echo "  5) Exit"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
    1)
        echo ""
        echo "🧪 Running test deployment..."
        cd "$SCRIPT_DIR"
        modal run gpt_oss_inference.py
        ;;
    2)
        echo ""
        echo "🚀 Deploying to production..."
        cd "$SCRIPT_DIR"
        modal deploy gpt_oss_inference.py
        echo ""
        echo "✅ Deployment complete!"
        echo ""
        echo "Your endpoint URL will be displayed above."
        ;;
    3)
        echo ""
        echo "🛑 Stopping app..."
        modal app stop gpt-oss-vllm-inference
        echo "✅ App stopped"
        ;;
    4)
        echo ""
        echo "📜 Fetching logs..."
        modal app logs gpt-oss-vllm-inference
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

