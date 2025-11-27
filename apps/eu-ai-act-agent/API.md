# 🔌 API Reference

Complete reference for the EU AI Act Compliance Agent API.

## Base URL

```
http://localhost:3001
```

## Authentication

Currently no authentication required for local development. Add API key authentication for production deployment.

---

## Endpoints

### 1. Health Check

Check if the API server is running and healthy.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "ok",
  "service": "EU AI Act Compliance Agent",
  "version": "0.1.0"
}
```

**Example**:
```bash
curl http://localhost:3001/health
```

---

### 2. Chat Endpoint

Send a message to the AI agent and receive a streaming response.

**Endpoint**: `POST /api/chat`

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "message": "What is the EU AI Act?",
  "history": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant",
      "content": "Previous assistant response"
    }
  ]
}
```

**Parameters**:
- `message` (string, required): The user's input message
- `history` (array, optional): Conversation history for context

**Response Format**: Server-Sent Events (SSE) / Event Stream

**Response Events**:

1. **Text Chunk**:
```json
{
  "type": "text",
  "content": "The EU AI Act is..."
}
```

2. **Tool Call** (when agent uses a tool):
```json
{
  "type": "tool_call",
  "tool": "discover_organization",
  "args": {...}
}
```

3. **Tool Result**:
```json
{
  "type": "tool_result",
  "tool": "discover_organization",
  "result": {...}
}
```

4. **Done**:
```json
{
  "type": "done"
}
```

5. **Error**:
```json
{
  "type": "error",
  "error": "Error message"
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the EU AI Act?",
    "history": []
  }'
```

**JavaScript Example**:
```javascript
const response = await fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'What is the EU AI Act?',
    history: []
  })
});

// Read the streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.substring(6));
      console.log(data);
    }
  }
}
```

**Python Example**:
```python
import requests
import json

response = requests.post(
    'http://localhost:3001/api/chat',
    json={
        'message': 'What is the EU AI Act?',
        'history': []
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        line_str = line.decode('utf-8')
        if line_str.startswith('data: '):
            data = json.loads(line_str[6:])
            print(data)
```

---

### 3. Tools Endpoint

Get a list of available MCP tools.

**Endpoint**: `GET /api/tools`

**Response**:
```json
{
  "tools": [
    {
      "name": "discover_organization",
      "description": "Discover and profile an organization for EU AI Act compliance..."
    },
    {
      "name": "discover_ai_services",
      "description": "Discover and classify AI systems within an organization..."
    },
    {
      "name": "assess_compliance",
      "description": "Assess EU AI Act compliance and generate documentation..."
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:3001/api/tools
```

---

## Message Types

### User Message
```typescript
interface UserMessage {
  role: "user";
  content: string;
}
```

### Assistant Message
```typescript
interface AssistantMessage {
  role: "assistant";
  content: string;
}
```

### System Message (internal)
```typescript
interface SystemMessage {
  role: "system";
  content: string;
}
```

---

## Tool Schemas

### discover_organization

**Description**: Research and profile an organization for EU AI Act compliance.

**Parameters**:
```typescript
{
  organizationName: string;     // Required
  domain?: string;              // Optional, auto-discovered
  context?: string;             // Optional, additional context
}
```

**Returns**:
```typescript
{
  organization: {
    name: string;
    sector: string;
    size: "SME" | "Large Enterprise" | "Public Body" | "Micro Enterprise";
    aiMaturityLevel: "Nascent" | "Developing" | "Advanced" | "Expert";
    // ... more fields
  },
  regulatoryContext: {
    applicableFrameworks: string[];
    complianceDeadlines: Array<{...}>;
    // ... more fields
  },
  metadata: {
    completenessScore: number;  // 0-100
    // ... more fields
  }
}
```

### discover_ai_services

**Description**: Discover and classify AI systems within an organization.

**Parameters**:
```typescript
{
  organizationContext?: any;    // Optional, from discover_organization
  systemNames?: string[];       // Optional, specific systems to discover
  scope?: string;               // Optional: 'all', 'high-risk-only', 'production-only'
  context?: string;             // Optional, additional context
}
```

