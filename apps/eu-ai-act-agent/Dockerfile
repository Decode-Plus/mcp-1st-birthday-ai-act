# EU AI Act Compliance Agent - Hugging Face Spaces
# Deploys Agent + MCP Server from monorepo

FROM node:20-slim

# Install Python, pnpm, and uv (to /usr/local/bin for all users)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    curl \
    && npm install -g pnpm \
    && curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh \
    && rm -rf /var/lib/apt/lists/*

# Use existing node user (UID 1000) for HF Spaces compatibility
USER node
ENV HOME=/home/node

WORKDIR $HOME/app

# Copy entire monorepo
COPY --chown=node . .

# Install Node dependencies
RUN pnpm install --frozen-lockfile

# Build MCP server and Agent
RUN pnpm --filter @eu-ai-act/mcp-server build
RUN pnpm --filter @eu-ai-act/agent build

# Create Python venv and install dependencies with uv
RUN uv venv $HOME/venv && \
    . $HOME/venv/bin/activate && \
    uv pip install --no-cache -r apps/eu-ai-act-agent/requirements.txt

# Environment
# API_URL: Internal communication between Gradio and API server (localhost works inside container)
# PUBLIC_URL: External HF Spaces URL for links shown to users
ENV NODE_ENV=production \
    PORT=3001 \
    API_URL=http://localhost:3001 \
    PUBLIC_URL=https://mcp-1st-birthday-eu-ai-act-compliance-agent.hf.space \
    GRADIO_SERVER_NAME=0.0.0.0 \
    GRADIO_SERVER_PORT=7860 \
    GRADIO_SHARE=true \
    PATH=/home/node/venv/bin:$PATH \
    VIRTUAL_ENV=/home/node/venv \
    MCP_SERVER_PATH=/home/node/app/packages/eu-ai-act-mcp/dist/index.js

# Set working directory to the agent app for CMD
WORKDIR $HOME/app/apps/eu-ai-act-agent

EXPOSE 7860

# Start API server + Gradio UI (with MCP server built-in)
# MCP server is now integrated into the main Gradio app on port 7860
CMD node dist/server.js & \
    sleep 2 && \
    python src/gradio_app.py

