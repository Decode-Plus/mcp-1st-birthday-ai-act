# Tavily AI Integration Example

This document demonstrates how the Tavily AI integration enhances organization discovery for EU AI Act compliance.

## Setup

1. **Get your Tavily API Key:**
   - Visit [https://app.tavily.com](https://app.tavily.com)
   - Sign up (free tier: 1,000 API credits/month)
   - Copy your API key

2. **Configure environment:**
   ```bash
   export TAVILY_API_KEY=tvly-YOUR_API_KEY
   ```

## Example 1: Discovering a Real Company

### Using with Claude Desktop

```bash
# In Claude Desktop, use the MCP tool:
discover_organization(
  organizationName="OpenAI",
  domain="openai.com",
  context="AI research company"
)
```

### Expected Output with Tavily

```json
{
  "organization": {
    "name": "OpenAI",
    "sector": "Technology",
    "size": "Enterprise",
    "jurisdiction": ["United States"],
    "euPresence": false,
    "headquarters": {
      "country": "United States",
      "city": "San Francisco"
    },
    "contact": {
      "email": "contact@openai.com",
      "website": "https://openai.com"
    },
    "aiMaturityLevel": "Leader",
    "aiSystemsCount": 0,
    "primaryRole": "Provider"
  },
  "regulatoryContext": {
    "applicableFrameworks": ["EU AI Act", "GDPR"],
    "complianceDeadlines": [...],
    "existingCertifications": ["SOC 2", "ISO 27001"],
    "hasQualityManagementSystem": true,
    "hasRiskManagementSystem": false
  },
  "metadata": {
    "createdAt": "2024-11-27T...",
    "lastUpdated": "2024-11-27T...",
    "completenessScore": 90,
    "dataSource": "tavily-research",
    "tavilyResults": {
      "overview": "OpenAI is an AI research and deployment company...",
      "aiCapabilities": "OpenAI develops advanced AI models including GPT-4...",
      "compliance": "OpenAI maintains SOC 2 Type II certification...",
      "sources": [
        "https://openai.com/about",
        "https://openai.com/security"
      ]
    }
  }
}
```

## Example 2: European Healthcare AI Company

```bash
# Discover a healthcare AI company
discover_organization(
  organizationName="Ada Health",
  domain="ada.com",
  context="Digital health AI diagnostic company"
)
```

### What Tavily Discovers:

1. **Company Overview Search:**
   - Business model: B2B2C health platform
   - Products: AI symptom checker, clinical decision support
   - Market: European healthcare market

2. **AI/Technology Search:**
   - AI capabilities: Medical AI, NLP for symptoms
   - Maturity: Mature AI operations
   - Technology stack: Machine learning models

3. **Compliance Search:**
   - GDPR compliance status
   - ISO 27001 certification
   - Medical device regulations (MDR)
   - Quality management systems

### Expected Classifications:

- **Risk Category:** High-risk (healthcare AI per Annex III)
- **EU Presence:** Yes (headquartered in Berlin)
- **Applicable Frameworks:** EU AI Act, GDPR, MDR
- **AI Maturity:** Mature

## Example 3: Without Tavily (Fallback Mode)

If `TAVILY_API_KEY` is not set, the tool falls back to mock data:

```json
{
  "organization": {
    "name": "Example Company",
    "sector": "Technology",
    "size": "SME",
    "jurisdiction": ["EU"],
    "euPresence": true,
    ...
  },
  "metadata": {
    "completenessScore": 40,
    "dataSource": "fallback-mock"
  }
}
```

## Multi-Step Research Process

The Tavily integration performs three parallel searches:

```typescript
// 1. Company Overview
tavily.search(
  "Company Name overview business model products services",
  { searchDepth: "advanced", maxResults: 5 }
)

// 2. AI Capabilities
tavily.search(
  "Company Name artificial intelligence AI machine learning",
  { searchDepth: "basic", maxResults: 3 }
)

// 3. Compliance Status
tavily.search(
  "Company Name GDPR compliance certifications ISO EU regulations",
  { searchDepth: "basic", maxResults: 3 }
)
```

## Key Benefits

### 🎯 Accurate Classification
- Real business sector identification (Healthcare, Finance, etc.)
- Actual company size (Startup, SME, Enterprise)
- Verified jurisdiction and EU presence

### 🔍 AI Maturity Assessment
- Detects AI leadership and pioneering companies
- Identifies mature vs. developing AI capabilities
- Discovers AI-powered products and services

### ✅ Compliance Discovery
- Finds existing certifications (ISO 27001, SOC 2, GDPR)
- Identifies quality management systems
- Discovers regulatory compliance status

### 📚 Source Citations
- Provides URLs to company information
- Includes AI-generated summaries
- Links to compliance documentation

## Tavily Search Parameters

The integration uses these optimized parameters:

| Parameter | Value | Reason |
|-----------|-------|--------|
| `searchDepth` | `"advanced"` for overview, `"basic"` for others | Balance between quality and API credits |
| `maxResults` | 5 for overview, 3 for others | Sufficient context without overload |
| `includeAnswer` | `true` | Get AI-generated summaries |
| `includeDomains` | Company domain when provided | Focus on official sources |

## API Credits Usage

- **Overview Search (advanced):** ~2 credits
- **AI Search (basic):** ~1 credit
- **Compliance Search (basic):** ~1 credit
- **Total per organization:** ~4 credits

With the free tier (1,000 credits/month), you can discover **~250 organizations per month**.

## Integration with EU AI Act

The discovered information directly maps to AI Act requirements:

| Tavily Data | AI Act Article | Purpose |
|-------------|----------------|---------|
| Company sector | Annex III | Determine if high-risk sector |
| AI capabilities | Article 6 | Risk classification |
| EU presence | Article 22 | Authorized representative need |
| Certifications | Article 17 | Quality management system |
| Company size | Article 16 | SME support measures |

## Testing the Integration

```bash
# Build the MCP server
cd packages/eu-ai-act-mcp
pnpm build

# Set your API key
export TAVILY_API_KEY=tvly-YOUR_API_KEY

# Run the test agent
cd ../test-agent
pnpm dev
```

The test agent will demonstrate the Tavily integration with real company research.

## Troubleshooting

### Issue: "TAVILY_API_KEY not set, using fallback mock data"

**Solution:** Set the environment variable:
```bash
export TAVILY_API_KEY=tvly-YOUR_API_KEY
```

### Issue: Low completeness scores

**Possible causes:**
- Company has limited public information
- Domain name doesn't match company name
- Recent startup with minimal web presence

**Solutions:**
- Provide more context in the `context` parameter
- Ensure correct domain is provided
- Check if company website is accessible

### Issue: API rate limiting

**Solution:** Monitor your Tavily dashboard for credit usage. Consider:
- Upgrading to a paid plan for higher limits
- Caching organization profiles to reduce API calls
- Using `searchDepth: "basic"` for all searches (saves credits)

## Resources

- [Tavily Documentation](https://docs.tavily.com/)
- [Tavily JavaScript SDK](https://docs.tavily.com/sdk/javascript/reference)
- [Company Research Use Case](https://docs.tavily.com/examples/use-cases/company-research)
- [EU AI Act Text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)

---

**Built for MCP 1st Birthday Hackathon** 🎂

