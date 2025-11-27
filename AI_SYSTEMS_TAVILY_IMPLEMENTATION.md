# AI Systems Discovery with Tavily Integration

## Overview

The `scanForAISystems` function in `discover-ai-services.ts` has been updated to use **Tavily AI-powered research** instead of mock data. This provides real-time discovery of AI systems specific to the organization being analyzed.

## Key Changes

### 1. **Tavily Integration**
- Imports `tavily` from `@tavily/core`
- Uses `TAVILY_API_KEY` environment variable for authentication
- Performs advanced AI-powered searches to discover organization-specific AI systems

### 2. **Organization-Specific Search**
The implementation searches specifically for the target organization's AI systems:

```typescript
const searchQuery = systemNames && systemNames.length > 0
  ? `${organizationName} ${systemNames.join(" ")} AI systems artificial intelligence products services machine learning tools applications`
  : `${organizationName} AI systems artificial intelligence products services machine learning tools applications chatbot automation recruitment healthcare finance biometric`;
```

### 3. **Intelligent AI System Detection**
The system detects multiple types of AI systems based on keywords found in Tavily search results:

- **Recruitment AI Assistant** (High Risk)
  - Keywords: recruitment, hiring, resume, candidate, hr, job
  - Annex III, Point 4(a) - Employment systems

- **Customer Support Chatbot** (Limited Risk)
  - Keywords: chatbot, customer support, conversational, chat
  - Article 50 - Transparency obligations

- **Fraud Detection System** (High Risk)
  - Keywords: fraud, detection, security, anomaly
  - High-risk classification

- **Healthcare AI System** (High Risk)
  - Keywords: healthcare, medical, diagnosis, patient, clinical
  - Annex III, Point 5(b) - Healthcare systems

- **Credit Scoring System** (High Risk)
  - Keywords: credit, scoring, loan, financial, risk assessment
  - Annex III, Point 5(b) - Credit scoring

- **Biometric Identification** (High Risk)
  - Keywords: biometric, facial recognition, face, fingerprint
  - Annex III, Point 1 - Biometric systems

- **Recommendation Engine** (Minimal Risk)
  - Keywords: recommendation, personalization, content
  - No specific high-risk classification

- **Language Processing System** (Minimal Risk)
  - Keywords: translation, language, nlp, text processing
  - No specific high-risk classification

### 4. **Automatic Risk Classification**
Each discovered system is automatically classified according to EU AI Act requirements:

- **High Risk**: Systems falling under Annex III categories
- **Limited Risk**: Systems requiring transparency obligations (Article 50)
- **Minimal Risk**: Systems with no specific regulatory requirements

### 5. **EU AI Act Compliance Analysis**
For each discovered system, the implementation provides:

- Risk classification with Annex III category reference
- Justification based on EU AI Act articles
- Conformity assessment requirements
- Technical details (AI technology, data processed, integrations)
- Compliance status and identified gaps
- Regulatory deadlines

### 6. **Graceful Fallback**
If `TAVILY_API_KEY` is not configured or an error occurs:
- Falls back to minimal mock data
- Warns user to configure Tavily for real discovery
- Ensures the tool remains functional

## Usage

### Setting Up Tavily API Key

```bash
export TAVILY_API_KEY=tvly-YOUR_API_KEY
```

### Using the Discovery Tool

The tool automatically uses Tavily when the API key is configured:

```typescript
// Discover all AI systems for an organization
discover_ai_services({
  organizationContext: {
    organization: {
      name: "Acme Corp",
      // ... other fields
    }
  }
})

// Discover specific AI systems (user-specified)
discover_ai_services({
  organizationContext: {
    organization: {
      name: "Acme Corp",
      // ... other fields
    }
  },
  systemNames: ["recruitment platform", "customer chatbot", "credit scoring"]
})
```

### User-Specified Systems

When users specify which AI systems they want to check for compliance using the `systemNames` parameter:

