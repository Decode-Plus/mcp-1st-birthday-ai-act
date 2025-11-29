/**
 * Compliance Assessment Tool
 * Implements EU AI Act compliance analysis using AI-powered assessment
 * 
 * Uses Anthropic Claude, OpenAI GPT-5, xAI Grok 4, Google Gemini, or GPT-OSS via Vercel AI SDK to analyze:
 * - Gap analysis against AI Act requirements
 * - Risk-specific compliance checklists
 * - Draft documentation templates
 * - Remediation recommendations
 * 
 * Environment Variable:
 * - AI_MODEL: "gpt-oss" | "claude-4.5" | "claude-opus" | "gpt-5" | "grok-4-1" | "gemini-3" (default: "gpt-oss")
 * 
 * Supported Models:
 * - gpt-oss: OpenAI GPT-OSS 20B via Modal.com (FREE - requires MODAL_ENDPOINT_URL) - DEFAULT
 * - claude-4.5: Anthropic Claude Sonnet 4.5 (requires ANTHROPIC_API_KEY)
 * - claude-opus: Anthropic Claude Opus 4 (requires ANTHROPIC_API_KEY)
 * - gpt-5: OpenAI GPT-5 (requires OPENAI_API_KEY)
 * - grok-4-1: xAI Grok 4.1 Fast Reasoning (requires XAI_API_KEY)
 * - gemini-3: Google Gemini 3 Pro (requires GOOGLE_GENERATIVE_AI_API_KEY)
 * 
 * Research Integration:
 * - EU AI Act Regulation (EU) 2024/1689
 * - Articles 9-15 (High-Risk Requirements)
 * - Articles 16-22 (Provider Obligations)
 * - Articles 43-49 (Conformity Assessment)
 * - Article 50 (Transparency Obligations)
 * - Annex III (High-Risk Categories)
 * - Annex IV (Technical Documentation)
 */

import { streamText } from "ai";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  OrganizationProfile,
  AISystemsDiscoveryResponse,
  ComplianceAssessmentInput,
  ComplianceAssessmentResponse,
  GapAnalysis,
  Recommendation,
  ComplianceDocumentation,
} from "../types/index.js";
import { getModel } from "../utils/model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * EU AI Act Knowledge Base for AI context
 * Based on Regulation (EU) 2024/1689 - Official Journal L 2024/1689, 12.7.2024
 * Source: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689
 */
const EU_AI_ACT_CONTEXT = `
You are an expert EU AI Act compliance consultant. You have deep knowledge of:

**EU AI Act (Regulation (EU) 2024/1689)**

**Risk Classification (Article 6, Annex III):**
- Unacceptable Risk (Article 5): Prohibited AI practices including social scoring, manipulation, exploitation
- High-Risk (Annex III): Employment, education, credit, law enforcement, critical infrastructure, biometric, LEGAL/JUSTICE
- Limited Risk (Article 50): Transparency obligations for chatbots, emotion recognition, deepfakes
- Minimal Risk: General purpose AI with no specific obligations

**ANNEX III - HIGH-RISK AI SYSTEMS (Complete List):**
1. Biometrics (remote biometric identification, categorisation)
2. Critical infrastructure (safety components in water, gas, electricity, transport)
3. Education and vocational training (determining access, evaluating learning outcomes)
4. Employment and workers management (recruitment, task allocation, termination decisions)
5. Access to essential services (credit scoring, emergency services, health/life insurance)
6. Law enforcement (risk assessment, polygraphs, evidence reliability, profiling)
7. Migration, asylum, border control (polygraphs, risk assessment, verification of documents)
8. **Administration of justice and democratic processes:**
   - **Point 8(a): AI systems intended to assist a judicial authority in researching and interpreting facts and the law and in applying the law to a concrete set of facts, or to be used in a similar way in alternative dispute resolution**
   - Point 8(b): AI systems intended to influence the outcome of an election or referendum

**CRITICAL: Legal AI Systems Classification (Annex III, Point 8(a)):**
ANY AI system that provides:
- Legal advice or legal consulting
- Legal research assistance
- Legal document analysis or generation
- Contract review or analysis
- Legal case analysis
- Interpretation of laws or regulations
- Legal risk assessment
- Alternative dispute resolution assistance
- Compliance advice or guidance
Must be classified as HIGH RISK per Annex III, Point 8(a).

**High-Risk System Requirements (Articles 8-15):**
1. Article 9: Risk Management System - continuous process for identifying, analyzing, mitigating risks
2. Article 10: Data Governance - quality, representativeness, bias detection in training data
3. Article 11: Technical Documentation (Annex IV) - comprehensive system documentation
4. Article 12: Record-Keeping - automatic logging of system operation
5. Article 13: Transparency - clear information to users and deployers
6. Article 14: Human Oversight - appropriate human intervention mechanisms
7. Article 15: Accuracy, Robustness, Cybersecurity - performance and security requirements

**Provider Obligations (Articles 16-22):**
- Article 16: Provider obligations for high-risk AI
- Article 17: Quality Management System
- Article 22: Authorized Representative (for non-EU providers)

**Conformity Assessment (Articles 43-49):**
- Article 43: Conformity Assessment Procedures
- Article 47: EU Declaration of Conformity
- Article 48: CE Marking
- Article 49: EU Database Registration

**Key Deadlines:**
- February 2, 2025: Prohibited AI practices ban
- August 2, 2025: GPAI model obligations
- August 2, 2026: Full enforcement for high-risk systems

When analyzing compliance, always:
1. Reference specific articles and annexes
2. Provide actionable remediation steps
3. Prioritize gaps by severity (CRITICAL, HIGH, MEDIUM, LOW)
4. Generate documentation templates in markdown format
5. Calculate realistic compliance scores
6. ALWAYS classify legal/judicial AI systems as HIGH RISK per Annex III Point 8(a)
`;

