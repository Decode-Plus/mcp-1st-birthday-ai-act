# 🏗️ Architecture Documentation

Detailed technical architecture of the EU AI Act Compliance Agent.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Gradio Web Interface (Python)                        │  │
│  │  - Chat UI with history                               │  │
│  │  - Real-time streaming display                        │  │
│  │  - Document export features                           │  │
│  │  - Status monitoring                                  │  │
│  └────────────────────┬──────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────┘
                          │ HTTP/REST (SSE)
                          │
┌─────────────────────────┼──────────────────────────────────┐
│                   API LAYER                                 │
│  ┌────────────────────┴──────────────────────────────────┐ │
│  │  Express.js Server (Node.js/TypeScript)               │ │
│  │  - RESTful endpoints                                  │ │
│  │  - Server-Sent Events (SSE) for streaming             │ │
│  │  - CORS configuration                                 │ │
│  │  - Request validation                                 │ │
│  └────────────────────┬──────────────────────────────────┘ │
└─────────────────────────┼──────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────────┐
│                   AGENT LAYER                               │
│  ┌────────────────────┴──────────────────────────────────┐ │
│  │  Vercel AI SDK v5 Agent                               │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  Model: OpenAI gpt-5-chat-latest                            │ │ │
│  │  │  - Natural language understanding                │ │ │
│  │  │  - Context management (conversation history)     │ │ │
│  │  │  - Tool calling orchestration                    │ │ │
│  │  │  - Streaming response generation                 │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                         │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │  System Prompt                                    │ │ │
│  │  │  - EU AI Act expert persona                      │ │ │
│  │  │  - Tool usage guidelines                         │ │ │
│  │  │  - Response formatting rules                     │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────┬──────────────────────────────────┘ │
└─────────────────────────┼──────────────────────────────────┘
                          │ Function Calling
                          │
┌─────────────────────────┼──────────────────────────────────┐
│                   TOOL LAYER                                │
│  ┌────────────────────┴──────────────────────────────────┐ │
│  │  MCP Tool Adapters (Vercel AI SDK tool format)       │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  1. discover_organization                       │  │ │
│  │  │     - Tavily web research                       │  │ │
│  │  │     - Company profiling                         │  │ │
│  │  │     - Regulatory mapping                        │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  2. discover_ai_services                        │  │ │
│  │  │     - AI system discovery                       │  │ │
│  │  │     - Risk classification                       │  │ │
│  │  │     - Compliance status assessment              │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  3. assess_compliance                           │  │ │
│  │  │     - Gap analysis (GPT-4)                      │  │ │
│  │  │     - Documentation generation                  │  │ │
│  │  │     - Recommendations                           │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └────────────────────┬──────────────────────────────────┘ │
└─────────────────────────┼──────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────────┐
│               EXTERNAL SERVICES                             │
│  ┌────────────────────┴──────────────────────────────────┐ │
│  │  OpenAI API (gpt-5-chat-latest)                                  │ │
│  │  - Agent intelligence                                 │ │
│  │  - Compliance assessment                              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Tavily API (Optional)                                │ │
│  │  - Company research                                   │ │
│  │  - Web data extraction                                │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Gradio Web Interface

**Technology**: Python 3.9+ with Gradio 5.x

**Purpose**: Provide user-friendly chat interface for the agent

**Key Files**:
- `src/gradio_app.py` - Main Gradio application

**Features**:
- Chat interface with conversation history
- Real-time streaming display
- Status indicator for API connection
- Example queries
- Export functionality (planned)
- Custom EU-themed styling

**Communication**: HTTP POST requests to Express API with streaming response handling

**Configuration**:
```python
demo.launch(
    server_name="0.0.0.0",
    server_port=7860,
    share=False,
    show_error=True,
)
```

---

### 2. Express API Server

**Technology**: Node.js 18+ with Express.js and TypeScript

**Purpose**: REST API layer connecting Gradio to the AI agent

**Key Files**:
- `src/server.ts` - Express server configuration
- `src/types/index.ts` - TypeScript type definitions

**Endpoints**:
- `GET /health` - Health check
- `POST /api/chat` - Main chat endpoint (streaming)
- `GET /api/tools` - List available tools

**Features**:
- CORS configuration for Gradio
- Server-Sent Events (SSE) for streaming
- Request validation
- Error handling
- Logging

**Configuration**:
```typescript
const app = express();
app.use(cors({
  origin: ["http://localhost:7860", "http://127.0.0.1:7860"],
  credentials: true,
}));
app.use(express.json());
```

---

### 3. Vercel AI SDK v5 Agent

**Technology**: Vercel AI SDK v5 with OpenAI provider

**Purpose**: Intelligent agent that understands queries and orchestrates tools

**Key Files**:
- `src/agent/index.ts` - Agent factory and configuration
- `src/agent/prompts.ts` - System prompt and instructions
- `src/agent/tools.ts` - Tool adapters

