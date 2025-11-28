# 🇪🇺 EU AI Act Compliance Agent

An interactive AI agent with Gradio UI for navigating EU AI Act compliance requirements, powered by Vercel AI SDK v5 and the EU AI Act MCP Server.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Gradio Web UI                        │
│         (Python - Interactive Chat Interface)           │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Express API Server                         │
│         (Node.js + Vercel AI SDK v5)                    │
│   ┌─────────────────────────────────────────────────┐   │
│   │  AI Agent with Tool Calling                     │   │
│   │  - Grok 4.1 Reasoning Models                               │   │
│   │  - Streaming responses                          │   │
│   │  - Contextual awareness                         │   │
│   └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              EU AI Act MCP Tools                        │
│   ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│   │  discover_   │  │  discover_   │  │   assess_   │  │
│   │organization  │  │ ai_services  │  │ compliance  │  │
│   └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## ✨ Features

### 🤖 Intelligent AI Agent
- **Natural Language Interface**: Ask questions in plain English
- **Contextual Awareness**: Maintains conversation context throughout the session
- **Multi-Step Workflows**: Automatically orchestrates complex compliance assessments
- **Tool Calling**: Seamlessly invokes MCP tools based on user intent

### 📊 Compliance Capabilities
- **Organization Profiling**: Discover company structure and AI maturity
- **AI System Discovery**: Catalog and classify all AI systems
- **Risk Assessment**: Classify systems per EU AI Act (Unacceptable/High/Limited/Minimal)
- **Gap Analysis**: Identify compliance gaps with specific Article references
- **Documentation Generation**: Auto-generate required compliance templates

### 🎨 Gradio UI
- **Chat Interface**: Clean, modern chat experience
- **Streaming Responses**: Real-time AI responses
- **Document Preview**: View generated compliance documents
- **Export Options**: Download assessment reports and templates
- **Multi-language Support**: Available in multiple EU languages

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and pnpm 8+
- **Python** 3.9+ with uv (fast package manager)
- **API Keys**:
  - xAI API key (required)
  - Tavily API key (optional, for enhanced research)

### Installation

1. **Install Node.js dependencies**:
```bash
pnpm install
```

2. **Install uv and Python dependencies**:
```bash
# Install uv (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies
uv pip install -r requirements.txt
```

3. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env and add your XAI_API_KEY and TAVILY_API_KEY
```

### Running the Agent

**Option 1: Run everything together** (recommended)
```bash
# Terminal 1: Start the Express API server
pnpm dev

# Terminal 2: Start the Gradio UI
pnpm gradio
```

**Option 2: Manual start**
```bash
# Terminal 1: Start API server
cd apps/eu-ai-act-agent
pnpm dev

# Terminal 2: Start Gradio
cd apps/eu-ai-act-agent
uv run src/gradio_app.py
```

The Gradio UI will be available at `http://localhost:7860` 🎉

## 📖 Usage Examples

### Example 1: Organization Discovery
```
You: Analyze OpenAI's EU AI Act compliance status

Agent: I'll help you assess OpenAI's compliance. Let me start by 
       discovering their organization profile...
       
       [Discovering organization details...]
       [Analyzing AI systems...]
       [Assessing compliance gaps...]
       
       OpenAI operates as a Large Enterprise with Expert AI maturity.
       They have 4 high-risk AI systems requiring conformity assessment...
```

### Example 2: AI System Classification
```
You: What risk category is a recruitment screening AI?

Agent: Let me check the EU AI Act classification...
       
       A recruitment screening AI is classified as HIGH RISK per 
       Annex III, Section 4(a) - AI systems used for recruitment.
       
       Requirements include:
       - Conformity assessment (Article 43)
       - Technical documentation (Article 11)
       - CE marking (Article 48)
       - EU database registration (Article 49)
```

### Example 3: Document Generation
```
You: Generate compliance documentation for our chatbot

Agent: I'll assess your chatbot and generate the required documents...
       
       [Generated documents]:
       ✓ Risk Management System (Article 9)
       ✓ Technical Documentation (Article 11)
       ✓ Transparency Notice (Article 50)
       
       Your chatbot is classified as Limited Risk. Download the 
       documentation package using the export button.
```

## 🔧 Configuration

### API Server (`src/server.ts`)
- **Port**: Configure via `PORT` env var (default: 3001)
- **Model**: Configured to use Grok 4.1 reasoning models
- **Streaming**: Enabled for real-time responses
- **CORS**: Configured for Gradio origin

### Gradio UI (`src/gradio_app.py`)
- **Theme**: Custom EU-themed design
- **Chat History**: Maintains full conversation context
- **Export**: Supports markdown and PDF export (optional)

## 🛠️ Development

### Project Structure
```
apps/eu-ai-act-agent/
├── src/
│   ├── server.ts           # Express API + Vercel AI SDK agent
│   ├── gradio_app.py       # Gradio web interface
│   ├── agent/
│   │   ├── index.ts        # Agent configuration
│   │   ├── tools.ts        # MCP tool adapters
│   │   └── prompts.ts      # System prompts
│   └── types/
│       └── index.ts        # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

### Building for Production
```bash
# Build the Node.js server
pnpm build

# Start production server
pnpm start
```

## 📚 API Reference

### POST `/api/chat`
Send a chat message to the AI agent.

**Request:**
```json
{
  "message": "Analyze my organization",
  "history": []
}
```

**Response (Stream):**
```
data: {"type":"text","content":"Let me analyze..."}
data: {"type":"tool_call","tool":"discover_organization"}
data: {"type":"result","data":{...}}
```

## 🧪 Testing

Test the agent with sample queries:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the EU AI Act?"}'
```

## 🎯 Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **AI SDK**: Vercel AI SDK v5 (upgraded from v4)
- **LLM**: xAI Grok 4.1 Reasoning Models
- **Frontend**: Gradio (Python)
- **MCP**: Model Context Protocol for tool integration
- **Monorepo**: Turborepo for efficient builds

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details

---

<div align="center">

**Built for the MCP 1st Birthday Hackathon** 🎂

Making EU AI Act compliance accessible through conversational AI

</div>

