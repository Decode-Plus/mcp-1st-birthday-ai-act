# @eu-ai-act/mcp-server

**MCP Server for EU AI Act Compliance**

A Model Context Protocol (MCP) server providing organization discovery and AI systems inventory tools for EU AI Act compliance, based on Regulation (EU) 2024/1689.

## Features

- 🏢 **Organization Discovery** - Discover and profile organizations for compliance assessment
- 🤖 **AI Systems Discovery** - Inventory and classify AI systems according to EU AI Act risk tiers
- ⚖️ **Compliance Analysis** - Gap analysis with specific Article references from the AI Act
- 📊 **Risk Classification** - Automated risk categorization (Unacceptable, High, Limited, Minimal)
- 📝 **Documentation Status** - Track technical documentation and conformity assessment requirements
- 🧠 **AI-Powered Assessment** - Grok 4.1 reasoning powered compliance assessment with documentation generation

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

## Tavily AI Integration

This MCP server uses **Tavily AI** for intelligent company research and organization discovery. Tavily provides AI-powered web search optimized for LLMs and RAG systems.

### Setting up Tavily

1. **Get your Tavily API key** (free tier available):
   - Visit [https://app.tavily.com](https://app.tavily.com)
   - Sign up for a free account (1,000 API credits/month)
   - Copy your API key

2. **Configure the API key**:

   Create a `.env` file in the project root:
   ```bash
   TAVILY_API_KEY=tvly-YOUR_API_KEY
   XAI_API_KEY=xai-YOUR_XAI_KEY  # Required for assess_compliance tool
   ```

   Or set as environment variable:
   ```bash
   export TAVILY_API_KEY=tvly-YOUR_API_KEY
   export XAI_API_KEY=xai-YOUR_XAI_KEY
   ```

3. **For Claude Desktop**, add the environment variables to your config:

   ```json
   {
     "mcpServers": {
       "eu-ai-act": {
         "command": "node",
         "args": ["/path/to/packages/eu-ai-act-mcp/dist/index.js"],
         "env": {
           "TAVILY_API_KEY": "tvly-YOUR_API_KEY",
           "XAI_API_KEY": "xai-YOUR_XAI_KEY"
         }
       }
     }
   }
   ```

### How Tavily Enhances Organization Discovery

The `discover_organization` tool uses Tavily to perform multi-step research:

1. **Company Overview Search** - Discovers business model, products, services
2. **AI/Technology Search** - Identifies AI capabilities and maturity
3. **Compliance Search** - Finds existing certifications (GDPR, ISO 27001, etc.)

Tavily's advanced search depth provides:
- ✅ AI-generated summaries of company information
- ✅ Reliable source citations from company websites
- ✅ Automatic extraction of key business details
- ✅ Real-time web research (not limited to training data)

**Example with Tavily-powered discovery:**

```typescript
// When TAVILY_API_KEY is set, you get real company research
const result = await client.callTool({
  name: "discover_organization",
  arguments: {
    organizationName: "OpenAI",
    domain: "openai.com",
    context: "AI research company"
  }
});

// Result includes real research data:
// - Actual business sector and size
// - Real AI maturity assessment
// - Discovered certifications
// - Source URLs from Tavily
```

**Without Tavily**, the tool falls back to mock data for development purposes.

### Tavily Resources

- [Tavily Documentation](https://docs.tavily.com/)
- [Company Research Use Case](https://docs.tavily.com/examples/use-cases/company-research)
- [JavaScript SDK Reference](https://docs.tavily.com/sdk/javascript/reference)

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

### 3. `assess_compliance`

AI-powered compliance assessment and documentation generator using Grok 4.1 reasoning models.

**Input:**
```json
{
  "organizationContext": { /* from discover_organization */ },
  "aiServicesContext": { /* from discover_ai_services */ },
  "focusAreas": ["Technical Documentation", "Risk Management"],
  "generateDocumentation": true
}
```

**Output Schema:**
```typescript
{
  assessment: {
    overallScore: number;        // 0-100 compliance score
    riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    gaps: Array<{
      id: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      category: string;
      description: string;
      affectedSystems: string[];
      articleReference: string;
      currentState: string;
      requiredState: string;
      remediationEffort: "LOW" | "MEDIUM" | "HIGH";
      estimatedCost?: string;
      deadline?: string;
    }>;
    recommendations: Array<{
      id: string;
      priority: number;          // 1-10 (1 highest)
      title: string;
      description: string;
      articleReference: string;
      implementationSteps: string[];
      estimatedEffort: string;
      expectedOutcome: string;
      dependencies?: string[];
    }>;
    complianceByArticle: Record<string, {
      compliant: boolean;
      gaps: string[];
    }>;
  };
  documentation?: {
    riskManagementTemplate?: string;      // Article 9 - Markdown template
    technicalDocumentation?: string;       // Article 11 - Markdown template
    conformityAssessment?: string;         // Article 43 - Markdown template
    transparencyNotice?: string;           // Article 50 - Markdown template
    qualityManagementSystem?: string;      // Article 17 - Markdown template
    humanOversightProcedure?: string;      // Article 14 - Markdown template
    dataGovernancePolicy?: string;         // Article 10 - Markdown template
    incidentReportingProcedure?: string;   // Incident reporting template
  };
  reasoning: string;             // Chain-of-thought explanation
  metadata: {
    assessmentDate: string;
    assessmentVersion: string;
    modelUsed: string;           // e.g., "grok-4-1-fast-reasoning"
    organizationAssessed?: string;
    systemsAssessed: string[];
    focusAreas: string[];
  };
}
```

**EU AI Act References:**
- Article 9 (Risk Management System)
- Article 10 (Data Governance)
- Article 11 (Technical Documentation)
- Article 12 (Record-Keeping)
- Article 13 (Transparency)
- Article 14 (Human Oversight)
- Article 15 (Accuracy, Robustness, Cybersecurity)
- Article 17 (Quality Management System)
- Article 43 (Conformity Assessment)
- Article 49 (EU Database Registration)
- Article 50 (Transparency Obligations)
- Annex IV (Technical Documentation Requirements)

**Requirements:**
- `XAI_API_KEY` environment variable must be set
- Uses Grok 4.1 reasoning models for intelligent compliance analysis
- Generates professional documentation templates in Markdown

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
5. Test AI-powered compliance assessment (requires `XAI_API_KEY`)
6. Display compliance gaps and recommendations
7. Show generated documentation templates

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
         │                             │
         │  ┌─────────────────────┐    │
         │  │  assess_            │◄──┼──── xAI Grok 4.1 Reasoning
         │  │  compliance         │    │
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
│       ├── discover-organization.ts   # Tavily-powered org discovery
│       ├── discover-ai-services.ts    # AI systems inventory
│       └── assess-compliance.ts       # Grok 4.1 reasoning compliance assessment
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

| Date        | Requirement                             | Articles       |
| ----------- | --------------------------------------- | -------------- |
| Feb 2, 2025 | Prohibited AI practices                 | Article 5      |
| Aug 2, 2025 | GPAI model obligations                  | Article 53     |
| Aug 2, 2026 | High-risk systems obligations (limited) | Articles 16-29 |
| Aug 2, 2027 | Full AI Act enforcement                 | All Articles   |

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
- [xAI API Documentation](https://docs.x.ai/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

**Built for the MCP 1st Birthday Hackathon** 🎂