**Model**: OpenAI gpt-5-chat-latest
- Context window: 128k tokens
- Supports function calling
- Streaming responses
- Multi-step reasoning

**Configuration**:
```typescript
const model = openai("gpt-5-chat-latest");

streamText({
  model,
  messages: [...],
  tools: {
    discover_organization,
    discover_ai_services,
    assess_compliance,
  },
  maxSteps: 5, // Allow multi-step tool use
})
```

**Capabilities**:
- Natural language understanding
- Intent recognition
- Tool selection and orchestration
- Context management
- Response streaming
- Error handling

---

### 4. MCP Tool Adapters

**Technology**: Vercel AI SDK `tool()` wrapper + MCP tools

**Purpose**: Bridge between Vercel AI SDK and MCP tools

**Key File**: `src/agent/tools.ts`

**Adapter Pattern**:
```typescript
import { tool } from "ai";
import { z } from "zod";
import { mcpToolFunction } from "../../eu-ai-act-mcp/src/tools/...";

export const myTool = tool({
  description: "...",
  parameters: z.object({...}),
  execute: async (params) => {
    return await mcpToolFunction(params);
  },
});
```

**Three Tools**:
1. `discover_organization` - Organization profiling
2. `discover_ai_services` - AI system discovery
3. `assess_compliance` - Compliance assessment

---

### 5. MCP Server (Shared)

**Technology**: Model Context Protocol SDK

**Purpose**: Reusable compliance tools

**Location**: `packages/eu-ai-act-mcp/`

**Integration**: Tools are imported directly by the agent adapters

**Note**: No separate MCP server process needed for the agent. Tools are used as libraries.

---

## Data Flow

### Basic Chat Flow

```
User Input (Gradio)
    ↓
POST /api/chat {message, history}
    ↓
Express Server validates request
    ↓
Agent.streamText({messages})
    ↓
gpt-5-chat-latest processes with system prompt
    ↓
Streaming response chunks
    ↓
SSE: data: {type: "text", content: "..."}
    ↓
Gradio displays in real-time
```

### Tool Calling Flow

```
User: "Analyze OpenAI's compliance"
    ↓
Agent recognizes need for tools
    ↓
Step 1: Call discover_organization("OpenAI")
    ├─ Tavily API search
    ├─ Data extraction
    └─ Return organization profile
    ↓
Step 2: Call discover_ai_services(orgContext)
    ├─ System classification
    ├─ Risk assessment
    └─ Return systems inventory
    ↓
Step 3: Call assess_compliance(org, systems)
    ├─ GPT-4 analysis
    ├─ Gap identification
    └─ Return assessment + docs
    ↓
Agent synthesizes results
    ↓
Stream final response to user
```

---

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| UI | Gradio | 5.9.1+ | Web interface |
| API | Express.js | 4.21+ | REST server |
| Language | TypeScript | 5.9+ | Type safety |
| Agent | Vercel AI SDK | 5.0+ | AI orchestration |
| Model | gpt-5-chat-latest | Latest | Intelligence |
| Tools | MCP SDK | 1.23+ | Tool protocol |
| Research | Tavily | 0.5+ | Web search |
| Validation | Zod | 3.23+ | Schema validation |

---

## Configuration Management

### Environment Variables

**Workspace Root** `.env`:
```bash
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
PORT=3001
```

**Loading**:
```typescript
import { config } from "dotenv";
config({ path: resolve(__dirname, "../../.env") });
```

### Package Configuration

**Monorepo Structure**:
```
packages/eu-ai-act-mcp/      # MCP tools
apps/eu-ai-act-agent/        # Agent + UI
  ├── src/
  │   ├── server.ts          # Express server
  │   ├── gradio_app.py      # Gradio UI
  │   └── agent/
  │       ├── index.ts       # Agent config
  │       ├── tools.ts       # Tool adapters
  │       └── prompts.ts     # System prompt
  └── package.json
```

**Dependencies**:
- Agent depends on MCP package
- Imports tools directly (no RPC)
- Shared TypeScript config

---

## Scaling Considerations

### Horizontal Scaling

**Current**: Single instance of Express + Gradio

**For Production**:
1. **Multiple API Instances**:
   ```
   Load Balancer
       ├─ API Server 1
       ├─ API Server 2
       └─ API Server 3
   ```

2. **Session Management**:
   - Use Redis for conversation history
   - Sticky sessions at load balancer
   - Stateless API design

3. **Gradio Scaling**:
   - Multiple Gradio instances
   - Shared API endpoint
   - CDN for static assets

### Vertical Scaling

- Increase Node.js worker threads
- Use clustering module
- Optimize Python workers

### Caching Strategy

