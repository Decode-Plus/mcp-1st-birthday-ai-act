/**
 * AI Services Discovery Tool
 * Implements EU AI Act Article 6 (Classification), Article 11 (Technical Documentation),
 * and Annex III (High-Risk AI Systems) requirements
 */

import type {
  AISystemProfile,
  AISystemsDiscoveryResponse,
  DiscoverAIServicesInput,
  OrganizationProfile,
  RiskCategory,
} from "../types/index.js";

/**
 * Mock AI service discovery - In production, this would integrate with:
 * - Infrastructure scanning (cloud APIs, Kubernetes, etc.)
 * - Code repository analysis
 * - API gateway logs
 * - Service mesh observability
 * - ML model registries
 */
async function scanForAISystems(
  orgContext?: OrganizationProfile,
  systemNames?: string[]
): Promise<AISystemProfile[]> {
  // Mock implementation - would be replaced with actual scanning
  const now = new Date().toISOString();
  
  const mockSystems: AISystemProfile[] = [
    {
      system: {
        name: "Recruitment AI Assistant",
        systemId: "rec-ai-001",
        description: "AI system for resume screening and candidate ranking",
        intendedPurpose:
          "Automated screening of job applications and ranking of candidates based on qualifications",
        version: "2.1.0",
        status: "Production",
        provider: {
          name: orgContext?.organization.name || "Example Corp",
          role: "Provider",
          contact: orgContext?.organization.contact.email || "contact@example.com",
        },
      },
      riskClassification: {
        category: "High",
        annexIIICategory: "Annex III, Point 4(a) - Employment and worker management",
        justification:
          "System used for recruitment and selection of natural persons. Falls under high-risk category per Annex III, Point 4(a).",
        safetyComponent: false,
        riskScore: 85,
        conformityAssessmentRequired: true,
        conformityAssessmentType: "Internal Control",
      },
      technicalDetails: {
        aiTechnology: ["Natural Language Processing", "Machine Learning", "Supervised Learning"],
        dataProcessed: ["Resumes", "CVs", "Application forms", "Candidate profiles"],
        processesSpecialCategoryData: false,
        deploymentModel: "Cloud",
        vendor: "Internal Development",
        trainingData: {
          description: "Historical hiring data from past 5 years",
          sources: ["Internal HR database", "Anonymized resumes"],
          biasAssessment: true,
        },
        integrations: ["ATS System", "HR Management System"],
        humanOversight: {
          enabled: true,
          description: "HR managers review all AI recommendations before final decisions",
        },
      },
      complianceStatus: {
        hasTechnicalDocumentation: false,
        conformityAssessmentStatus: "Not Started",
        hasEUDeclaration: false,
        hasCEMarking: false,
        registeredInEUDatabase: false,
        hasPostMarketMonitoring: false,
        hasAutomatedLogging: true,
        identifiedGaps: [
          "Missing technical documentation per Article 11",
          "Conformity assessment not performed",
          "Not registered in EU database per Article 49",
          "Quality management system not implemented per Article 17",
        ],
      },
      metadata: {
        createdAt: now,
        lastUpdated: now,
        dataSource: "automated-scan",
        discoveryMethod: "infrastructure-scan",
      },
    },
    {
      system: {
        name: "Customer Support Chatbot",
        systemId: "cs-bot-001",
        description: "AI-powered chatbot for customer inquiries",
        intendedPurpose: "Automated customer support and FAQ responses",
        version: "1.5.2",
        status: "Production",
        provider: {
          name: orgContext?.organization.name || "Example Corp",
          role: "Provider",
          contact: orgContext?.organization.contact.email || "contact@example.com",
        },
      },
      riskClassification: {
        category: "Limited",
        justification:
          "Customer-facing AI system requiring transparency disclosure per Article 50. Does not fall under high-risk categories.",
        safetyComponent: false,
        riskScore: 25,
        conformityAssessmentRequired: false,
        conformityAssessmentType: "Not Required",
      },
      technicalDetails: {
        aiTechnology: ["Natural Language Processing", "Large Language Model"],
        dataProcessed: ["Customer queries", "Chat logs", "Support tickets"],
        processesSpecialCategoryData: false,
        deploymentModel: "Cloud",
        vendor: "OpenAI GPT-4",
        integrations: ["CRM System", "Ticketing System"],
        humanOversight: {
          enabled: true,
          description: "Support agents can take over conversations at any time",
        },
      },
      complianceStatus: {
        hasTechnicalDocumentation: true,
        conformityAssessmentStatus: "Not Required",
        hasEUDeclaration: false,
        hasCEMarking: false,
        registeredInEUDatabase: false,
        hasPostMarketMonitoring: true,
        hasAutomatedLogging: true,
        identifiedGaps: [
          "Transparency notice needs to comply with Article 50",
        ],
      },
      metadata: {
        createdAt: now,
        lastUpdated: now,
        dataSource: "automated-scan",
        discoveryMethod: "api-discovery",
      },
    },
  ];

  return mockSystems;
}

/**
 * Classify system risk based on EU AI Act criteria
 */
