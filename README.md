<div align="center">

# 🇪🇺 EU AI Act Compliance Suite

### MCP Server & AI Agent for European AI Regulation Compliance

[![MCP 1st Birthday Hackathon](https://img.shields.io/badge/🎂_MCP-1st_Birthday_Hackathon-purple?style=for-the-badge)](https://huggingface.co/MCP-1st-Birthday)
[![Track 1](https://img.shields.io/badge/Track_1-MCP_Server-blue?style=for-the-badge)](#-track-1-mcp-server-for-ai-act-compliance)
[![Track 2](https://img.shields.io/badge/Track_2-AI_Agent-green?style=for-the-badge)](#-track-2-ai-compliance-agent)
[![EU AI Act](https://img.shields.io/badge/EU-AI_Act-gold?style=for-the-badge)](https://artificialintelligenceact.eu/)

<br />

<img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg" width="120" alt="EU Flag" />

<br />

**Empowering organizations to navigate AI regulation with intelligent tooling**

[Getting Started](#-getting-started) •
[Track 1: MCP Server](#-track-1-mcp-server-for-ai-act-compliance) •
[Track 2: AI Agent](#-track-2-ai-compliance-agent) •
[Demo](#-demo)

</div>

---

## 🎯 Overview

The **EU AI Act Compliance Suite** is our submission to the [MCP 1st Birthday Hackathon](https://huggingface.co/MCP-1st-Birthday). We're tackling the challenge of helping organizations comply with the **European Union's AI Act** — the world's first comprehensive AI regulation framework.

Our solution spans **two hackathon tracks**:

| Track       | Solution   | Description                                                    |
| ----------- | ---------- | -------------------------------------------------------------- |
| **Track 1** | MCP Server | A Model Context Protocol server providing compliance tools     |
| **Track 2** | AI Agent   | An intelligent agent with Gradio UI for interactive compliance |

---

## ⚖️ The Problem

The EU AI Act introduces strict requirements for AI systems deployed in Europe:

- 📋 **Complex Classification** — AI systems must be classified by risk level (Unacceptable, High, Limited, Minimal)
- 📝 **Documentation Requirements** — Extensive technical documentation and conformity assessments
- 🔍 **Transparency Obligations** — Clear disclosure when AI is being used
- ⏰ **Tight Deadlines** — Phased implementation starting 2024, full enforcement by 2027

**The challenge?** Most organizations lack the legal and technical expertise to navigate these requirements efficiently.

---

## 🛠️ Track 1: MCP Server for AI Act Compliance

Our MCP (Model Context Protocol) server provides **three powerful tools** that work together to automate compliance workflows:

### 🔧 Tools

#### 1️⃣ `discover_organization`
**Organization Discovery & Profiling**

Maps your organization's structure, AI deployment context, and regulatory obligations per **Article 16** (Provider Obligations), **Article 22** (Authorized Representatives), and **Article 49** (Registration Requirements).

```typescript
// Output Schema - Based on EU AI Act Annex VIII Registration Requirements
{
  organization: {
    name: string;
    registrationNumber?: string; // VAT/company registration number
    sector: string;
    size: "SME" | "Large Enterprise" | "Public Body" | "Micro Enterprise";
    jurisdiction: string[];
    euPresence: boolean; // Determines if authorized rep needed
    headquarters: {
      country: string;
      city: string;
      address?: string;
    };
    contact: {
      email: string; // Per Article 16(f) contact requirements
      phone?: string;
      website?: string;
    };
    aiMaturityLevel: "Nascent" | "Developing" | "Advanced" | "Expert";
    aiSystemsCount?: number;
    primaryRole: "Provider" | "Deployer" | "Importer" | "Distributor" | "Authorized Representative"; // Per Article 3(3)
  },
  regulatoryContext: {
    applicableFrameworks: string[];
    complianceDeadlines: Array<{
      date: string; // ISO 8601 format
      description: string;
      article: string; // AI Act article reference
    }>;
    existingCertifications: string[];
    hasAuthorizedRepresentative?: boolean; // Required for non-EU providers (Article 22)
    notifiedBodyId?: string; // If third-party assessment needed
    hasQualityManagementSystem: boolean; // Article 17 requirement
    hasRiskManagementSystem: boolean; // Article 9 requirement
  },
  metadata: {
    createdAt: string;
    lastUpdated: string;
    completenessScore: number; // 0-100
    dataSource: string;
  }
}
```

#### 2️⃣ `discover_ai_services`
**AI System Inventory & Classification**

Catalogs all AI systems and classifies them according to EU AI Act risk tiers per **Article 6** (Classification Rules) and **Annex III** (High-Risk AI Systems). Provides comprehensive compliance status per **Articles 11-15, 43, 47-49, 72**.

```typescript
// Output Schema - Based on EU AI Act Technical Documentation Requirements
{
  systems: Array<{
    system: {
      name: string;
      systemId?: string; // For EU database registration (Article 49)
      description: string;
      intendedPurpose: string; // Article 3(12) definition
      version: string;
      status: "Development" | "Testing" | "Production" | "Deprecated";
      provider: {
        name: string;
        role: "Provider" | "Deployer" | "Importer" | "Distributor";
        contact: string;
      };
    };
    riskClassification: {
      category: "Unacceptable" | "High" | "Limited" | "Minimal";
      annexIIICategory?: string; // Specific Annex III classification if high-risk
      justification: string; // Per Article 6(3) exemption documentation
      safetyComponent: boolean; // Article 6(1) safety component check
      riskScore: number; // 0-100 quantitative assessment
      conformityAssessmentRequired: boolean; // Article 43 requirement
      conformityAssessmentType: "Internal Control" | "Third Party Assessment" | "Not Required" | "Pending";
    };
    technicalDetails: {
      aiTechnology: string[]; // ML, DL, NLP, Computer Vision, etc.
      dataProcessed: string[]; // Types of data per Article 10
      processesSpecialCategoryData: boolean; // GDPR Article 9 special categories
      deploymentModel: "On-premise" | "Cloud" | "Hybrid" | "Edge" | "SaaS";
      vendor?: string;
      trainingData?: {
        description: string;
        sources: string[];
        biasAssessment: boolean; // Article 10(2)(f) bias mitigation
      };
      integrations: string[];
      humanOversight: {
        enabled: boolean; // Article 14 requirement
        description?: string;
      };
    };
    complianceStatus: {
      hasTechnicalDocumentation: boolean; // Article 11 & Annex IV
      conformityAssessmentStatus: "Not Started" | "In Progress" | "Completed" | "Not Required";
      hasEUDeclaration: boolean; // Article 47
      hasCEMarking: boolean; // Article 48
      registeredInEUDatabase: boolean; // Article 49 & Annex VIII
      hasPostMarketMonitoring: boolean; // Article 72
      hasAutomatedLogging: boolean; // Article 12
      lastAssessmentDate?: string;
      identifiedGaps: string[]; // Specific compliance gaps with article references
    };
    metadata: {
      createdAt: string;
      lastUpdated: string;
      dataSource: string;
      discoveryMethod: string;
    };
  }>;
  riskSummary: {
    unacceptableRiskCount: number; // Article 5 prohibited systems
    highRiskCount: number; // Annex III systems
    limitedRiskCount: number; // Article 50 transparency obligations
    minimalRiskCount: number;
    totalCount: number;
  };
  complianceSummary: {
    fullyCompliantCount: number;
    partiallyCompliantCount: number;
    nonCompliantCount: number;
    requiresAttention: Array</* Systems needing immediate action */>;
  };
  discoveryMetadata: {
    timestamp: string;
    method: string;
    coverage: string;
  };
}
```

#### 3️⃣ `assess_compliance`
**Compliance Assessment & Documentation Generator**

Takes organization and service context to produce:
- ✅ Gap analysis against AI Act requirements
- 📊 Risk-specific compliance checklists
- 📄 Draft documentation templates
- 💡 Remediation recommendations

```typescript
// Input: Output from tools 1 & 2
// Output:
{
  assessment: {
    overallScore: number; // 0-100
    gaps: GapAnalysis[];
    recommendations: Recommendation[];
  },
  documentation: {
    // ✅ Currently generated:
    riskManagementTemplate: string;   // Article 9
    technicalDocumentation: string;   // Article 11 / Annex IV
    // 🔜 Planned (not yet implemented):
    // conformityAssessment: string;
    // transparencyNotice: string;
    // qualityManagementSystem: string;
    // humanOversightProcedure: string;
    // dataGovernancePolicy: string;
    // incidentReportingProcedure: string;
  },
  reasoning: string; // Chain-of-thought explanation
}
```

> ⚠️ **Documentation Generation Note:** Currently generates **2 templates** (Risk Management & Technical Documentation) for API cost and speed optimization. Additional templates planned for future releases.

### 🔗 MCP Integration

```json
{
  "mcpServers": {
    "eu-ai-act": {
      "command": "npx",
      "args": ["@eu-ai-act/mcp-server"],
      "env": {
        "MODAL_ENDPOINT_URL": "https://vasilis--gpt-oss-vllm-inference-serve.modal.run",
        "TAVILY_API_KEY": "tvly-YOUR_API_KEY",
        "ANTHROPIC_API_KEY": "sk-ant-YOUR_KEY",
        "OPENAI_API_KEY": "sk-YOUR_KEY",
        "XAI_API_KEY": "xai-YOUR_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY": "AIza-YOUR_KEY"
      }
    }
  }
}
```

> 🆓 **Note:** 
> - **GPT-OSS is the default model** and is **FREE** - only needs `MODAL_ENDPOINT_URL` (no API key!)
> - Deploy your own: `cd modal && modal deploy gpt_oss_inference.py`
> - You only need to provide credentials for the model you want to use
> - Tavily API key is optional - enhances web research but AI model works as fallback

### 🔍 Tavily AI-Powered Company Research

The MCP server integrates with **[Tavily AI](https://tavily.com)** for intelligent, real-time company research during organization discovery. This enhancement transforms the `discover_organization` tool from mock data to **live web research**.

#### Why Tavily?

- **🎯 Optimized for LLMs** — Search results designed for AI agents and RAG systems
- **📊 Comprehensive Data** — Multi-step research (overview, AI capabilities, compliance)
- **✅ Source Citations** — Reliable URLs and AI-generated summaries
- **⚡ Fast & Efficient** — Advanced search depth with minimal API credits

#### What It Discovers:

| Research Area         | Information Extracted                           | EU AI Act Mapping                      |
| --------------------- | ----------------------------------------------- | -------------------------------------- |
| **Company Overview**  | Business model, sector, size, headquarters      | Article 16 (Provider obligations)      |
| **AI Capabilities**   | AI maturity level, ML/AI technologies, products | Article 6 (Risk classification)        |
| **Compliance Status** | ISO certifications, GDPR compliance, QMS        | Article 17 (Quality management)        |
| **EU Presence**       | Jurisdictions, European operations              | Article 22 (Authorized representative) |

#### Setup:

1. Get free API key from [app.tavily.com](https://app.tavily.com) (1,000 credits/month)
2. Set environment variable: `TAVILY_API_KEY=tvly-YOUR_API_KEY`
3. Run organization discovery — it now uses real company research!

**Example:**
```typescript
// With Tavily: Real company research with 90+ completeness score
discover_organization("OpenAI", "openai.com", "AI research company")

// Returns: Actual sector, real AI maturity, discovered certifications, source URLs
```

📖 **[See detailed examples →](packages/eu-ai-act-mcp/TAVILY_EXAMPLE.md)**

---

## 🤖 Track 2: AI Compliance Agent

An interactive AI agent that guides organizations through the entire compliance journey using **Gradio UI** and **Vercel AI SDK v5**.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Gradio Web UI (Python)                     │
│   ┌─────────────────────────────────────────────────┐   │
│   │  💬 Chat Interface                              │   │
│   │  📊 Compliance Dashboard                        │   │
│   │  📄 Document Preview & Export                   │   │
│   └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────┐
│         Express API + Vercel AI SDK v5 Agent            │
│   ┌─────────────────────────────────────────────────┐   │
│   │  Reasoning with Streaming & Tool Calling        │  │
│   │  - Context management                           │   │
│   │  - Multi-step workflows                         │   │
│   │  - Intelligent tool orchestration               │   │
│   └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Server (Track 1)                       │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │  discover_  │  │  discover_  │  │   assess_   │    │
│   │organization │  │ ai_services │  │ compliance  │    │
│   └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### ✨ Features

| Feature                      | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| **Conversational Interface** | Natural language interaction for non-technical users |
| **Streaming Responses**      | Real-time AI responses with progressive display      |
| **Contextual Awareness**     | Maintains full conversation history                  |
| **Guided Workflows**         | Step-by-step compliance journey with tool chaining   |
| **Real-time Assessment**     | Instant feedback on compliance status                |
| **Document Generation**      | Auto-generated templates and reports                 |
| **Export Options**           | Download compliance documentation                    |
| **Multi-Model Support**      | Choose between 5 AI models (see below)               |
| **Secure Key Storage**       | API keys stored in encrypted cookies (24h expiry)    |

### 🤖 Supported AI Models

| Model                 | Provider  | Description                            | Cost     | Default   |
| --------------------- | --------- | -------------------------------------- | -------- | --------- |
| 🆓 **GPT-OSS 20B**     | Modal.com | **FREE** reasoning model via Modal.com | **FREE** | ✅ **YES** |
| **Claude 4.5 Sonnet** | Anthropic | Excellent reasoning                    | Paid     | No        |
| **Claude Opus 4**     | Anthropic | Most powerful Claude model             | Paid     | No        |
| **GPT-5**             | OpenAI    | OpenAI's most advanced model           | Paid     | No        |
| **Grok 4.1**          | xAI       | Fast reasoning model                   | Paid     | No        |
| **Gemini 3 Pro**      | Google    | Advanced reasoning with thinking       | Paid     | No        |

> 🆓 **FREE by Default!** GPT-OSS 20B is the **default model** and requires **no API key** - just a Modal endpoint URL. The agent automatically uses GPT-OSS unless you select a different model. See [modal/README.md](modal/README.md) for deployment instructions.

### 🛠️ Tech Stack

- **[Vercel AI SDK v5](https://ai-sdk.dev/)** — Agent orchestration and tool calling (upgraded from v4)
- **[Gradio](https://gradio.app/)** — Interactive web UI with chat interface
- **[Express](https://expressjs.com/)** — REST API server
- **[MCP](https://modelcontextprotocol.io/)** — Tool integration protocol
- **[Modal.com](https://modal.com/)** — FREE LLM hosting for GPT-OSS
- **AI Models** — Choose from 6 models:
  - 🆓 GPT-OSS 20B (Modal.com) — **FREE default!**
  - Claude 4.5 Sonnet & Claude Opus 4 (Anthropic)
  - GPT-5 (OpenAI)
  - Grok 4.1 (xAI)
  - Gemini 3 Pro (Google)

### 🚀 Quick Start

**🆓 Start with FREE GPT-OSS (Default Model):**

```bash
# Install dependencies
pnpm install
cd apps/eu-ai-act-agent
pip3 install -r requirements.txt

# Deploy FREE GPT-OSS model on Modal.com (one-time setup)
cd ../../modal
pip install modal
modal setup  # Follow prompts to create account (first $30/month FREE)
modal deploy gpt_oss_inference.py
# Copy the endpoint URL (e.g., https://your-workspace--gpt-oss-vllm-inference-serve.modal.run)

# Set Modal endpoint (or paste in Gradio UI)
export MODAL_ENDPOINT_URL="https://your-workspace--gpt-oss-vllm-inference-serve.modal.run"

# Optional: Enhanced web research (not required - AI model works as fallback)
export TAVILY_API_KEY="tvly-your-tavily-key"  # Get from https://app.tavily.com

# Start everything
cd ../apps/eu-ai-act-agent
./start.sh
# Opens at http://localhost:7860 - GPT-OSS is already selected as default!
```

**💳 Or use a paid model (optional):**

```bash
# Set one of these instead of MODAL_ENDPOINT_URL:
# export ANTHROPIC_API_KEY="sk-ant-your-key"     # For Claude 4.5 or Claude Opus
# export OPENAI_API_KEY="sk-your-key"            # For GPT-5
# export XAI_API_KEY="xai-your-key"              # For Grok 4.1
# export GOOGLE_GENERATIVE_AI_API_KEY="AIza..."  # For Gemini 3 Pro
```

> 💡 **Tip:** 
> - **GPT-OSS is FREE and the default** - no API key needed, just the Modal endpoint URL
> - API keys and Modal endpoint can also be entered directly in the Gradio UI
> - Settings are securely stored in encrypted browser cookies and auto-expire after 24 hours
> - Modal.com offers **$30/month free credit** - perfect for trying out GPT-OSS!

See [apps/eu-ai-act-agent/QUICKSTART.md](apps/eu-ai-act-agent/QUICKSTART.md) for detailed instructions.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.9+ with uv (fast package manager)
- **Tavily API key** (optional) - Get your free API key from [app.tavily.com](https://app.tavily.com) for enhanced web research
- **Model selection** - Choose one of the following models:
  - 🆓 **GPT-OSS 20B** (Modal.com) - **FREE!** ✅ **DEFAULT MODEL** - Only needs `MODAL_ENDPOINT_URL`
  - **Claude 4.5 Sonnet** (Anthropic) - `ANTHROPIC_API_KEY` required
  - **Claude Opus 4** (Anthropic) - `ANTHROPIC_API_KEY` required
  - **GPT-5** (OpenAI) - `OPENAI_API_KEY` required
  - **Grok 4.1** (xAI) - `XAI_API_KEY` required
  - **Gemini 3 Pro** (Google) - `GOOGLE_GENERATIVE_AI_API_KEY` required

#### 🆓 Free Default Model: GPT-OSS via Modal.com

**GPT-OSS 20B is the default model** - no API key required! The agent automatically uses GPT-OSS unless you select a different model in the UI.

**Quick Setup (5 minutes):**

1. **Create a free account** at [modal.com](https://modal.com) (first **$30/month FREE**)
2. **Deploy the model:**
   ```bash
   cd modal
   pip install modal
   modal setup  # Follow prompts
   modal deploy gpt_oss_inference.py
   ```
3. **Copy the endpoint URL** (e.g., `https://your-workspace--gpt-oss-vllm-inference-serve.modal.run`)
4. **Set environment variable** or paste in Gradio UI:
   ```bash
   export MODAL_ENDPOINT_URL="https://your-workspace--gpt-oss-vllm-inference-serve.modal.run"
   ```

**That's it!** The agent will use GPT-OSS by default. No API keys needed! 🎉

See [modal/README.md](modal/README.md) for detailed deployment instructions and GPU options.

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/eu-ai-act-compliance.git

# Install uv (fast Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Node.js dependencies
pnpm install

# Install Python dependencies for agent
cd apps/eu-ai-act-agent
uv pip install -r requirements.txt
cd ../..

# Set up environment variables
cp .env.example .env
# Edit .env and add:
# - MODAL_ENDPOINT_URL (for FREE GPT-OSS) - Deploy via: cd modal && modal deploy gpt_oss_inference.py
# - OR Model API key (choose one based on your model):
#   * ANTHROPIC_API_KEY (for Claude 4.5 or Claude Opus)
#   * OPENAI_API_KEY (for GPT-5)
#   * XAI_API_KEY (for Grok 4.1)
#   * GOOGLE_GENERATIVE_AI_API_KEY (for Gemini 3 Pro)
# - TAVILY_API_KEY (optional) - Get from https://app.tavily.com for enhanced web research

# Build the MCP server
pnpm --filter @eu-ai-act/mcp-server build

# Start the AI Agent with Gradio UI
cd apps/eu-ai-act-agent
./start.sh
# Opens at http://localhost:7860
```

**Or run components separately:**

```bash
# Terminal 1: API Server
pnpm --filter @eu-ai-act/agent dev

# Terminal 2: Gradio UI
pnpm --filter @eu-ai-act/agent gradio
```

### Quick Start with Claude Desktop

Add to your Claude Desktop config:

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

---

## 🎬 Demo

<div align="center">

### Track 1: MCP Server in Action

*Using the compliance tools in Claude Desktop*

```
User: Analyze my organization's AI compliance status

Claude: I'll help you assess your AI Act compliance. Let me start by 
        discovering your organization profile...
        
        [Calling discover_organization]
        [Calling discover_ai_services]
        [Calling assess_compliance]
        
        Based on my analysis, your organization has 3 high-risk AI systems
        that require immediate attention. Here's your compliance roadmap...
```

### Track 2: AI Agent Interface

*Interactive Gradio dashboard for compliance management*

</div>

---

## 📚 EU AI Act Resources

- 📖 [Official EU AI Act Text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- 🎓 [AI Act Explorer](https://artificialintelligenceact.eu/)
- 📋 [High-Risk AI Systems List](https://artificialintelligenceact.eu/annex/3/)
- 📅 [Implementation Timeline](https://artificialintelligenceact.eu/implementation/)

---

## 🚀 Deployment

### Try the Live Demo

🎯 **[Launch EU AI Act Compliance Agent →](https://huggingface.co/spaces/MCP-1st-Birthday/eu-ai-act-compliance)**

### Deploy Your Own Instance

#### Option 1: Hugging Face Spaces (Recommended)

```bash
# Clone and deploy to HF Spaces
git clone https://github.com/your-org/eu-ai-act-compliance.git
cd eu-ai-act-compliance

# Run deployment script
./scripts/deploy-hf.sh --org YOUR_ORG --name eu-ai-act-compliance
```

#### Option 2: GitHub Actions (Auto-Deploy)

1. Fork this repository
2. Add `HF_TOKEN` secret to your GitHub repo
3. Push to `main` - auto-deploys to HF Spaces

#### Option 3: Docker

```bash
docker build -t eu-ai-act-compliance -f spaces/eu-ai-act-compliance/Dockerfile spaces/eu-ai-act-compliance
docker run -p 7860:7860 \
  -e TAVILY_API_KEY=your-tavily-key \
  -e ANTHROPIC_API_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  -e XAI_API_KEY=your-key \
  eu-ai-act-compliance
```

📖 **[Full Deployment Guide →](DEPLOYMENT.md)**

---

## 🏆 Hackathon Submission

This project is our entry to the **[MCP 1st Birthday Hackathon](https://huggingface.co/MCP-1st-Birthday)**.

| Category   | Our Entry                                                                       |
| ---------- | ------------------------------------------------------------------------------- |
| **Event**  | MCP 1st Birthday Hackathon                                                      |
| **Tracks** | Track 1 (MCP Server) + Track 2 (AI Agent)                                       |
| **Theme**  | Legal Tech / AI Governance                                                      |
| **Status** | ✅ Submitted                                                                     |
| **Demo**   | [HF Space](https://huggingface.co/spaces/MCP-1st-Birthday/eu-ai-act-compliance) |

### Submission Checklist

- [x] MCP Server with 3 compliance tools
- [x] AI Agent with Gradio UI
- [x] Deployed to Hugging Face Spaces
- [x] Documentation complete
- [ ] Social media post shared

---

## 👥 Team

<table>
  <tr>
    <td align="center">
      <strong>Team EU Compliance</strong><br/>
      <em>Building the future of AI governance</em>
    </td>
  </tr>
</table>


<div align="center">

**Built with ❤️ for the MCP 1st Birthday Hackathon**

<sub>Making AI compliance accessible to everyone 🇪🇺</sub>

</div>