```typescript
import NodeCache from 'node-cache';

const orgCache = new NodeCache({ stdTTL: 3600 });
const systemCache = new NodeCache({ stdTTL: 1800 });

// Cache organization discoveries
if (orgCache.has(orgName)) {
  return orgCache.get(orgName);
}
```

---

## Security Architecture

### Current State (Development)

- No authentication
- Open CORS for localhost
- Environment variables for API keys
- No encryption at rest

### Production Requirements

1. **Authentication**:
```typescript
import jwt from 'jsonwebtoken';

app.use('/api/', (req, res, next) => {
  const token = req.headers.authorization;
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('Unauthorized');
    req.user = decoded;
    next();
  });
});
```

2. **Rate Limiting**:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);
```

3. **Input Validation**:
```typescript
import { z } from 'zod';

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).max(50)
});
```

4. **HTTPS Only**:
```typescript
if (process.env.NODE_ENV === 'production' && !req.secure) {
  return res.redirect('https://' + req.headers.host + req.url);
}
```

---

## Monitoring & Observability

### Logging

**Current**: Console logs

**Recommended**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics

Track:
- Request rate
- Response time
- Tool execution time
- Error rate
- OpenAI API usage

### Alerting

Monitor:
- API downtime
- High error rates
- OpenAI rate limits
- Disk space (logs)

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Watch mode for API
pnpm dev

# Terminal 2: Python app
python3 src/gradio_app.py

# Terminal 3: Watch MCP changes
pnpm --filter @eu-ai-act/mcp-server dev
```

### Testing

```bash
# Unit tests (future)
pnpm test

# Integration tests (future)
pnpm test:integration

# Manual testing
curl http://localhost:3001/health
```

### Building

```bash
# Build MCP server
pnpm --filter @eu-ai-act/mcp-server build

# Build agent
pnpm --filter @eu-ai-act/agent build

# Build all
pnpm build
```

---

## Deployment Architecture

### Recommended: Vercel + Hugging Face

```
[Vercel]                    [Hugging Face Spaces]
  ↓                              ↓
Express API (Node.js)      Gradio UI (Python)
  ↓                              ↓
gpt-5-chat-latest + MCP Tools              ↓
  ↑                              ↓
  ←──────── HTTP/SSE ───────────┘
```

**Benefits**:
- Vercel: Serverless scaling, CDN, automatic HTTPS
- HF Spaces: Free Gradio hosting, GPU access (if needed)
- Separation of concerns

### Alternative: Single Server

```
[VPS / Cloud VM]
  ├─ Nginx (reverse proxy)
  ├─ Express API :3001
  ├─ Gradio UI :7860
  └─ PM2 (process manager)
```

**Benefits**:
- Simpler deployment
- Lower latency (same server)
- Full control

---

## Performance Optimization

### Response Time

- **Current**: ~2-5 seconds for simple queries
- **With Tools**: ~10-30 seconds (Tavily + GPT-4 analysis)
- **Optimization**:
  - Cache Tavily results (24h TTL)
  - Parallel tool execution where possible
  - Stream responses immediately

### Cost Optimization

- Use gpt-5-chat-latest-mini for simple queries (future)
- Cache frequently requested data
- Batch processing where applicable
- Monitor token usage

---

## Future Enhancements

1. **WebSocket Support**: Replace SSE with WebSockets
2. **Multi-tenancy**: Support multiple organizations
3. **Persistent Storage**: Database for assessments
4. **Advanced Analytics**: Compliance dashboards
5. **Document Export**: PDF/DOCX generation
6. **Email Reports**: Scheduled compliance reports
7. **API Management**: Rate limiting, quotas, billing
8. **Advanced Caching**: Redis cluster
9. **Internationalization**: Multi-language support
10. **Mobile App**: React Native companion app

---

## Troubleshooting

### Common Issues

1. **Agent not responding**:
   - Check OPENAI_API_KEY
   - Verify API server is running
   - Check console for errors

2. **Tool calls failing**:
   - Ensure MCP server is built
   - Check tool imports in tools.ts
   - Verify environment variables

3. **Gradio connection issues**:
   - Verify API_URL in gradio_app.py
   - Check CORS configuration
   - Ensure port 3001 is open

---

## Architecture Decisions (ADRs)

### Why Vercel AI SDK v5?

- Native streaming support
- Tool calling abstraction
- TypeScript-first
- Active development
- Good documentation

### Why Gradio?

- Rapid prototyping
- Built-in chat UI
- Python ecosystem
- Easy deployment (HF Spaces)
- No frontend expertise needed

### Why Express?

- Lightweight
- TypeScript support
- Large ecosystem
- Easy to understand
- Flexible

### Why Direct Tool Import?

- Simpler architecture
- No RPC overhead
- Shared code between MCP server and agent
- Easier debugging

---

**Questions?** See [README.md](README.md) or [API.md](API.md)

