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

Maps your organization's structure, AI deployment context, and regulatory obligations.

```typescript
// Output Schema
{
  organization: {
    name: string;
    sector: string;
    size: "SME" | "Large Enterprise" | "Public Body";
    jurisdiction: string[];
    aiMaturityLevel: "Nascent" | "Developing" | "Advanced";
  },
  regulatoryContext: {
    applicableFrameworks: string[];
    complianceDeadlines: Date[];
    existingCertifications: string[];
  }
}
```

#### 2️⃣ `discover_ai_services`
**AI System Inventory & Classification**

Catalogs all AI systems in use and pre-classifies them according to AI Act risk tiers.

```typescript
// Output Schema
{
  services: [{
    name: string;
    description: string;
    purpose: string;
    riskCategory: "Unacceptable" | "High" | "Limited" | "Minimal";
    dataProcessed: string[];
    deploymentModel: "On-premise" | "Cloud" | "Hybrid";
    vendor: string | null;
  }],
  riskSummary: {
    highRiskCount: number;
    limitedRiskCount: number;
    minimalRiskCount: number;
  }
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
    riskManagementTemplate: string;
    technicalDocumentation: string;
    conformityAssessment: string;
    transparencyNotice: string;
  },
  reasoning: string; // Chain-of-thought explanation
}
```

### 🔗 MCP Integration

```json
{
  "mcpServers": {
    "eu-ai-act": {
      "command": "npx",
      "args": ["@eu-ai-act/mcp-server"]
    }
  }
}
```

---

## 🤖 Track 2: AI Compliance Agent

An interactive AI agent that guides organizations through the entire compliance journey.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Gradio UI                           │
│   ┌─────────────────────────────────────────────────┐   │
│   │  💬 Chat Interface                              │   │
│   │  📊 Compliance Dashboard                        │   │
│   │  📄 Document Preview                            │   │
│   └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel AI SDK Agent                        │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│   │   Planner   │→→│  Executor   │→→│  Reasoner   │    │
│   └─────────────┘  └─────────────┘  └─────────────┘    │
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
| **Guided Workflows**         | Step-by-step compliance journey                      |
| **Real-time Assessment**     | Instant feedback on compliance status                |
| **Document Generation**      | Auto-generated templates and reports                 |
| **Multi-language**           | Support for all EU official languages                |

### 🛠️ Tech Stack

- **[Vercel AI SDK](https://sdk.vercel.ai/)** — Agent orchestration and tool calling
- **[Gradio](https://gradio.app/)** — Interactive web UI
- **[MCP](https://modelcontextprotocol.io/)** — Tool integration protocol

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- API key for LLM provider

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/eu-ai-act-compliance.git

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Start the MCP server
pnpm --filter @eu-ai-act/mcp-server dev

# Start the Gradio agent (in another terminal)
pnpm --filter @eu-ai-act/agent dev
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

## 🏆 Hackathon Submission

This project is our entry to the **[MCP 1st Birthday Hackathon](https://huggingface.co/MCP-1st-Birthday)**.

| Category   | Our Entry                                 |
| ---------- | ----------------------------------------- |
| **Event**  | MCP 1st Birthday Hackathon                |
| **Tracks** | Track 1 (MCP Server) + Track 2 (AI Agent) |
| **Theme**  | Legal Tech / AI Governance                |
| **Status** | 🚧 In Development                          |

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

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the MCP 1st Birthday Hackathon**

<sub>Making AI compliance accessible to everyone 🇪🇺</sub>

</div>
