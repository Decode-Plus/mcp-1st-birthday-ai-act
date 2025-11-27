#!/bin/bash

# EU AI Act Compliance Agent Startup Script
# Starts both the API server and Gradio UI

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🇪🇺 EU AI Act Compliance Agent"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env exists
if [ ! -f "../../.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Create one from .env.example and add your OPENAI_API_KEY"
    echo ""
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.9+"
    exit 1
fi

echo "✓ Node.js: $(node --version)"
echo "✓ Python: $(python3 --version)"
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv (fast Python package manager)..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo ""
    echo "⚠️  Please restart your terminal and run this script again"
    exit 0
fi

# Install Python dependencies if needed
if ! python3 -c "import gradio" 2>/dev/null; then
    echo "📦 Installing Python dependencies with uv..."
    uv pip install -r requirements.txt
    echo ""
fi

# Build MCP server if needed
if [ ! -d "../../packages/eu-ai-act-mcp/dist" ]; then
    echo "🔨 Building MCP server..."
    cd ../../
    pnpm --filter @eu-ai-act/mcp-server build
    cd apps/eu-ai-act-agent
    echo ""
fi

echo "🚀 Starting EU AI Act Compliance Agent..."
echo ""
echo "📡 API Server will start on: http://localhost:3001"
echo "🎨 Gradio UI will start on: http://localhost:7860"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $API_PID $GRADIO_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Start API server in background
echo "Starting API server..."
pnpm dev > /tmp/eu-ai-act-api.log 2>&1 &
API_PID=$!

# Wait for API to be ready
echo "Waiting for API server to start..."
sleep 3

# Start Gradio in background (using uv run)
echo "Starting Gradio UI..."
uv run src/gradio_app.py > /tmp/eu-ai-act-gradio.log 2>&1 &
GRADIO_PID=$!

# Wait for Gradio to be ready
sleep 3

echo ""
echo "✅ Both servers are running!"
echo ""
echo "🌐 Open your browser to: http://localhost:7860"
echo ""
echo "📋 Logs:"
echo "   API: tail -f /tmp/eu-ai-act-api.log"
echo "   Gradio: tail -f /tmp/eu-ai-act-gradio.log"
echo ""

# Wait for both processes
wait $API_PID $GRADIO_PID

