# @eu-ai-act/mcp-server

**MCP Server for EU AI Act Compliance**

A Model Context Protocol (MCP) server providing organization discovery and AI systems inventory tools for EU AI Act compliance, based on Regulation (EU) 2024/1689.

## Features

- 🏢 **Organization Discovery** - Discover and profile organizations for compliance assessment
- 🤖 **AI Systems Discovery** - Inventory and classify AI systems according to EU AI Act risk tiers
- ⚖️ **Compliance Analysis** - Gap analysis with specific Article references from the AI Act
- 📊 **Risk Classification** - Automated risk categorization (Unacceptable, High, Limited, Minimal)
- 📝 **Documentation Status** - Track technical documentation and conformity assessment requirements

## Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/mcp-1st-birthday-ai-act.git
cd mcp-1st-birthday-ai-act

# Install dependencies
pnpm install

# Build the MCP server
pnpm --filter @eu-ai-act/mcp-server build

# Run locally
pnpm --filter @eu-ai-act/mcp-server dev
```

### NPM Package (Coming Soon)

```bash
npm install -g @eu-ai-act/mcp-server
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "eu-ai-act": {
      "command": "npx",
      "args": ["-y", "@eu-ai-act/mcp-server"]
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "eu-ai-act": {
      "command": "node",
      "args": ["/path/to/packages/eu-ai-act-mcp/dist/index.js"]
    }
  }
}
```

### With ChatGPT Apps SDK

The MCP server is compatible with ChatGPT Apps SDK. Configuration example:

1. **Set up connector** in ChatGPT Settings → Apps & Connectors → Advanced settings
2. **Add connector URL**: `https://your-server.com/mcp` (requires HTTP/SSE deployment)
3. **Test the connection** using the test agent

For HTTP/SSE deployment, see the [ChatGPT App Deployment Guide](#chatgpt-app-deployment).

### Programmatic Usage

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "my-app", version: "1.0.0" }, { capabilities: {} });
const transport = new StdioClientTransport({
  command: "node",
  args: ["./node_modules/@eu-ai-act/mcp-server/dist/index.js"],
});

await client.connect(transport);

// Discover organization
const orgResult = await client.callTool({
  name: "discover_organization",
  arguments: {
    organizationName: "Acme AI Solutions GmbH",
    domain: "acme-ai.de",
  },
});

// Discover AI services
const servicesResult = await client.callTool({
  name: "discover_ai_services",
  arguments: {
    organizationContext: JSON.parse(orgResult.content[0].text),
    scope: "all",
  },
});
```

## Tools

### 1. `discover_organization`

Discovers and profiles an organization for EU AI Act compliance assessment.

**Input:**
```json
{
  "organizationName": "Acme AI Solutions GmbH",
  "domain": "acme-ai.de",
  "context": "German AI startup focused on healthcare solutions"
}
```

**Output Schema:**
```typescript
{
  organization: {
    name: string;
    registrationNumber?: string;
    sector: string;
    size: "SME" | "Large Enterprise" | "Public Body" | "Micro Enterprise";
    jurisdiction: string[];
    euPresence: boolean;
    headquarters: { country: string; city: string; address?: string };
    contact: { email: string; phone?: string; website?: string };
    aiMaturityLevel: "Nascent" | "Developing" | "Advanced" | "Expert";
    aiSystemsCount?: number;
    primaryRole: "Provider" | "Deployer" | "Importer" | "Distributor" | "Authorized Representative";
  };
  regulatoryContext: {
    applicableFrameworks: string[];
    complianceDeadlines: Array<{ date: string; description: string; article: string }>;
    existingCertifications: string[];
    hasAuthorizedRepresentative?: boolean;
    notifiedBodyId?: string;
    hasQualityManagementSystem: boolean;
    hasRiskManagementSystem: boolean;
  };
  metadata: {
    createdAt: string;
    lastUpdated: string;
    completenessScore: number;
    dataSource: string;
  };
}
```

**EU AI Act References:**
- Article 16 (Provider Obligations)
- Article 17 (Quality Management System)
- Article 22 (Authorized Representatives)
- Article 49 (Registration)

### 2. `discover_ai_services`

Discovers and classifies AI systems within an organization according to EU AI Act requirements.

**Input:**
```json
{
  "organizationContext": { /* from discover_organization */ },
  "systemNames": ["System A", "System B"],
  "scope": "all"
}
```

**Output Schema:**
```typescript
{
  systems: Array<{
    system: {
      name: string;
      systemId?: string;
      description: string;
      intendedPurpose: string;
      version: string;
      status: "Development" | "Testing" | "Production" | "Deprecated";
      provider: { name: string; role: string; contact: string };
    };
    riskClassification: {
      category: "Unacceptable" | "High" | "Limited" | "Minimal";
      annexIIICategory?: string;
      justification: string;
      safetyComponent: boolean;
      riskScore: number;
      conformityAssessmentRequired: boolean;
      conformityAssessmentType: "Internal Control" | "Third Party Assessment" | "Not Required" | "Pending";
    };
    technicalDetails: {
      aiTechnology: string[];
      dataProcessed: string[];
      processesSpecialCategoryData: boolean;
      deploymentModel: "On-premise" | "Cloud" | "Hybrid" | "Edge" | "SaaS";
      vendor?: string;
      trainingData?: { description: string; sources: string[]; biasAssessment: boolean };
      integrations: string[];
      humanOversight: { enabled: boolean; description?: string };
    };
    complianceStatus: {
      hasTechnicalDocumentation: boolean;
      conformityAssessmentStatus: "Not Started" | "In Progress" | "Completed" | "Not Required";
      hasEUDeclaration: boolean;
      hasCEMarking: boolean;
      registeredInEUDatabase: boolean;
      hasPostMarketMonitoring: boolean;
      hasAutomatedLogging: boolean;
      lastAssessmentDate?: string;
      identifiedGaps: string[];
    };
    metadata: {
      createdAt: string;
      lastUpdated: string;
      dataSource: string;
      discoveryMethod: string;
    };
  }>;
  riskSummary: {
    unacceptableRiskCount: number;
    highRiskCount: number;
    limitedRiskCount: number;
    minimalRiskCount: number;
    totalCount: number;
  };
  complianceSummary: {
    fullyCompliantCount: number;
    partiallyCompliantCount: number;
    nonCompliantCount: number;
    requiresAttention: Array</* AI System */>;
  };
  discoveryMetadata: {
    timestamp: string;
    method: string;
    coverage: string;
  };
}
```

**EU AI Act References:**
- Article 6 (Classification Rules)
- Article 9 (Risk Management System)
- Article 10 (Data Governance)
- Article 11 (Technical Documentation)
- Article 12 (Record-Keeping)
- Article 14 (Human Oversight)
- Article 43 (Conformity Assessment)
- Article 47 (EU Declaration of Conformity)
- Article 48 (CE Marking)
- Article 49 (Registration)
- Article 72 (Post-Market Monitoring)
- Annex III (High-Risk AI Systems)
- Annex IV (Technical Documentation Requirements)
- Annex VIII (Registration Information)

## Testing

Run the test agent to verify the MCP server:

```bash
# Run test agent
pnpm --filter @eu-ai-act/test-agent dev
```

The test agent will:
1. Connect to the MCP server
2. List available tools
3. Test organization discovery
4. Test AI services discovery
5. Display compliance gaps and recommendations

## ChatGPT App Deployment

To deploy as a ChatGPT App with HTTP/SSE transport:

1. **Create Express Server:**

```typescript
import express from 'express';
import cors from 'cors';
import { createChatGPTAppServer, handleMCPEndpoint, handleMCPMessages } from '@eu-ai-act/mcp-server/chatgpt-app';