/**
 * Generate compliance assessment prompt
 */
function generateAssessmentPrompt(
  organizationContext?: OrganizationProfile,
  aiServicesContext?: AISystemsDiscoveryResponse,
  focusAreas?: string[]
): string {
  let prompt = `${EU_AI_ACT_CONTEXT}\n\n`;
  
  prompt += "## TASK: Perform comprehensive EU AI Act compliance assessment\n\n";
  
  if (organizationContext) {
    prompt += `## ORGANIZATION CONTEXT:\n`;
    prompt += `- Name: ${organizationContext.organization.name}\n`;
    prompt += `- Sector: ${organizationContext.organization.sector}\n`;
    prompt += `- Size: ${organizationContext.organization.size}\n`;
    prompt += `- EU Presence: ${organizationContext.organization.euPresence}\n`;
    prompt += `- Jurisdiction: ${organizationContext.organization.jurisdiction.join(", ")}\n`;
    prompt += `- AI Maturity: ${organizationContext.organization.aiMaturityLevel}\n`;
    prompt += `- Quality Management System: ${organizationContext.regulatoryContext.hasQualityManagementSystem}\n`;
    prompt += `- Risk Management System: ${organizationContext.regulatoryContext.hasRiskManagementSystem}\n`;
    prompt += `- Existing Certifications: ${organizationContext.regulatoryContext.existingCertifications.join(", ") || "None"}\n\n`;
  }
  
  if (aiServicesContext) {
    prompt += `## AI SYSTEMS CONTEXT:\n`;
    prompt += `- Total Systems: ${aiServicesContext.riskSummary.totalCount}\n`;
    prompt += `- High-Risk Systems: ${aiServicesContext.riskSummary.highRiskCount}\n`;
    prompt += `- Limited-Risk Systems: ${aiServicesContext.riskSummary.limitedRiskCount}\n`;
    prompt += `- Minimal-Risk Systems: ${aiServicesContext.riskSummary.minimalRiskCount}\n`;
    prompt += `- Non-Compliant Systems: ${aiServicesContext.complianceSummary.nonCompliantCount}\n\n`;
    
    prompt += `### SYSTEMS DETAILS:\n`;
    for (const system of aiServicesContext.systems) {
      prompt += `\n**${system.system.name}**\n`;
      prompt += `- Purpose: ${system.system.intendedPurpose}\n`;
      prompt += `- Risk Category: ${system.riskClassification.category}\n`;
      prompt += `- Risk Score: ${system.riskClassification.riskScore}/100\n`;
      prompt += `- Technology: ${system.technicalDetails.aiTechnology.join(", ")}\n`;
      prompt += `- Conformity Assessment: ${system.complianceStatus.conformityAssessmentStatus}\n`;
      prompt += `- Technical Documentation: ${system.complianceStatus.hasTechnicalDocumentation ? "Yes" : "No"}\n`;
      prompt += `- EU Database Registration: ${system.complianceStatus.registeredInEUDatabase ? "Yes" : "No"}\n`;
      prompt += `- Identified Gaps: ${system.complianceStatus.identifiedGaps.length}\n`;
      
      if (system.complianceStatus.identifiedGaps.length > 0) {
        prompt += `- Key Gaps:\n`;
        for (const gap of system.complianceStatus.identifiedGaps.slice(0, 5)) {
          prompt += `  - ${gap}\n`;
        }
      }
    }
    prompt += "\n";
  }
  
  if (focusAreas && focusAreas.length > 0) {
    prompt += `## FOCUS AREAS:\n`;
    for (const area of focusAreas) {
      prompt += `- ${area}\n`;
    }
    prompt += "\n";
  }
  
  prompt += `## REQUIRED OUTPUT FORMAT (JSON):
{
  "overallScore": <number 0-100>,
  "riskLevel": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "gaps": [
    {
      "id": "<unique-id>",
      "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
      "category": "<category>",
      "description": "<detailed description>",
      "affectedSystems": ["<system names>"],
      "articleReference": "<EU AI Act article>",
      "currentState": "<current state description>",
      "requiredState": "<required state per regulation>",
      "remediationEffort": "<LOW|MEDIUM|HIGH>",
      "estimatedCost": "<cost range>",
      "deadline": "<compliance deadline>"
    }
  ],
  "recommendations": [
    {
      "id": "<unique-id>",
      "priority": <number 1-10>,
      "title": "<recommendation title>",
      "description": "<detailed description>",
      "articleReference": "<EU AI Act article>",
      "implementationSteps": ["<step 1>", "<step 2>", ...],
      "estimatedEffort": "<effort estimate>",
      "expectedOutcome": "<expected outcome>",
      "dependencies": ["<dependency ids>"]
    }
  ],
  "reasoning": "<detailed chain-of-thought explanation of the assessment>"
}

Analyze the organization and AI systems comprehensively. Provide specific, actionable insights.`;

  return prompt;
}

/**
 * Generate documentation templates prompt
 */
