# User-Specified AI Systems Discovery

## Overview

The EU AI Act MCP Server now supports **user-specified AI system discovery**, allowing users to identify exactly which AI systems they want to check for EU AI Act compliance.

## Feature Description

When users know which AI systems they want to analyze, they can now specify them by name through the `systemNames` parameter. The tool will:

1. **Focus the search** on those specific systems
2. **Filter results** to match user specifications
3. **Provide targeted compliance analysis** for only the requested systems
4. **Extract custom information** if systems don't match predefined patterns

## How It Works

### Step 1: User Specifies Systems

Users provide a list of AI system names they want to check:

```json
{
  "organizationContext": {
    "organization": {
      "name": "Acme Corp"
    }
  },
  "systemNames": [
    "recruitment platform",
    "customer chatbot",
    "credit scoring tool"
  ]
}
```

### Step 2: Focused Tavily Search

The system constructs a targeted search query:

```
"Acme Corp recruitment platform customer chatbot credit scoring tool AI systems artificial intelligence products services machine learning tools applications"
```

### Step 3: Smart Matching

The extracted systems are matched against user specifications using:

1. **Pattern Matching**: Checks predefined system type patterns
2. **Keyword Matching**: Matches against system keywords
3. **Content Matching**: Searches for direct mentions in results
4. **Fuzzy Matching**: Handles variations in naming

### Step 4: Custom Extraction

If no predefined pattern matches a user-specified system:

1. Searches for mentions in Tavily results
2. Infers risk category from content and name
3. Creates custom system profile
4. Provides compliance analysis

## Usage Examples

### Example 1: Specific High-Risk Systems

```typescript
// Check recruitment and credit scoring systems
discover_ai_services({
  organizationContext: {
    organization: { name: "FinTech Corp" }
  },
  systemNames: [
    "recruitment AI",
    "credit scoring system"
  ]
})
```

**Expected Result:**
- Recruitment AI Assistant (High Risk - Annex III, Point 4(a))
- Credit Scoring System (High Risk - Annex III, Point 5(b))
- Other systems filtered out

### Example 2: Customer-Facing Systems

```typescript
// Check customer interaction systems
discover_ai_services({
  organizationContext: {
    organization: { name: "E-Commerce Inc" }
  },
  systemNames: [
    "customer support bot",
    "product recommendation engine"
  ]
})
```

**Expected Result:**
- Customer Support Chatbot (Limited Risk - Article 50)
- Recommendation Engine (Minimal Risk)

### Example 3: Healthcare Systems

```typescript
// Check medical AI systems
discover_ai_services({
  organizationContext: {
    organization: { name: "HealthTech Solutions" }
  },
  systemNames: [
    "diagnostic AI",
    "patient monitoring system"
  ]
})
```

**Expected Result:**
- Healthcare AI System (High Risk - Annex III, Point 5(b))
- Patient monitoring system (custom extraction if not in patterns)

## Matching Logic

### Pattern-Based Matching

The system has predefined patterns for common AI systems:

| User Input | Matches Pattern | Result |
|-----------|----------------|--------|
| "recruitment" | Recruitment AI | ✅ Recruitment AI Assistant |
| "chatbot" | Customer Support | ✅ Customer Support Chatbot |
| "credit scoring" | Credit Scoring | ✅ Credit Scoring System |
| "facial recognition" | Biometric | ✅ Biometric Identification |

### Keyword-Based Matching

User inputs are matched against system keywords:

| User Input | Keyword Match | Result |
|-----------|--------------|--------|
| "hiring AI" | "recruitment", "hiring" | ✅ Recruitment AI |
| "chat assistant" | "chatbot", "chat" | ✅ Customer Support Chatbot |
| "fraud detection" | "fraud", "detection" | ✅ Fraud Detection System |

### Custom Extraction

When no pattern/keyword matches:

1. **Search Results**: Looks for mentions in Tavily search results
2. **Content Analysis**: Analyzes context to infer risk category
3. **Profile Creation**: Creates custom system profile with:
   - Inferred risk classification
   - EU AI Act compliance requirements
   - Technical details based on content

## Logging Output

When user-specified systems are provided, detailed logging shows the process:

```
🔍 Starting Tavily AI Systems Discovery:
Organization: Acme Corp
🎯 User-specified systems: recruitment platform, customer chatbot
   Focusing search on these specific systems...
Query: Acme Corp recruitment platform customer chatbot AI systems artificial...

✅ Tavily Search Complete
Answer length: 1234 characters
Results found: 8
Sources: https://acme-corp.com/ai-products, ...

📊 AI Systems Extraction Log:
========================================================
🎯 Filtering for user-specified systems: recruitment platform, customer chatbot

✅ Found: Recruitment AI Assistant
   ✓ Matches user-specified system requirement

✅ Found: Customer Support Chatbot
   ✓ Matches user-specified system requirement

⊘ Found Fraud Detection System but doesn't match user-specified systems, skipping...

⊘ Found Biometric Identification System but doesn't match user-specified systems, skipping...

========================================================
📊 Total systems discovered: 2
🎯 User requested: recruitment platform, customer chatbot
✅ Found: Recruitment AI Assistant, Customer Support Chatbot
```

## Benefits

### 🎯 Targeted Compliance Analysis
- Focus on systems that matter to the user
- Reduce noise and irrelevant information
- Get precise compliance requirements

### ⚡ Faster Results
- Less data to process and analyze
- Focused Tavily searches
- Quicker compliance assessments

### 💡 Flexible Discovery
- Works with various naming conventions
- Handles custom system names
- Adapts to organization-specific terminology