function classifyRisk(system: AISystemProfile): RiskCategory {
  // This is a simplified classification
  // In production, would use comprehensive rules from Annex III
  
  const description = system.system.description.toLowerCase();
  const purpose = system.system.intendedPurpose.toLowerCase();
  
  // Check for prohibited practices (Article 5)
  const prohibitedKeywords = ["social scoring", "manipulate", "exploit vulnerabilities"];
  if (prohibitedKeywords.some(keyword => description.includes(keyword) || purpose.includes(keyword))) {
    return "Unacceptable";
  }
  
  // Check for high-risk categories (Annex III)
  const highRiskKeywords = [
    "recruitment", "employment", "education", "credit scoring",
    "law enforcement", "biometric", "critical infrastructure",
    "healthcare", "medical device"
  ];
  if (highRiskKeywords.some(keyword => description.includes(keyword) || purpose.includes(keyword))) {
    return "High";
  }
  
  // Check for limited risk (Article 50 - transparency obligations)
  const limitedRiskKeywords = ["chatbot", "deepfake", "emotion recognition", "biometric categorization"];
  if (limitedRiskKeywords.some(keyword => description.includes(keyword) || purpose.includes(keyword))) {
    return "Limited";
  }
  
  return "Minimal";
}

/**
 * Analyze compliance gaps
 */
function analyzeComplianceGaps(system: AISystemProfile): string[] {
  const gaps: string[] = [];
  
  if (system.riskClassification.category === "High") {
    if (!system.complianceStatus.hasTechnicalDocumentation) {
      gaps.push("Missing technical documentation per Article 11 and Annex IV");
    }
    if (system.complianceStatus.conformityAssessmentStatus !== "Completed") {
      gaps.push("Conformity assessment not completed per Article 43");
    }
    if (!system.complianceStatus.hasEUDeclaration) {
      gaps.push("EU Declaration of Conformity missing per Article 47");
    }
    if (!system.complianceStatus.hasCEMarking) {
      gaps.push("CE marking not affixed per Article 48");
    }
    if (!system.complianceStatus.registeredInEUDatabase) {
      gaps.push("System not registered in EU database per Article 49");
    }
    if (!system.complianceStatus.hasPostMarketMonitoring) {
      gaps.push("Post-market monitoring not established per Article 72");
    }
    if (!system.complianceStatus.hasAutomatedLogging) {
      gaps.push("Automated logging not implemented per Article 12");
    }
  }
  
  if (system.riskClassification.category === "Limited") {
    gaps.push("Ensure transparency obligations per Article 50");
  }
  
  return gaps;
}

/**
 * Main AI services discovery function
 */
export async function discoverAIServices(
  input: DiscoverAIServicesInput
): Promise<AISystemsDiscoveryResponse> {
  const { organizationContext, systemNames, scope } = input;

  // Step 1: Scan for AI systems
  const systems = await scanForAISystems(organizationContext, systemNames);

  // Step 2: Classify and analyze each system
  const analyzedSystems = systems.map((system) => {
    const updatedSystem = { ...system };
    
    // Re-classify risk if needed
    const classifiedRisk = classifyRisk(system);
    if (classifiedRisk !== system.riskClassification.category) {
      updatedSystem.riskClassification.category = classifiedRisk;
    }
    
    // Analyze compliance gaps
    const gaps = analyzeComplianceGaps(updatedSystem);
    updatedSystem.complianceStatus.identifiedGaps = gaps;
    
    return updatedSystem;
  });

  // Step 3: Calculate summaries
  const riskSummary = {
    unacceptableRiskCount: analyzedSystems.filter(
      (s) => s.riskClassification.category === "Unacceptable"
    ).length,
    highRiskCount: analyzedSystems.filter(
      (s) => s.riskClassification.category === "High"
    ).length,
    limitedRiskCount: analyzedSystems.filter(
      (s) => s.riskClassification.category === "Limited"
    ).length,
    minimalRiskCount: analyzedSystems.filter(
      (s) => s.riskClassification.category === "Minimal"
    ).length,
    totalCount: analyzedSystems.length,
  };

  const systemsRequiringAttention = analyzedSystems.filter(
    (s) =>
      s.complianceStatus.identifiedGaps.length > 0 ||
      s.riskClassification.category === "High" ||
      s.riskClassification.category === "Unacceptable"
  );

  const complianceSummary = {
    fullyCompliantCount: analyzedSystems.filter(
      (s) => s.complianceStatus.identifiedGaps.length === 0
    ).length,
    partiallyCompliantCount: analyzedSystems.filter(
      (s) =>
        s.complianceStatus.identifiedGaps.length > 0 &&
        s.complianceStatus.identifiedGaps.length <= 3
    ).length,
    nonCompliantCount: analyzedSystems.filter(
      (s) => s.complianceStatus.identifiedGaps.length > 3
    ).length,
    requiresAttention: systemsRequiringAttention,
  };

  return {
    systems: analyzedSystems,
    riskSummary,
    complianceSummary,
    discoveryMetadata: {
      timestamp: new Date().toISOString(),
      method: "automated-scan",
      coverage: `${analyzedSystems.length} systems discovered`,
    },
  };
}