function generateDocumentationPrompt(
  organizationContext?: OrganizationProfile,
  aiServicesContext?: AISystemsDiscoveryResponse,
  assessmentResult?: { gaps: GapAnalysis[]; recommendations: Recommendation[] }
): string {
  let prompt = `${EU_AI_ACT_CONTEXT}\n\n`;
  
  prompt += "## TASK: Generate EU AI Act compliance documentation templates in MARKDOWN format\n\n";
  
  if (organizationContext) {
    prompt += `Organization: ${organizationContext.organization.name}\n`;
    prompt += `Sector: ${organizationContext.organization.sector}\n\n`;
  }
  
  if (aiServicesContext) {
    prompt += `Systems to document: ${aiServicesContext.systems.map(s => s.system.name).join(", ")}\n\n`;
  }
  
  if (assessmentResult) {
    prompt += `Key gaps to address: ${assessmentResult.gaps.length}\n`;
    prompt += `Priority recommendations: ${assessmentResult.recommendations.length}\n\n`;
  }
  
  prompt += `## REQUIRED OUTPUT FORMAT (JSON):
{
  "riskManagementTemplate": "<markdown template for Article 9 Risk Management System>",
  "technicalDocumentation": "<markdown template for Article 11 / Annex IV Technical Documentation>",
}

Generate comprehensive, professional documentation templates that:
1. Follow EU AI Act requirements exactly
2. Include placeholders for organization-specific information
3. Reference specific articles and annexes
4. Are ready to use with minimal modification
5. Include checklists where appropriate`;

  return prompt;
}

/**
 * HIGH-RISK KEYWORDS based on EU AI Act Annex III
 * Source: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202401689
 */
const HIGH_RISK_KEYWORDS = [
  // Annex III Point 8(a) - Administration of justice (LEGAL AI)
  "legal", "law", "lawyer", "attorney", "judicial", "justice", "court",
  "litigation", "contract", "compliance", "regulatory", "statute",
  "legal advice", "legal consulting", "legal assistant", "legal research",
  "dispute resolution", "arbitration", "mediation",
  // Annex III Point 4 - Employment
  "recruitment", "hiring", "hr", "human resources", "employee", "workforce",
  "resume", "cv", "candidate", "job application", "termination",
  // Annex III Point 5 - Essential services
  "credit", "scoring", "loan", "insurance", "financial risk",
  "creditworthiness", "emergency services",
  // Annex III Point 1 - Biometrics  
  "biometric", "facial recognition", "face recognition", "fingerprint",
  "identity verification", "remote identification",
  // Annex III Point 3 - Education
  "education", "student", "academic", "exam", "grading", "admission",
  // Annex III Point 6 - Law enforcement
  "law enforcement", "police", "crime", "profiling", "polygraph",
  // Annex III Point 2 - Critical infrastructure
  "critical infrastructure", "safety component", "water supply",
  "gas supply", "electricity", "transport",
  // Annex III Point 5(b) - Healthcare
  "healthcare", "medical", "diagnosis", "clinical", "patient", "health",
];

/**
 * Validate and fix risk classification consistency
 * Ensures that category, annexIIICategory, riskScore, and conformityAssessment are aligned
 * 
 * Rules per EU AI Act (Regulation (EU) 2024/1689):
 * - If annexIIICategory mentions "Annex III" or "High-Risk", category must be "High"
 * - If system involves legal/judicial AI (Annex III Point 8(a)), category must be "High"
 * - If riskScore >= 70, category should be "High"
 * - If riskScore >= 40 and < 70, category should be "Limited" (unless already "High")
 * - If conformityAssessmentRequired is true, category should be "High"
 * - "Unacceptable" overrides all other categories
 */
function validateRiskClassification(riskClassification: any, systemContext?: { name?: string; description?: string; intendedPurpose?: string }): any {
  if (!riskClassification) return riskClassification;
  
  const rc = { ...riskClassification };
  const annexIII = (rc.annexIIICategory || "").toLowerCase();
  const justification = (rc.justification || "").toLowerCase();
  
  // Build context string for keyword matching
  const contextString = [
    systemContext?.name || "",
    systemContext?.description || "",
    systemContext?.intendedPurpose || "",
    annexIII,
    justification,
  ].join(" ").toLowerCase();
  
  // Check for high-risk keywords from Annex III categories
  const matchedHighRiskKeywords = HIGH_RISK_KEYWORDS.filter(keyword => 
    contextString.includes(keyword.toLowerCase())
  );
  const hasHighRiskKeywords = matchedHighRiskKeywords.length > 0;
  
  // Special check for legal AI systems (Annex III Point 8(a))
  const isLegalAI = contextString.includes("legal") || 
                    contextString.includes("law") ||
                    contextString.includes("lawyer") ||
                    contextString.includes("attorney") ||
                    contextString.includes("judicial") ||
                    contextString.includes("justice") ||
                    contextString.includes("court") ||
                    contextString.includes("litigation") ||
                    contextString.includes("contract review") ||
                    contextString.includes("compliance advi") ||
                    contextString.includes("regulatory") ||
                    contextString.includes("dispute resolution");
  
  // Check for indicators of high-risk classification
  const hasAnnexIIIIndicator = 
    annexIII.includes("annex iii") || 
    annexIII.includes("annex-iii") ||
    annexIII.includes("high-risk") ||
    annexIII.includes("high risk");
  
  const hasHighRiskJustification =
    justification.includes("high-risk") ||
    justification.includes("high risk") ||
    justification.includes("annex iii");
  
  const hasHighRiskScore = rc.riskScore >= 70;
  const hasMediumRiskScore = rc.riskScore >= 40 && rc.riskScore < 70;
  const requiresConformity = rc.conformityAssessmentRequired === true;
  
  // Check for unacceptable risk indicators
  const hasUnacceptableIndicator =
    annexIII.includes("article 5") ||
    annexIII.includes("prohibited") ||
    annexIII.includes("unacceptable") ||
    justification.includes("prohibited") ||
    justification.includes("unacceptable") ||
    contextString.includes("social scoring") ||
    contextString.includes("manipulation");
  
  // Determine the correct category based on all indicators
  let correctedCategory = rc.category;
  let correctionReason = "";
  
  if (hasUnacceptableIndicator) {
    correctedCategory = "Unacceptable";
    correctionReason = "Unacceptable risk indicators (Article 5)";
  } else if (isLegalAI) {
    correctedCategory = "High";
    correctionReason = "Legal AI system per Annex III Point 8(a) - Administration of justice";
    // Update annexIIICategory to reflect correct classification
    rc.annexIIICategory = "Annex III, Point 8(a) - Administration of justice and democratic processes";
    rc.justification = "AI system intended to assist with legal matters, interpreting law, or applying law to facts. Per EU AI Act Annex III Point 8(a), such systems are classified as HIGH RISK.";
    rc.riskScore = Math.max(rc.riskScore || 0, 85);
  } else if (hasHighRiskKeywords) {
    correctedCategory = "High";
    correctionReason = `High-risk keywords detected: ${matchedHighRiskKeywords.slice(0, 3).join(", ")}`;
  } else if (hasAnnexIIIIndicator || hasHighRiskJustification || hasHighRiskScore || requiresConformity) {
    correctedCategory = "High";
    correctionReason = hasAnnexIIIIndicator ? `Annex III reference: "${rc.annexIIICategory}"` :
                       hasHighRiskJustification ? "High-risk justification found" :
                       hasHighRiskScore ? `Risk score: ${rc.riskScore} >= 70` :
                       "Conformity assessment required";
  } else if (hasMediumRiskScore && rc.category === "Minimal") {
    correctedCategory = "Limited";
    correctionReason = `Medium risk score: ${rc.riskScore}`;
  }
  
  // If category was corrected, log the change
  if (correctedCategory !== rc.category) {
    console.error(`[Risk Validation] Corrected category from "${rc.category}" to "${correctedCategory}"`);
    console.error(`  - Reason: ${correctionReason}`);
    if (systemContext?.name) {
      console.error(`  - System: ${systemContext.name}`);
    }
    
    rc.category = correctedCategory;
  }
  
  // Ensure conformity assessment fields are consistent with category
  if (rc.category === "High" || rc.category === "Unacceptable") {
    rc.conformityAssessmentRequired = true;
    if (!rc.conformityAssessmentType || rc.conformityAssessmentType === "Not Required") {
      rc.conformityAssessmentType = "Internal Control";
    }
    // Ensure minimum risk score for high-risk systems
    if (rc.riskScore < 70) {
      rc.riskScore = 75;
    }
  } else if (rc.category === "Minimal") {
    rc.conformityAssessmentRequired = false;
    rc.conformityAssessmentType = "Not Required";
  }
  
  return rc;
}