1. **Focused Search**: Tavily search query includes the specific system names
2. **Filtered Results**: Only systems matching user specifications are returned
3. **Smart Matching**: System names are matched against:
   - Predefined system type patterns
   - Keywords in system descriptions
   - Direct mentions in search results
4. **Custom Extraction**: If no pattern matches, the tool attempts to extract information about the user-specified system directly from content

**Example:**

```typescript
// User wants to check compliance for specific systems
discover_ai_services({
  organizationContext: { /* ... */ },
  systemNames: ["resume screening AI", "interview bot"]
})

// Output: Only systems matching "resume screening" or "interview bot"
// - Recruitment AI Assistant (matches "resume screening")
// - Interview Bot (custom extraction from search results)
```

### Search Process

#### When No System Names Are Specified:

1. **Tavily Search**: Performs advanced search for organization's AI systems
2. **Content Analysis**: Analyzes search results for AI system keywords
3. **System Extraction**: Extracts information about all discovered AI systems
4. **Risk Classification**: Automatically classifies systems per EU AI Act
5. **Compliance Analysis**: Analyzes compliance gaps and requirements

#### When User Specifies System Names:

1. **Focused Tavily Search**: Search query includes specific system names
   - Example: `"Acme Corp recruitment platform customer chatbot AI systems..."`
2. **Content Analysis**: Analyzes search results for user-specified systems
3. **Smart Filtering**: 
   - Matches user-specified names against predefined patterns
   - Checks keywords (e.g., "chatbot" matches Customer Support Chatbot)
   - Searches for direct mentions in content
4. **Custom Extraction**: If no pattern matches:
   - Attempts to extract system information directly from search results
   - Infers risk category based on content analysis
   - Creates custom system profile
5. **Risk Classification**: Classifies only the user-specified systems
6. **Compliance Analysis**: Provides compliance analysis for matched systems

**Logging Example:**

```
🔍 Starting Tavily AI Systems Discovery:
Organization: Acme Corp
🎯 User-specified systems: recruitment platform, customer chatbot
   Focusing search on these specific systems...

📊 AI Systems Extraction Log:
========================================================
🎯 Filtering for user-specified systems: recruitment platform, customer chatbot
✅ Found: Recruitment AI Assistant
   ✓ Matches user-specified system requirement
✅ Found: Customer Support Chatbot
   ✓ Matches user-specified system requirement
⊘ Found Fraud Detection System but doesn't match user-specified systems, skipping...
========================================================
📊 Total systems discovered: 2
🎯 User requested: recruitment platform, customer chatbot
✅ Found: Recruitment AI Assistant, Customer Support Chatbot
```

## Example Output

When Tavily discovers AI systems for "Acme Corp":

```json
{
  "systems": [
    {
      "system": {
        "name": "Recruitment AI Assistant",
        "systemId": "rec-ai-001",
        "description": "AI system for resume screening and candidate ranking",
        "provider": {
          "name": "Acme Corp"
        }
      },
      "riskClassification": {
        "category": "High",
        "annexIIICategory": "Annex III, Point 4(a) - Employment",
        "riskScore": 85
      },
      "metadata": {
        "dataSource": "tavily-research",
        "researchSources": [
          "https://acme-corp.com/ai-solutions",
          "https://acme-corp.com/recruitment-platform"
        ]
      }
    }
  ]
}
```

## Benefits

### 🎯 **Real-Time Discovery**
- Discovers actual AI systems used by the organization
- No manual inventory required
- Always up-to-date information

### 🔍 **Organization-Specific**
- Searches specifically for the target organization
- Excludes unrelated AI systems from other companies
- Provides accurate organizational context

### 🎯 **User-Specified System Filtering**
- Users can specify exactly which systems to check
- Focused compliance analysis on systems of interest
- Reduces noise by filtering out irrelevant systems
- Smart matching against patterns and keywords
- Custom extraction for non-standard system names

### 📊 **Comprehensive Coverage**
- Detects 8+ different types of AI systems
- Covers high-risk, limited-risk, and minimal-risk categories
- Includes technical details and compliance analysis
- Adaptive to user requirements