**Returns**:
```typescript
{
  systems: Array<{
    system: {
      name: string;
      description: string;
      status: "Development" | "Testing" | "Production" | "Deprecated";
      // ... more fields
    },
    riskClassification: {
      category: "Unacceptable" | "High" | "Limited" | "Minimal";
      riskScore: number;  // 0-100
      annexIIICategory?: string;
      // ... more fields
    },
    complianceStatus: {
      // ... compliance fields
    }
  }>,
  riskSummary: {
    highRiskCount: number;
    limitedRiskCount: number;
    // ... more counts
  }
}
```

### assess_compliance

**Description**: Assess compliance and generate documentation.

**Parameters**:
```typescript
{
  organizationContext?: any;      // Optional, from discover_organization
  aiServicesContext?: any;        // Optional, from discover_ai_services
  focusAreas?: string[];          // Optional, specific areas to focus on
  generateDocumentation?: boolean; // Optional, default: true
}
```

**Returns**:
```typescript
{
  assessment: {
    overallScore: number;  // 0-100
    gaps: Array<{
      area: string;
      severity: "Critical" | "High" | "Medium" | "Low";
      article: string;
      description: string;
      recommendation: string;
    }>,
    recommendations: Array<{...}>
  },
  documentation?: {
    riskManagementTemplate: string;  // Markdown
    technicalDocumentation: string;   // Markdown
    conformityAssessment: string;     // Markdown
    transparencyNotice: string;       // Markdown
    // ... more templates
  },
  reasoning: string;  // Chain-of-thought explanation
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request**:
```json
{
  "error": "Message is required"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

### Error Types

1. **Missing Parameters**: 400 error when required parameters are not provided
2. **API Connection**: 500 error if OpenAI API is unreachable
3. **Rate Limiting**: 429 error if rate limits are exceeded
4. **Tool Execution**: 500 error if MCP tools fail

---

## Rate Limiting

Currently no rate limiting implemented. For production, consider adding:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## CORS Configuration

**Current Setup**:
```javascript
cors({
  origin: ["http://localhost:7860", "http://127.0.0.1:7860"],
  credentials: true,
})
```

**For Production**: Configure specific allowed origins:
```javascript
cors({
  origin: ["https://your-gradio-app.com"],
  credentials: true,
})
```

---

## WebSocket Support

Currently uses HTTP streaming (SSE). For WebSocket support, add:

```javascript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const { content, history } = JSON.parse(message);
    // Stream response via WebSocket
    for await (const chunk of result.textStream) {
      ws.send(JSON.stringify({ type: 'text', content: chunk }));
    }
  });
});
```

---

## Environment Variables

Required for API server:

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key

# Optional
TAVILY_API_KEY=tvly-your-tavily-api-key
PORT=3001

# For production
NODE_ENV=production
API_KEY=your-api-authentication-key
ALLOWED_ORIGINS=https://your-app.com
```

---

## Testing the API

### Using curl

**Health check**:
```bash
curl http://localhost:3001/health
```

**Simple chat**:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the EU AI Act?"}'
```

**Chat with history**:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more",
    "history": [
      {"role": "user", "content": "What is the EU AI Act?"},
      {"role": "assistant", "content": "The EU AI Act is..."}
    ]
  }'
```

### Using Postman

1. Create a new POST request to `http://localhost:3001/api/chat`
2. Set Headers: `Content-Type: application/json`
3. Set Body (raw JSON):
```json
{
  "message": "What is the EU AI Act?",
  "history": []
}
```
4. Send and view streaming response

---

## Monitoring and Logging

**Console Logs**:
- All requests are logged to console
- Tool executions are logged
- Errors are logged with stack traces

**Add Structured Logging**:
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});
```

---

## Security Best Practices

1. **Add Authentication**: Use API keys or JWT tokens
2. **Rate Limiting**: Prevent abuse
3. **Input Validation**: Sanitize all inputs
4. **HTTPS**: Use TLS in production
5. **CORS**: Restrict origins
6. **Secrets**: Never commit API keys
7. **Monitoring**: Log all requests and errors

---

## Performance Optimization

1. **Caching**: Cache organization/system discoveries
```javascript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 3600 });
```

2. **Compression**: Compress responses
```javascript
import compression from 'compression';
app.use(compression());
```

3. **Load Balancing**: Use multiple instances
4. **Queuing**: Implement job queue for long tasks

---

## Support

- 📖 Full documentation: See README.md
- 💬 Issues: GitHub Issues
- 🐛 Bug reports: Include API logs and request details