const app = express();
app.use(cors());
app.use(express.json());

const mcpServer = createChatGPTAppServer({
  name: "EU AI Act Compliance",
  description: "EU AI Act compliance tools for organization and AI systems discovery",
  version: "0.1.0",
  baseUrl: "https://your-app.com"
});

app.get('/mcp', (req, res) => handleMCPEndpoint(mcpServer, req, res));
app.post('/mcp/messages', (req, res) => handleMCPMessages(mcpServer, req, res));

app.listen(3000, () => {
  console.log('MCP Server running on http://localhost:3000');
});
```

2. **Deploy to Cloud Provider** (Vercel, Railway, Render, etc.)

3. **Configure in ChatGPT:**
   - Go to Settings → Apps & Connectors → Advanced settings
   - Enable developer mode
   - Add connector with your deployment URL + `/mcp`
   - Test the connection

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Clients                           │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │
│   │  Claude  │  │ ChatGPT  │  │  Custom Client   │     │
│   │ Desktop  │  │   Apps   │  │   (MCP SDK)      │     │
│   └────┬─────┘  └────┬─────┘  └────────┬─────────┘     │
└────────┼─────────────┼─────────────────┼───────────────┘
         │             │                  │
         └─────────────┼──────────────────┘
                       ▼
         ┌─────────────────────────────┐
         │   MCP Protocol Layer        │
         │   (stdio / HTTP+SSE)        │
         └─────────────┬───────────────┘
                       ▼
         ┌─────────────────────────────┐
         │   EU AI Act MCP Server      │
         │                             │
         │  ┌─────────────────────┐    │
         │  │  discover_          │    │
         │  │  organization       │    │
         │  └─────────────────────┘    │
         │                             │
         │  ┌─────────────────────┐    │
         │  │  discover_          │    │
         │  │  ai_services        │    │
         │  └─────────────────────┘    │
         └─────────────────────────────┘
```

## Development

### Project Structure

```
packages/eu-ai-act-mcp/
├── src/
│   ├── index.ts              # Main MCP server (stdio)
│   ├── chatgpt-app.ts        # ChatGPT Apps SDK compatibility
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── schemas/
│   │   └── index.ts          # Zod validation schemas
│   └── tools/
│       ├── discover-organization.ts
│       └── discover-ai-services.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Adding New Tools

1. Define types in `src/types/index.ts`
2. Create Zod schema in `src/schemas/index.ts`
3. Implement tool in `src/tools/your-tool.ts`
4. Register tool in `src/index.ts`

## EU AI Act Compliance

This MCP server implements compliance tools based on:

- **Regulation (EU) 2024/1689** - EU Artificial Intelligence Act
- **Official Text**: [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689)

### Key Implementation Timeline

| Date | Requirement | Articles |
|------|-------------|----------|
| Feb 2, 2025 | Prohibited AI practices | Article 5 |
| Aug 2, 2025 | GPAI model obligations | Article 53 |
| Aug 2, 2026 | High-risk systems obligations (limited) | Articles 16-29 |
| Aug 2, 2027 | Full AI Act enforcement | All Articles |

### Supported Risk Categories

- **Unacceptable Risk** - Prohibited AI systems (Article 5)
- **High Risk** - Systems in Annex III requiring conformity assessment
- **Limited Risk** - Transparency obligations (Article 50)
- **Minimal Risk** - No specific obligations

## License

MIT License - see [LICENSE](../../LICENSE) file for details.

## Contributing

Contributions are welcome! This is a hackathon project for the MCP 1st Birthday Hackathon.

## Resources

- [EU AI Act Official Text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [AI Act Explorer](https://artificialintelligenceact.eu/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

**Built for the MCP 1st Birthday Hackathon** 🎂