/**
 * Validate risk classifications for all systems in aiServicesContext
 * Passes system context (name, description, purpose) to enable keyword-based classification
 */
function validateAIServicesContext(context: any): any {
  if (!context || !context.systems) return context;
  
  const validatedSystems = context.systems.map((system: any) => {
    // Extract system context for keyword matching
    const systemContext = {
      name: system.system?.name || system.name || "",
      description: system.system?.description || system.description || "",
      intendedPurpose: system.system?.intendedPurpose || system.intendedPurpose || "",
    };
    
    return {
      ...system,
      riskClassification: validateRiskClassification(system.riskClassification, systemContext),
    };
  });
  
  // Recalculate risk summary based on validated categories
  const riskSummary = {
    unacceptableRiskCount: validatedSystems.filter((s: any) => s.riskClassification?.category === "Unacceptable").length,
    highRiskCount: validatedSystems.filter((s: any) => s.riskClassification?.category === "High").length,
    limitedRiskCount: validatedSystems.filter((s: any) => s.riskClassification?.category === "Limited").length,
    minimalRiskCount: validatedSystems.filter((s: any) => s.riskClassification?.category === "Minimal").length,
    totalCount: validatedSystems.length,
  };
  
  return {
    ...context,
    systems: validatedSystems,
    riskSummary,
  };
}

/**
 * Parse JSON response safely
 */
function parseJSONResponse<T>(content: string): T | null {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    // Try to parse without code blocks
    try {
      // Remove any leading/trailing non-JSON content
      const cleanedContent = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      return JSON.parse(cleanedContent) as T;
    } catch {
      console.error("Secondary parse also failed");
      return null;
    }
  }
}

/**
 * Calculate overall compliance score
 */