### ✅ **EU AI Act Compliance**
- Automatic risk classification per Annex III
- Identifies applicable regulations and articles
- Provides compliance deadlines and effort estimates
- Focused analysis on user-specified systems

### 🛡️ **Reliable Fallback**
- Works without Tavily (mock data)
- Graceful error handling
- Clear warnings when API key is missing

## Tavily API Usage

- **Search Depth**: `advanced` (10 credits per search)
- **Max Results**: 10 results per search
- **Include Answer**: Yes (AI-generated summary)
- **Cost per Discovery**: ~10 credits
- **Free Tier**: 1,000 credits/month = ~100 organization scans

## Technical Implementation

### Functions Added

1. **`scanForAISystems()`** - Main discovery function with Tavily integration
   - Accepts `systemNames` parameter for user-specified filtering
   - Constructs focused search queries when specific systems requested
   - Logs user-specified system requirements

2. **`extractAISystemsFromResults()`** - Extracts AI systems from search results
   - Accepts `userSpecifiedSystems` parameter for filtering
   - Filters extracted systems to match user specifications
   - Falls back to custom extraction if patterns don't match

3. **`createAISystemProfile()`** - Creates structured AI system profiles from patterns

4. **`createCustomSystemProfile()`** - NEW: Creates profiles for user-specified systems
   - Handles systems that don't match predefined patterns
   - Infers risk category from system name and content
   - Provides custom system ID and metadata

5. **`buildRiskClassification()`** - Builds risk classification per EU AI Act

6. **`getAnnexIIICategory()`** - Maps systems to Annex III categories

7. **`getHighRiskJustification()`** - Provides regulatory justification

8. **`buildTechnicalDetails()`** - Constructs technical details per system type

9. **`buildComplianceStatus()`** - Analyzes compliance status

10. **`getMockSystems()`** - Fallback when Tavily unavailable

### Error Handling

- Checks for `TAVILY_API_KEY` presence
- Try-catch around Tavily API calls
- Falls back to mock data on errors
- Logs detailed error information

### Logging

Comprehensive logging for debugging:
- Search queries sent to Tavily
- Number of results returned
- Systems discovered
- Sources used
- Any errors encountered

## Testing

### Without Tavily (Mock Data)
```bash
cd packages/test-agent
pnpm dev
```

### With Tavily (Real Discovery)
```bash
export TAVILY_API_KEY=tvly-YOUR_API_KEY
cd packages/test-agent
pnpm dev
```

## Integration with EU AI Act

The discovered AI systems are mapped to EU AI Act requirements:

| System Type     | Risk Category | Annex III Reference     | Key Articles    |
| --------------- | ------------- | ----------------------- | --------------- |
| Recruitment AI  | High          | Point 4(a) - Employment | 6, 9-15, 43, 49 |
| Healthcare AI   | High          | Point 5(b) - Healthcare | 6, 9-15, 43, 49 |
| Credit Scoring  | High          | Point 5(b) - Financial  | 6, 9-15, 43, 49 |
| Biometric ID    | High          | Point 1 - Biometrics    | 6, 9-15, 43, 49 |
| Chatbot         | Limited       | Article 50              | 50              |
| Recommendations | Minimal       | N/A                     | 6               |

## Next Steps

1. **Test with Real Organizations**: Try discovering AI systems for known companies
2. **Refine Detection Patterns**: Add more system types based on real-world findings
3. **Enhance Classification**: Improve risk classification accuracy
4. **Add Caching**: Cache results to reduce API calls
5. **Improve Extraction**: Use more sophisticated NLP to extract system details

## Resources

- [Tavily Documentation](https://docs.tavily.com/)
- [EU AI Act Text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [EU AI Act Annex III](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689#d1e38-19-1)

---

**Implementation Complete** ✅

The `scanForAISystems` function now uses real Tavily AI-powered research to discover organization-specific AI systems instead of returning mock data.

