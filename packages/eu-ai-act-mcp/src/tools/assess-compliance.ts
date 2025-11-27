/**
 * Compliance Assessment Tool
 * Implements EU AI Act compliance analysis using AI-powered assessment
 * 
 * Uses OpenAI GPT-4 to analyze:
 * - Gap analysis against AI Act requirements
 * - Risk-specific compliance checklists
 * - Draft documentation templates
 * - Remediation recommendations
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

import OpenAI from "openai";
import type {
  OrganizationProfile,
  AISystemsDiscoveryResponse,
  ComplianceAssessmentInput,
  ComplianceAssessmentResponse,
  GapAnalysis,
  Recommendation,
  ComplianceDocumentation,
} from "../types/index.js";

/**
 * OpenAI client instance
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required for compliance assessment");
  }
  
  return new OpenAI({ apiKey });
}

/**
 * EU AI Act Knowledge Base for GPT-4 context
 */
const EU_AI_ACT_CONTEXT = `
You are an expert EU AI Act compliance consultant. You have deep knowledge of:

**EU AI Act (Regulation (EU) 2024/1689)**

**Risk Classification (Article 6, Annex III):**
- Unacceptable Risk (Article 5): Prohibited AI practices including social scoring, manipulation, exploitation
- High-Risk (Annex III): Employment, education, credit, law enforcement, critical infrastructure, biometric
- Limited Risk (Article 50): Transparency obligations for chatbots, emotion recognition, deepfakes
- Minimal Risk: General purpose AI with no specific obligations

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
  "conformityAssessment": "<markdown template for Article 43 Conformity Assessment>",
  "transparencyNotice": "<markdown template for Article 50 Transparency Notice>",
  "qualityManagementSystem": "<markdown template for Article 17 Quality Management System>",
  "humanOversightProcedure": "<markdown template for Article 14 Human Oversight>",
  "dataGovernancePolicy": "<markdown template for Article 10 Data Governance>",
  "incidentReportingProcedure": "<markdown template for incident reporting>"
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
 * Parse GPT response safely
 */
function parseGPTResponse<T>(content: string): T | null {
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error("Failed to parse GPT response:", error);
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
  const { organizationContext, aiServicesContext, focusAreas, generateDocumentation = true } = input;
  
  console.error("\n🔍 Starting EU AI Act Compliance Assessment");
  console.error("=".repeat(60));
  
  if (organizationContext) {
    console.error(`📋 Organization: ${organizationContext.organization.name}`);
  }
  if (aiServicesContext) {
    console.error(`🤖 AI Systems: ${aiServicesContext.riskSummary.totalCount} total`);
    console.error(`   - High-Risk: ${aiServicesContext.riskSummary.highRiskCount}`);
    console.error(`   - Limited-Risk: ${aiServicesContext.riskSummary.limitedRiskCount}`);
  }
  console.error("-".repeat(60));
  
  const openai = getOpenAIClient();
  const now = new Date().toISOString();
  
  // Step 1: Generate compliance assessment using GPT-4
  console.error("\n🧠 Analyzing compliance with GPT-4...");
  
  const assessmentPrompt = generateAssessmentPrompt(
    organizationContext,
    aiServicesContext,
    focusAreas
  );
  
  const assessmentResponse = await openai.chat.completions.create({
    model: "gpt-5-chat-latest",
    messages: [
      {
        role: "system",
        content: "You are an expert EU AI Act compliance consultant. Provide detailed, actionable compliance assessments in valid JSON format only.",
      },
      {
        role: "user",
        content: assessmentPrompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: "json_object" },
  });
  
  const assessmentContent = assessmentResponse.choices[0]?.message?.content || "{}";
  const assessmentData = parseGPTResponse<{
    overallScore: number;
    riskLevel: string;
    gaps: GapAnalysis[];
    recommendations: Recommendation[];
    reasoning: string;
  }>(assessmentContent);
  
  if (!assessmentData) {
    throw new Error("Failed to parse compliance assessment from GPT-4");
  }
  
  console.error(`✅ Assessment complete: Score ${assessmentData.overallScore}/100`);
  console.error(`   Risk Level: ${assessmentData.riskLevel}`);
  console.error(`   Gaps Found: ${assessmentData.gaps.length}`);
  console.error(`   Recommendations: ${assessmentData.recommendations.length}`);
  
  // Step 2: Generate documentation templates if requested
  let documentation: ComplianceDocumentation | undefined;
  
  if (generateDocumentation) {
    console.error("\n📄 Generating documentation templates...");
    
    const docPrompt = generateDocumentationPrompt(
      organizationContext,
      aiServicesContext,
      { gaps: assessmentData.gaps, recommendations: assessmentData.recommendations }
    );
    
    const docResponse = await openai.chat.completions.create({
      model: "gpt-5-chat-latest",
      messages: [
        {
          role: "system",
          content: "You are an expert EU AI Act compliance documentation specialist. Generate professional documentation templates in valid JSON format with markdown content.",
        },
        {
          role: "user",
          content: docPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    });
    
    const docContent = docResponse.choices[0]?.message?.content || "{}";
    documentation = parseGPTResponse<ComplianceDocumentation>(docContent) || undefined;
    
    if (documentation) {
      console.error("✅ Documentation templates generated");
    }
  }
  
  // Calculate final score (may adjust based on our own analysis)
  const calculatedScore = calculateOverallScore(
    assessmentData.gaps,
    aiServicesContext
  );
  
  // Use GPT's score if available, otherwise use calculated
  const finalScore = assessmentData.overallScore || calculatedScore;
  
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
      modelUsed: "gpt-5-chat-latest",
      organizationAssessed: organizationContext?.organization.name,
      systemsAssessed: aiServicesContext?.systems.map(s => s.system.name) || [],
      focusAreas: focusAreas || [],
    },
  };
  
  console.error("\n" + "=".repeat(60));
  console.error("✅ Compliance Assessment Complete");
  console.error(`📊 Final Score: ${finalScore}/100`);
  console.error(`⚠️  Total Gaps: ${assessmentData.gaps.length}`);
  console.error(`💡 Recommendations: ${assessmentData.recommendations.length}`);
  console.error("=".repeat(60) + "\n");
  
  return response;
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