function calculateOverallScore(
  gaps: GapAnalysis[],
  aiServicesContext?: AISystemsDiscoveryResponse
): number {
  let score = 100;
  
  // Deduct points based on gap severity
  for (const gap of gaps) {
    switch (gap.severity) {
      case "CRITICAL":
        score -= 15;
        break;
      case "HIGH":
        score -= 10;
        break;
      case "MEDIUM":
        score -= 5;
        break;
      case "LOW":
        score -= 2;
        break;
    }
  }
  
  // Additional deductions based on system compliance
  if (aiServicesContext) {
    const nonCompliantRatio = 
      aiServicesContext.complianceSummary.nonCompliantCount / 
      Math.max(aiServicesContext.riskSummary.totalCount, 1);
    score -= Math.round(nonCompliantRatio * 20);
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Main compliance assessment function
 */
export async function assessCompliance(
  input: ComplianceAssessmentInput
): Promise<ComplianceAssessmentResponse> {
  let { organizationContext, aiServicesContext, focusAreas, generateDocumentation = true, model: modelParam } = input;
  
  // Normalize organizationContext - handle both full and simplified formats
  if (organizationContext && !organizationContext.organization) {
    // Model passed simplified format like { name: "IBM", sector: "Technology" }
    console.error("[assess_compliance] Normalizing simplified organization context");
    const ctx = organizationContext as unknown as Record<string, unknown>;
    organizationContext = {
      organization: {
        name: (ctx.name as string) || "Unknown",
        sector: (ctx.sector as string) || "Technology",
        size: ((ctx.size as string) || "Enterprise") as OrganizationProfile["organization"]["size"],
        jurisdiction: (ctx.jurisdiction as string[]) || ["EU"],
        euPresence: (ctx.euPresence as boolean) ?? true,
        headquarters: (ctx.headquarters as { country: string; city: string }) || { country: "Unknown", city: "Unknown" },
        contact: (ctx.contact as { email: string }) || { email: "unknown@example.com" },
        aiMaturityLevel: ((ctx.aiMaturityLevel as string) || "Developing") as OrganizationProfile["organization"]["aiMaturityLevel"],
        aiSystemsCount: (ctx.aiSystemsCount as number) || 0,
        primaryRole: ((ctx.primaryRole as string) || "Provider") as OrganizationProfile["organization"]["primaryRole"],
      },
      regulatoryContext: {
        applicableFrameworks: ["EU AI Act", "GDPR"],
        complianceDeadlines: [],
        existingCertifications: [],
        hasQualityManagementSystem: false,
        hasRiskManagementSystem: false,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        completenessScore: 50,
        dataSource: "normalized-input",
      },
    };
  }
  
  // Normalize aiServicesContext - handle simplified formats
  if (aiServicesContext && !aiServicesContext.riskSummary) {
    console.error("[assess_compliance] Normalizing simplified AI services context");
    const systems = aiServicesContext.systems || [];
    aiServicesContext = {
      systems: systems.map((s: any) => ({
        system: {
          name: s.name || "Unknown System",
          systemId: s.systemId || `sys-${Date.now()}`,
          description: s.description || "AI System",
          intendedPurpose: s.intendedPurpose || "General AI usage",
          version: s.version || "1.0.0",
          status: s.status || "Production",
          provider: s.provider || { name: "Unknown", role: "Provider", contact: "unknown@example.com" },
        },
        riskClassification: {
          category: s.riskLevel || s.riskCategory || "Minimal",
          safetyComponent: false,
          annexIIICategory: "N/A",
          justification: "Normalized from simplified input",
          riskScore: 50,
          conformityAssessmentRequired: false,
          conformityAssessmentType: "Not Required",
          regulatoryReferences: [],
        },
        technicalDetails: {
          aiTechnology: s.aiTechnology || ["Machine Learning"],
          dataProcessed: s.dataProcessed || ["User data"],
          processesSpecialCategoryData: false,
          deploymentModel: "Cloud",
          vendor: "Unknown",
          integrations: [],
          humanOversight: { enabled: true, description: "Human oversight in place" },
        },
        complianceStatus: {
          hasTechnicalDocumentation: false,
          conformityAssessmentStatus: "Not Started",
          hasEUDeclaration: false,
          hasCEMarking: false,
          registeredInEUDatabase: false,
          hasPostMarketMonitoring: false,
          hasAutomatedLogging: false,
          qualityManagementSystem: false,
          riskManagementSystem: false,
          identifiedGaps: s.complianceIssues || [],
          complianceDeadline: "2027-08-02",
          estimatedComplianceEffort: "To be determined",
        },
        metadata: {
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          dataSource: "normalized-input",
          discoveryMethod: "manual",
          researchSources: [],
        },
      })),
      riskSummary: {
        unacceptableRiskCount: 0,
        highRiskCount: systems.filter((s: any) => (s.riskLevel || s.riskCategory) === "High").length,
        limitedRiskCount: systems.filter((s: any) => (s.riskLevel || s.riskCategory) === "Limited").length,
        minimalRiskCount: systems.filter((s: any) => !s.riskLevel || s.riskLevel === "Minimal").length,
        totalCount: systems.length,
      },
      complianceSummary: {
        fullyCompliantCount: 0,
        partiallyCompliantCount: systems.length,
        nonCompliantCount: 0,
        requiresAttention: [],
        criticalGapCount: 0,
        highGapCount: 0,
        overallCompliancePercentage: 50,
      },
      regulatoryFramework: {
        legislation: "Regulation (EU) 2024/1689 - Artificial Intelligence Act",
        officialJournal: "OJ L 2024/1689, 12.7.2024",
        entryIntoForce: "August 1, 2024",
        implementationTimeline: "Phased through August 2, 2026",
        jurisdiction: "EU-wide",
      },
      complianceDeadlines: {
        highRisk: "August 2, 2026",
        limitedRisk: "June 2, 2026",
        generalGPAI: "August 2, 2026",
      },
      discoverySources: ["normalized-input"],
      discoveryMetadata: {
        timestamp: new Date().toISOString(),
        method: "normalized-from-input",
        coverage: `${systems.length} systems`,
        researchIntegration: "N/A",
        conformityAssessmentUrgency: "Review required",
      },
    };
  }
  
  // Validate and fix any risk classification inconsistencies in the input data
  if (aiServicesContext) {
    console.error("[assess_compliance] Validating risk classifications for consistency...");
    aiServicesContext = validateAIServicesContext(aiServicesContext);
  }
  
  console.error("\n🔍 Starting EU AI Act Compliance Assessment");
  console.error("=".repeat(60));
  
  if (organizationContext?.organization) {
    console.error(`📋 Organization: ${organizationContext.organization.name}`);
  }
  if (aiServicesContext?.riskSummary) {
    console.error(`🤖 AI Systems: ${aiServicesContext.riskSummary.totalCount} total`);
    console.error(`   - High-Risk: ${aiServicesContext.riskSummary.highRiskCount}`);
    console.error(`   - Limited-Risk: ${aiServicesContext.riskSummary.limitedRiskCount}`);
  }
  console.error("-".repeat(60));
  
  const model = getModel(modelParam, undefined, "assess_compliance");
  const now = new Date().toISOString();
  
  // Step 1: Generate compliance assessment using Grok 4
  console.error("\n🧠 Analyzing compliance (streaming thinking tokens)...");
  
  const assessmentPrompt = generateAssessmentPrompt(
    organizationContext,
    aiServicesContext,
    focusAreas
  );
  
  // Use streamText to get thinking tokens in real-time
  const assessmentStream = streamText({
    model,
    system: "You are an expert EU AI Act compliance consultant. Provide detailed, actionable compliance assessments in valid JSON format only. Always respond with a valid JSON object.",
    prompt: assessmentPrompt,
    temperature: 0.3,
    // Reduce reasoning effort to prevent timeouts (LOW for speed)
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled", budgetTokens: 1500 },  // Minimal thinking budget for Claude - faster
      },
      openai: {
        reasoningEffort: "low",  // Low reasoning effort for GPT - much faster
      },
      google: {
        thinkingConfig: {
          thinkingLevel: "low",  // Low thinking for faster responses
          includeThoughts: true,
        },
      },
    },
  });
  
  // Stream and log thinking tokens as they come
  let assessmentContent = "";
  console.error("\n--- Model Thinking (Assessment) ---");
  
  for await (const event of assessmentStream.fullStream) {
    // Handle reasoning tokens (Claude uses reasoning-signature, others may use different types)
    if ((event as any).type === "reasoning" || (event as any).type === "reasoning-signature") {
      const reasoning = (event as any).textDelta ?? (event as any).reasoning ?? (event as any).signature ?? "";
      if (reasoning) {
        process.stderr.write(`💭 ${reasoning}`);
      }
    } else if (event.type === "text-delta") {
      const text = (event as any).textDelta ?? "";
      assessmentContent += text;
      // Also log text as it streams
      process.stderr.write(text);
    }
  }
  
  console.error("\n--- End Thinking ---\n");
  
  // Ensure we have the full text
  const finalResult = await assessmentStream;
  assessmentContent = assessmentContent || (await finalResult.text) || "{}";
  const assessmentData = parseJSONResponse<{
    overallScore: number;
    riskLevel: string;
    gaps: GapAnalysis[];
    recommendations: Recommendation[];
    reasoning: string;
  }>(assessmentContent);
  
  if (!assessmentData) {
    throw new Error("Failed to parse compliance assessment from Grok 4");
  }
  
  console.error(`✅ Assessment complete: Score ${assessmentData.overallScore}/100`);
  console.error(`   Risk Level: ${assessmentData.riskLevel}`);
  console.error(`   Gaps Found: ${assessmentData.gaps.length}`);
  console.error(`   Recommendations: ${assessmentData.recommendations.length}`);
  
  // Calculate final score (may adjust based on our own analysis)
  const calculatedScore = calculateOverallScore(
    assessmentData.gaps,
    aiServicesContext
  );
  
  // Use AI-assessed score if available, otherwise use calculated
  const finalScore = assessmentData.overallScore || calculatedScore;
  
  // Step 2: Generate documentation templates if requested
  let documentation: ComplianceDocumentation | undefined;
  let documentationFilePaths: string[] = [];
  
  if (generateDocumentation) {
    console.error("\n📄 Generating documentation templates (streaming thinking tokens)...");
    
    const docPrompt = generateDocumentationPrompt(
      organizationContext,
      aiServicesContext,
      { gaps: assessmentData.gaps, recommendations: assessmentData.recommendations }
    );
    
    // Use streamText to get thinking tokens in real-time
    const docStream = streamText({
      model,
      system: "You are an expert EU AI Act compliance documentation specialist. Generate professional documentation templates in valid JSON format with markdown content. Always respond with a valid JSON object.",
      prompt: docPrompt,
      temperature: 0.2,
      // Reduce reasoning effort to prevent timeouts (LOW for speed)
      providerOptions: {
        anthropic: {
          thinking: { type: "enabled", budgetTokens: 1500 },  // Minimal thinking budget for Claude - faster
        },
        openai: {
          reasoningEffort: "low",  // Low reasoning effort for GPT - much faster
        },
        google: {
          thinkingConfig: {
            thinkingLevel: "low",  // Low thinking for faster responses
            includeThoughts: true,
          },
        },
      },
    });
    
    // Stream and log thinking tokens as they come
    let docContent = "";
    console.error("\n--- Model Thinking (Documentation) ---");
    
    for await (const event of docStream.fullStream) {
      // Handle reasoning tokens (Claude uses reasoning-signature, others may use different types)
      if ((event as any).type === "reasoning" || (event as any).type === "reasoning-signature") {
        const reasoning = (event as any).textDelta ?? (event as any).reasoning ?? (event as any).signature ?? "";
        if (reasoning) {
          process.stderr.write(`💭 ${reasoning}`);
        }
      } else if (event.type === "text-delta") {
        const text = (event as any).textDelta ?? "";
        docContent += text;
        // Also log text as it streams
        process.stderr.write(text);
      }
    }
    
    console.error("\n--- End Thinking ---\n");
    
    // Ensure we have the full text
    const finalDocResult = await docStream;
    docContent = docContent || (await finalDocResult.text) || "{}";
    
    documentation = parseJSONResponse<ComplianceDocumentation>(docContent) || undefined;
    
    if (documentation) {
      console.error("✅ Documentation templates generated");
      console.error("\n💾 Saving documentation files...");
      
      // Save all documentation as markdown files
      try {
        documentationFilePaths = await saveDocumentationFiles(
          documentation,
          {
            overallScore: finalScore,
            riskLevel: assessmentData.riskLevel,
            gaps: assessmentData.gaps,
            recommendations: assessmentData.recommendations,
          },
          organizationContext?.organization.name,
          aiServicesContext?.systems.map(s => s.system.name)
        );
        console.error(`✅ Saved ${documentationFilePaths.length} documentation files`);
      } catch (error) {
        console.error("⚠️  Warning: Failed to save documentation files:", error);
        // Continue even if file saving fails
      }
    }
  }
  
  // Determine which model was used for metadata
  const modelEnv = modelParam || process.env.AI_MODEL || "claude-4.5";
  const modelUsed = modelEnv === "gpt-5" 
    ? "openai-gpt-5" 
    : modelEnv === "claude-4.5"
    ? "anthropic-claude-sonnet-4-5"
    : modelEnv === "claude-opus"
    ? "anthropic-claude-opus-4-5"
    : modelEnv === "gemini-3"
    ? "google-gemini-3-pro"
    : "xai-grok-4-1-fast-reasoning";
  
  // Build response
  const response: ComplianceAssessmentResponse = {
    assessment: {
      overallScore: finalScore,
      riskLevel: assessmentData.riskLevel as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      gaps: assessmentData.gaps,
      recommendations: assessmentData.recommendations,
      complianceByArticle: generateComplianceByArticle(assessmentData.gaps),
    },
    documentation,
    reasoning: assessmentData.reasoning,
    metadata: {
      assessmentDate: now,
      assessmentVersion: "1.0.0",
      modelUsed,
      organizationAssessed: organizationContext?.organization.name,
      systemsAssessed: aiServicesContext?.systems.map(s => s.system.name) || [],
      focusAreas: focusAreas || [],
      documentationFiles: documentationFilePaths.length > 0 ? documentationFilePaths : undefined,
    },
  };
  
  console.error("\n" + "=".repeat(60));
  console.error("✅ Compliance Assessment Complete");
  console.error(`🤖 Model Used: ${modelUsed}`);
  console.error(`📊 Final Score: ${finalScore}/100`);
  console.error(`⚠️  Total Gaps: ${assessmentData.gaps.length}`);
  console.error(`💡 Recommendations: ${assessmentData.recommendations.length}`);
  
  // Output documentation template summary
  if (documentation) {
    console.error("\n📄 Documentation Templates Generated:");
    if (documentation.riskManagementTemplate) console.error("   ✓ Risk Management System Template (Article 9)");
    if (documentation.technicalDocumentation) console.error("   ✓ Technical Documentation Template (Article 11/Annex IV)");
  }
  
  console.error("=".repeat(60) + "\n");
  
  return response;
}

