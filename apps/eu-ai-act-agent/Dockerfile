# EU AI Act Compliance Agent - Hugging Face Spaces
# Deploys Agent + MCP Server from monorepo

FROM node:20-slim

# Install Python and pnpm
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for HF Spaces
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy entire monorepo
COPY --chown=user . .

# Install Node dependencies
RUN pnpm install --frozen-lockfile

# Build MCP server and Agent
RUN pnpm --filter @eu-ai-act/mcp-server build
RUN pnpm --filter @eu-ai-act/agent build

# Install Python dependencies
RUN pip3 install --no-cache-dir --user -r apps/eu-ai-act-agent/requirements.txt

# Environment
ENV NODE_ENV=production \
    PORT=3001 \
    API_URL=http://localhost:3001 \
    GRADIO_SERVER_NAME=0.0.0.0 \
    GRADIO_SERVER_PORT=7860

EXPOSE 7860

# Start API server + Gradio UI
CMD cd apps/eu-ai-act-agent && node dist/server.js & sleep 3 && cd apps/eu-ai-act-agent && python3 src/gradio_app.py

