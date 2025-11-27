#!/bin/bash

# EU AI Act MCP Server - Local Testing Script
# This script builds and tests the MCP server

set -e

echo "🚀 EU AI Act MCP Server - Local Testing"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
pnpm install --filter @eu-ai-act/mcp-server --filter @eu-ai-act/test-agent
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Build MCP server
echo -e "${BLUE}Step 2: Building MCP server...${NC}"
pnpm --filter @eu-ai-act/mcp-server build
echo -e "${GREEN}✅ MCP server built successfully${NC}"
echo ""

# Step 3: Run tests
echo -e "${BLUE}Step 3: Running test agent...${NC}"
echo ""
pnpm --filter @eu-ai-act/test-agent dev
echo ""

# Success message
echo ""
echo -e "${GREEN}========================================"
echo "✅ All tests completed successfully!"
echo "========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Configure Claude Desktop (see QUICKSTART.md)"
echo "2. Read packages/eu-ai-act-mcp/README.md for API docs"
echo "3. See IMPLEMENTATION.md for architecture details"
echo ""
echo "Your MCP server is ready to use! 🎉"