/**
 * Save markdown documentation files
 */
async function saveDocumentationFiles(
  documentation: ComplianceDocumentation,
  assessment: {
    overallScore: number;
    riskLevel: string;
    gaps: GapAnalysis[];
    recommendations: Recommendation[];
  },
  organizationName?: string,
  systemsAssessed?: string[]
): Promise<string[]> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const orgName = organizationName?.replace(/[^a-zA-Z0-9]/g, "_") || "Organization";
  
  // Use process.cwd() to save in the project root's compliance-docs directory
  // This ensures files are accessible regardless of where the code runs from
  const projectRoot = process.cwd();
  const docsDir = join(projectRoot, "compliance-docs", `${orgName}_${timestamp}`);
  
  // Create directory
  await mkdir(docsDir, { recursive: true });
  
  const filePaths: string[] = [];
  
  // Save individual documentation templates
  const docFiles: Array<{ name: string; content: string | undefined; article?: string }> = [
    { name: "01_Risk_Management_System", content: documentation.riskManagementTemplate, article: "Article 9" },
    { name: "02_Technical_Documentation", content: documentation.technicalDocumentation, article: "Article 11 / Annex IV" },
  ];
  
  for (const doc of docFiles) {
    if (doc.content) {
      const filePath = join(docsDir, `${doc.name}.md`);
      const header = doc.article 
        ? `# ${doc.name.replace(/_/g, " ")}\n\n**EU AI Act Reference:** ${doc.article}\n\n---\n\n`
        : `# ${doc.name.replace(/_/g, " ")}\n\n---\n\n`;
      await writeFile(filePath, header + doc.content, "utf-8");
      filePaths.push(filePath);
      console.error(`   💾 Saved: ${doc.name}.md`);
    }
  }
  
  // Generate comprehensive compliance report
  const reportPath = join(docsDir, "00_Compliance_Assessment_Report.md");
  const reportContent = generateComplianceReport(
    assessment,
    organizationName,
    systemsAssessed
  );
  await writeFile(reportPath, reportContent, "utf-8");
  filePaths.unshift(reportPath); // Add at beginning
  console.error(`   💾 Saved: Compliance Assessment Report`);
  
  return filePaths;
}