### 📊 Better Context
- Searches specifically for named systems
- Provides relevant organizational information
- Discovers actual implementation details

## MCP Tool Integration

The feature is available through the `discover_ai_services` MCP tool:

```json
{
  "tool": "discover_ai_services",
  "arguments": {
    "organizationContext": {
      "organization": {
        "name": "Company Name"
      }
    },
    "systemNames": [
      "system 1",
      "system 2"
    ]
  }
}
```

## API Schema

```typescript
interface DiscoverAIServicesInput {
  /** Organization context (from discover_organization or manual) */
  organizationContext?: OrganizationProfile;
  
  /** Specific system names to discover */
  systemNames?: string[];
  
  /** Scope of discovery (e.g., "all", "high-risk-only") */
  scope?: string;
}
```

## Use Cases

### 1. Compliance Audit
**Scenario**: Company wants to check specific systems before audit

```typescript
discover_ai_services({
  organizationContext: { /* ... */ },
  systemNames: [
    "recruitment AI platform",
    "credit decision engine",
    "biometric access control"
  ]
})
```

**Result**: Detailed compliance status for each high-risk system

### 2. New System Evaluation
**Scenario**: Planning to deploy new AI system

```typescript
discover_ai_services({
  organizationContext: { /* ... */ },
  systemNames: ["new medical diagnosis AI"]
})
```

**Result**: Risk classification and compliance requirements before deployment

### 3. Vendor Assessment
**Scenario**: Evaluating third-party AI services

```typescript
discover_ai_services({
  organizationContext: { organization: { name: "Vendor Corp" } },
  systemNames: ["vendor's chatbot platform", "vendor's analytics tool"]
})
```

**Result**: Compliance requirements for vendor's AI systems

### 4. Risk Mitigation
**Scenario**: Focus on high-risk systems only

```typescript
discover_ai_services({
  organizationContext: { /* ... */ },
  systemNames: [
    "employment decision system",
    "healthcare diagnostic tool",
    "financial scoring platform"
  ]
})
```

**Result**: High-risk system compliance analysis and remediation requirements

## Implementation Details

### Function Signatures

```typescript
async function scanForAISystems(
  orgContext?: OrganizationProfile,
  systemNames?: string[]
): Promise<AISystemProfile[]>

async function extractAISystemsFromResults(
  searchResults: any,
  organizationName: string,
  orgContext: OrganizationProfile | undefined,
  timestamp: string,
  userSpecifiedSystems?: string[]
): Promise<AISystemProfile[]>

function createCustomSystemProfile(
  systemName: string,
  organizationName: string,
  orgContext: OrganizationProfile | undefined,
  timestamp: string,
  searchResults: any,
  content: string
): AISystemProfile
```

### Filtering Logic

```typescript
// Check if system matches user request
if (userSpecifiedSystems && userSpecifiedSystems.length > 0) {
  matchesUserRequest = userSpecifiedSystems.some(userSystem => {
    const userSystemLower = userSystem.toLowerCase();
    return pattern.systemType.toLowerCase().includes(userSystemLower) ||
           userSystemLower.includes(pattern.systemType.toLowerCase().split(" ")[0]) ||
           pattern.keywords.some(keyword => 
             userSystemLower.includes(keyword) || 
             keyword.includes(userSystemLower)
           );
  });
}
```

## Testing

### Test Without Tavily

```bash
cd packages/test-agent
pnpm dev
```

### Test With Tavily and User-Specified Systems

```bash
export TAVILY_API_KEY=tvly-YOUR_API_KEY
cd packages/test-agent
pnpm dev
```

The test agent can be modified to test specific system names:

```typescript
// In packages/test-agent/src/index.ts
const result = await client.discoverAIServices({
  organizationContext: profile,
  systemNames: ["recruitment platform", "customer chatbot"]
});
```

## Error Handling

### No Matches Found

If user-specified systems aren't found:
- Attempts custom extraction from search results
- Logs detailed information about search process
- Returns empty array if absolutely no mentions found

### Tavily API Errors

If Tavily API fails:
- Falls back to mock data
- Logs error details
- Warns user to check API key

### Invalid System Names

If user provides invalid/unclear names:
- Attempts fuzzy matching
- Searches for partial matches
- Creates custom profiles with available information

## Best Practices

### 1. Use Descriptive Names

✅ Good:
- "recruitment AI platform"
- "customer support chatbot"
- "credit scoring system"

❌ Less effective:
- "AI tool"
- "system 1"
- "bot"

### 2. Include Context

✅ Good:
- "medical diagnosis AI"
- "employee performance evaluation system"

❌ Less effective:
- "diagnosis tool"
- "evaluation system"

### 3. Use Organization-Specific Names

✅ Good:
- Use actual product names if known
- "TalentScout AI" (if that's the actual name)

✅ Also good:
- Generic descriptions work too
- "recruitment platform"

## Future Enhancements

1. **Natural Language Queries**: Accept full questions
   - "What AI systems does Acme Corp use for hiring?"
   
2. **System Grouping**: Group related systems
   - "All customer-facing AI systems"
   
3. **Similarity Matching**: Better fuzzy matching
   - "recruitment" matches "hiring platform"
   
4. **Multi-Organization**: Check systems across multiple orgs
   - Compare compliance across vendors

## Resources

- [EU AI Act Full Text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Annex III: High-Risk AI Systems](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689#d1e38-19-1)
- [Article 50: Transparency Obligations](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1689#d1e40-146-1)
- [Tavily API Documentation](https://docs.tavily.com/)

---

**Feature Complete** ✅

Users can now specify exactly which AI systems they want to analyze for EU AI Act compliance, with smart matching and custom extraction capabilities.

