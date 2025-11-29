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
ENV NODE_ENV=production \
    PORT=3001 \
    API_URL=http://localhost:3001 \
    GRADIO_SERVER_NAME=0.0.0.0 \
    GRADIO_SERVER_PORT=7860 \
    PATH=/home/node/venv/bin:$PATH \
    VIRTUAL_ENV=/home/node/venv \
    MCP_SERVER_PATH=/home/node/app/packages/eu-ai-act-mcp/dist/index.js

EXPOSE 7860

# Start API server + Gradio UI
CMD cd apps/eu-ai-act-agent && node dist/server.js & sleep 3 && cd apps/eu-ai-act-agent && python src/gradio_app.py