/**
 * Generate comprehensive compliance report markdown
 */
function generateComplianceReport(
  assessment: {
    overallScore: number;
    riskLevel: string;
    gaps: GapAnalysis[];
    recommendations: Recommendation[];
  },
  organizationName?: string,
  systemsAssessed?: string[]
): string {
  const now = new Date().toISOString();
  
  let report = `# EU AI Act Compliance Assessment Report\n\n`;
  report += `**Assessment Date:** ${new Date(now).toLocaleDateString()}\n`;
  report += `**Organization:** ${organizationName || "Not Specified"}\n`;
  report += `**AI Systems Assessed:** ${systemsAssessed?.join(", ") || "Not Specified"}\n\n`;
  report += `---\n\n`;
  
  // Executive Summary
  report += `## Executive Summary\n\n`;
  report += `**Overall Compliance Score:** ${assessment.overallScore}/100\n\n`;
  report += `**Risk Level:** ${assessment.riskLevel}\n\n`;
  report += `**Total Gaps Identified:** ${assessment.gaps.length}\n`;
  report += `**Priority Recommendations:** ${assessment.recommendations.length}\n\n`;
  
  // Risk Assessment Summary
  const criticalGaps = assessment.gaps.filter(g => g.severity === "CRITICAL");
  const highGaps = assessment.gaps.filter(g => g.severity === "HIGH");
  const mediumGaps = assessment.gaps.filter(g => g.severity === "MEDIUM");
  const lowGaps = assessment.gaps.filter(g => g.severity === "LOW");
  
  report += `### Risk Assessment Summary\n\n`;
  report += `- **Critical Gaps:** ${criticalGaps.length}\n`;
  report += `- **High Priority Gaps:** ${highGaps.length}\n`;
  report += `- **Medium Priority Gaps:** ${mediumGaps.length}\n`;
  report += `- **Low Priority Gaps:** ${lowGaps.length}\n\n`;
  
  // Critical Gaps
  if (criticalGaps.length > 0) {
    report += `## Critical Compliance Gaps\n\n`;
    for (const gap of criticalGaps) {
      report += `### ${gap.category}: ${gap.description}\n\n`;
      report += `- **Article Reference:** ${gap.articleReference}\n`;
      report += `- **Affected Systems:** ${gap.affectedSystems.join(", ")}\n`;
      report += `- **Current State:** ${gap.currentState}\n`;
      report += `- **Required State:** ${gap.requiredState}\n`;
      report += `- **Remediation Effort:** ${gap.remediationEffort}\n`;
      if (gap.estimatedCost) {
        report += `- **Estimated Cost:** ${gap.estimatedCost}\n`;
      }
      if (gap.deadline) {
        report += `- **Compliance Deadline:** ${gap.deadline}\n`;
      }
      report += `\n`;
    }
  }
  
  // High Priority Gaps
  if (highGaps.length > 0) {
    report += `## High Priority Compliance Gaps\n\n`;
    for (const gap of highGaps) {
      report += `### ${gap.category}: ${gap.description}\n\n`;
      report += `- **Article Reference:** ${gap.articleReference}\n`;
      report += `- **Affected Systems:** ${gap.affectedSystems.join(", ")}\n`;
      report += `- **Remediation Effort:** ${gap.remediationEffort}\n`;
      if (gap.deadline) {
        report += `- **Compliance Deadline:** ${gap.deadline}\n`;
      }
      report += `\n`;
    }
  }
  
  // Priority Recommendations
  const sortedRecommendations = [...assessment.recommendations].sort((a, b) => a.priority - b.priority);
  const topRecommendations = sortedRecommendations.slice(0, 10);
  
  if (topRecommendations.length > 0) {
    report += `## Priority Recommendations\n\n`;
    for (const rec of topRecommendations) {
      report += `### ${rec.title} (Priority: ${rec.priority}/10)\n\n`;
      report += `${rec.description}\n\n`;
      report += `- **Article Reference:** ${rec.articleReference}\n`;
      report += `- **Estimated Effort:** ${rec.estimatedEffort}\n`;
      report += `- **Expected Outcome:** ${rec.expectedOutcome}\n\n`;
      if (rec.implementationSteps.length > 0) {
        report += `**Implementation Steps:**\n\n`;
        for (const step of rec.implementationSteps) {
          report += `1. ${step}\n`;
        }
        report += `\n`;
      }
      if (rec.dependencies && rec.dependencies.length > 0) {
        report += `**Dependencies:** ${rec.dependencies.join(", ")}\n\n`;
      }
    }
  }
  
  // All Gaps Summary Table
  report += `## Complete Gap Analysis\n\n`;
  report += `| Severity | Category | Description | Article | Systems Affected |\n`;
  report += `|----------|----------|-------------|---------|------------------|\n`;
  for (const gap of assessment.gaps) {
    const desc = gap.description.replace(/\|/g, "\\|").substring(0, 100);
    report += `| ${gap.severity} | ${gap.category} | ${desc}${desc.length >= 100 ? "..." : ""} | ${gap.articleReference} | ${gap.affectedSystems.join(", ")} |\n`;
  }
  report += `\n`;
  
  // Next Steps
  report += `## Next Steps\n\n`;
  report += `1. Review all critical and high-priority gaps\n`;
  report += `2. Implement priority recommendations in order\n`;
  report += `3. Complete technical documentation per Article 11\n`;
  report += `4. Conduct conformity assessment per Article 43\n`;
  report += `5. Register high-risk systems in EU database per Article 49\n`;
  report += `6. Establish ongoing monitoring and compliance processes\n\n`;
  
  report += `---\n\n`;
  report += `*This report was generated using AI-powered compliance assessment tools. `;
  report += `Please review all recommendations with legal and compliance experts before implementation.*\n`;
  
  return report;
}

