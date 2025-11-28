---
title: EU AI Act Compliance Agent
emoji: 🇪🇺
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: true
license: mit
tags:
  - mcp
  - agents
  - eu-ai-act
  - compliance
  - legal-tech
  - gradio
  - building-mcp-track-enterprise
  - mcp-in-action-track-enterprise
short_description: AI-powered EU AI Act compliance assessment with MCP tools
---

<div align="center">

# 🇪🇺 EU AI Act Compliance Agent

### MCP-Powered AI Agent for European AI Regulation Compliance

[![MCP 1st Birthday Hackathon](https://img.shields.io/badge/🎂_MCP-1st_Birthday_Hackathon-purple?style=for-the-badge)](https://huggingface.co/MCP-1st-Birthday)
[![Track 1](https://img.shields.io/badge/Track_1-MCP_Server-blue?style=for-the-badge)](#track-1-mcp-server)
[![Track 2](https://img.shields.io/badge/Track_2-AI_Agent-green?style=for-the-badge)](#track-2-ai-agent)

**Your intelligent assistant for navigating European AI regulation**

</div>

---

## 🎯 About

The **EU AI Act Compliance Agent** helps organizations understand and comply with the EU AI Act (Regulation 2024/1689).

### MCP Tools

| Tool                    | Purpose                                   | EU AI Act Articles |
| ----------------------- | ----------------------------------------- | ------------------ |
| `discover_organization` | Profile organization & regulatory context | Art. 16, 22, 49    |
| `discover_ai_services`  | Classify AI systems by risk level         | Art. 6, Annex III  |
| `assess_compliance`     | Generate gap analysis & documentation     | Art. 9-15, 43-50   |

---

## 🏆 Hackathon Submission

**[MCP 1st Birthday Hackathon](https://huggingface.co/MCP-1st-Birthday)**

- **Track 1**: MCP Server with compliance tools
- **Track 2**: AI Agent with Gradio UI

---

## 🚀 Example Queries

- "What is the EU AI Act?"
- "Analyze OpenAI's EU AI Act compliance"
- "Is a recruitment screening AI high-risk?"
- "Generate a transparency notice for our chatbot"

---

## 🛠️ Tech Stack

- **Vercel AI SDK v5** — Agent orchestration
- **AI Models** — Claude 4-5, GPT-5, or Grok 4-1 (user selectable)
- **Tavily AI** — Web research (required)
- **MCP** — Model Context Protocol
- **Gradio** — Web UI

---

## 🔐 Required Secrets

| Secret                      | Required | Description                                      |
| --------------------------- | -------- | ------------------------------------------------ |
| `TAVILY_API_KEY`            | Yes      | Tavily API key (get from https://app.tavily.com) |
| Model API Key (choose one): | Yes      | Select one model and provide its API key:        |
| `ANTHROPIC_API_KEY`         | Optional | For Claude 4-5 model                             |
| `OPENAI_API_KEY`            | Optional | For GPT-5 model                                  |
| `XAI_API_KEY`               | Optional | For Grok 4-1 model                               |

---

## 📅 EU AI Act Timeline

| Date        | Milestone              |
| ----------- | ---------------------- |
| Feb 2, 2025 | Prohibited AI ban      |
| Aug 2, 2025 | GPAI rules             |
| Aug 2, 2026 | High-risk requirements |
| Aug 2, 2027 | Full enforcement       |

---

<div align="center">

**Built with ❤️ for the MCP 1st Birthday Hackathon 🎂**

</div>