/**
 * Generate compliance breakdown by article
 */
function generateComplianceByArticle(gaps: GapAnalysis[]): Record<string, { compliant: boolean; gaps: string[] }> {
  const articleCompliance: Record<string, { compliant: boolean; gaps: string[] }> = {
    "Article 9 - Risk Management": { compliant: true, gaps: [] },
    "Article 10 - Data Governance": { compliant: true, gaps: [] },
    "Article 11 - Technical Documentation": { compliant: true, gaps: [] },
    "Article 12 - Record-Keeping": { compliant: true, gaps: [] },
    "Article 13 - Transparency": { compliant: true, gaps: [] },
    "Article 14 - Human Oversight": { compliant: true, gaps: [] },
    "Article 15 - Accuracy & Robustness": { compliant: true, gaps: [] },
    "Article 17 - Quality Management": { compliant: true, gaps: [] },
    "Article 43 - Conformity Assessment": { compliant: true, gaps: [] },
    "Article 49 - EU Database Registration": { compliant: true, gaps: [] },
    "Article 50 - Transparency Obligations": { compliant: true, gaps: [] },
  };
  
  for (const gap of gaps) {
    const ref = gap.articleReference || "";
    
    for (const article of Object.keys(articleCompliance)) {
      const articleNum = article.match(/Article (\d+)/)?.[1];
      if (articleNum && ref.includes(`Article ${articleNum}`)) {
        articleCompliance[article].compliant = false;
        articleCompliance[article].gaps.push(gap.description);
      }
    }
  }
  
  return articleCompliance;
}

