/**
 * EU AI Act Compliance Types
 * Based on Regulation (EU) 2024/1689 - AI Act
 */

/**
 * Organization Size Classification
 * Relevant for determining compliance obligations and support measures
 */
export type OrganizationSize = 
  | "Startup" // Early stage company
  | "SME" // Small and Medium Enterprises (< 250 employees)
  | "Enterprise" // Large enterprise (> 250 employees)
  | "Public Body" // Government or public sector entity
  | "Micro Enterprise"; // < 10 employees

/**
 * AI Maturity Level
 * Indicates organization's AI adoption stage
 */
export type AIMaturityLevel = 
  | "Nascent" // Just starting AI adoption
  | "Developing" // Actively implementing AI
  | "Mature" // Mature AI operations
  | "Leader"; // Leading AI practice

/**
 * Risk Category per EU AI Act Article 6 and Annex III
 */
export type RiskCategory = 
  | "Unacceptable" // Prohibited AI practices (Article 5)
  | "High" // High-risk AI systems (Annex III)
  | "Limited" // Limited risk requiring transparency (Article 50)
  | "Minimal"; // Minimal or no risk

/**
 * Deployment Model
 */
export type DeploymentModel = 
  | "On-premise" 
  | "Cloud" 
  | "Cloud (API-based)"
  | "Hybrid"
  | "Edge"
  | "SaaS";

/**
 * Provider Role per Article 3(3)
 */
export type ProviderRole = 
  | "Provider" // Develops/places AI on market
  | "Provider/Deployer" // Both provider and deployer role
  | "Deployer" // Uses AI under own authority
  | "Importer" // Places on EU market from non-EU
  | "Distributor" // Makes available on market
  | "Authorized Representative"; // Represents non-EU provider

/**
 * Conformity Assessment Type per Article 43
 */
export type ConformityAssessmentType = 
  | "Internal Control" // Article 43(1) - Annex VI
  | "Internal Control (Articles 43, 46)" // Derogation case
  | "Third Party Assessment" // Article 43(2) - Annex VII
  | "Not Required" // For non-high-risk systems
  | "Not Required - Transparency Obligations Only" // Limited risk systems
  | "Pending";

/**
 * Organization Profile Schema
 * Based on Article 16 (Provider Obligations) and Article 49 (Registration)
 * References Annex VIII for registration requirements
 */
export interface OrganizationProfile {
  /** Basic Organization Information */
  organization: {
    /** Legal name of the organization */
    name: string;
    
    /** Registration/VAT number if applicable */
    registrationNumber?: string;
    
    /** Primary business sector (e.g., Healthcare, Finance, Manufacturing) */
    sector: string;
    
    /** Organization size classification */
    size: OrganizationSize;
    
    /** Countries of operation */
    jurisdiction: string[];
    
    /** EU Member State presence */
    euPresence: boolean;
    
    /** Headquarters location */
    headquarters: {
      country: string;
      city: string;
      address?: string;
    };
    
    /** Contact information per Article 16(f) */
    contact: {
      email: string;
      phone?: string;
      website?: string;
    };
    
    /** AI maturity assessment */
    aiMaturityLevel: AIMaturityLevel;
    
    /** Number of AI systems currently deployed */
    aiSystemsCount?: number;
    
    /** Primary role in AI value chain */
    primaryRole: ProviderRole;
  };
  
  /** Regulatory Context per Article 16 & 49 */
  regulatoryContext: {
    /** Applicable regulatory frameworks beyond AI Act */
    applicableFrameworks: string[];
    
    /** Key compliance deadlines from AI Act timeline */
    complianceDeadlines: Array<{
      date: string; // ISO 8601 date
      description: string;
      article: string; // Reference to AI Act article
    }>;
    
    /** Existing certifications (ISO, SOC2, etc.) */
    existingCertifications: string[];
    
    /** Has appointed authorized representative (if non-EU) per Article 22 */
    hasAuthorizedRepresentative?: boolean;
    
    /** Notified body information if applicable */
    notifiedBodyId?: string;
    
    /** Quality management system status per Article 17 */
    hasQualityManagementSystem: boolean;
    
    /** Risk management system status per Article 9 */
    hasRiskManagementSystem: boolean;
  };
  
  /** Metadata */
  metadata: {
    /** When this profile was created */
    createdAt: string;
    
    /** Last update timestamp */
    lastUpdated: string;
    
    /** Profile completeness score (0-100) */
    completenessScore: number;
    
    /** Data source (manual entry, API discovery, tavily-research, etc.) */
    dataSource: string;
    
    /** Tavily research results (when using Tavily for discovery) */
    tavilyResults?: {
      overview: string;
      aiCapabilities: string;
      compliance: string;
      sources: string[];
    };
  };
}

/**
 * AI System Profile Schema
 * Based on Article 11 (Technical Documentation), Annex III (High-Risk Classification),
 * Annex IV (Technical Documentation Requirements), and Annex VIII (Registration Requirements)
 */
export interface AISystemProfile {
  /** Basic System Information */
  system: {
    /** System name/identifier */
    name: string;
    
    /** Unique system ID (for registration per Article 49) */
    systemId?: string;
    
    /** Detailed description of intended purpose per Annex IV(1)(a) */
    description: string;
    
    /** Intended purpose per Article 3(12) */
    intendedPurpose: string;
    
    /** Version/release information */
    version: string;
    
    /** Development status */
    status: "Development" | "Testing" | "Production" | "Deprecated";
    
    /** System owner/provider information */
    provider: {
      name: string;
      role: ProviderRole;
      contact: string;
    };
  };
  
  /** Risk Classification per Article 6 & Annex III */
  riskClassification: {
    /** Primary risk category */
    category: RiskCategory;
    
    /** If high-risk, specific Annex III classification */
    annexIIICategory?: string;
    
    /** Justification for classification per Article 6(3) */
    justification: string;
    
    /** Whether system falls under safety legislation (Article 6(1)) */
    safetyComponent: boolean;
    
    /** Risk level score (0-100) */
    riskScore: number;
    
    /** Requires conformity assessment per Article 43 */
    conformityAssessmentRequired: boolean;
    
    /** Type of conformity assessment */
    conformityAssessmentType: ConformityAssessmentType;

    /** Regulatory references and applicable articles */
    regulatoryReferences?: string[];
  };
  
  /** Technical Characteristics per Annex IV */
  technicalDetails: {
    /** AI technology/approach (ML, DL, Expert System, etc.) */
    aiTechnology: string[];
    
    /** Types of data processed per Article 10 */
    dataProcessed: string[];
    
    /** Sensitive data handling (biometric, health, etc.) */
    processesSpecialCategoryData: boolean;
    
    /** Deployment architecture */
    deploymentModel: DeploymentModel;
    
    /** Third-party vendor/provider if applicable */
    vendor?: string;
    
    /** Training data information per Article 10 */
    trainingData?: {
      description: string;
      sources: string[];
      volume?: string;
      biasAssessment: boolean;
      biasDetected?: string[];
    };

    /** Accuracy metrics per Article 15 */
    accuracy?: {
      precision?: number;
      recall?: number;
      f1Score?: number;
      performancePerDemographic?: {
        [demographic: string]: number;
      };
    };

    /** Model details for GPAI systems */
    modelDetails?: {
      baseModel: string;
      finetuned: boolean;
      trainingApproach: string;
      contextWindowSize?: number;
    };
    
    /** Integration points with other systems */
    integrations: string[];
    
    /** Human oversight measures per Article 14 */
    humanOversight: {
      enabled: boolean;
      description?: string;
      level?: string; // e.g., "Low", "Medium", "High"
      documentation?: string;
      escalationThreshold?: string;
    };
  };
  
  /** Compliance Status per Article 16 */
  complianceStatus: {
    /** Technical documentation status per Article 11 */
    hasTechnicalDocumentation: boolean;
    
    /** Conformity assessment status per Article 43 */
    conformityAssessmentStatus: "Not Started" | "In Progress" | "Completed" | "Not Required";
    
    /** EU Declaration of Conformity per Article 47 */
    hasEUDeclaration: boolean;
    
    /** CE marking affixed per Article 48 */
    hasCEMarking: boolean;
    
    /** Registered in EU database per Article 49 */
    registeredInEUDatabase: boolean;
    
    /** Post-market monitoring per Article 72 */
    hasPostMarketMonitoring: boolean;
    
    /** Logging capabilities per Article 12 */
    hasAutomatedLogging: boolean;

    /** Quality management system per Article 17 */
    qualityManagementSystem?: boolean;

    /** Risk management system per Article 9 */
    riskManagementSystem?: boolean;

    /** Transparency implementation for Article 50 systems */
    transparencyImplemented?: boolean;

    /** Compliance deadline */
    complianceDeadline?: string;

    /** Estimated effort to achieve compliance */
    estimatedComplianceEffort?: string;
    
    /** Last compliance assessment date */
    lastAssessmentDate?: string;
    
    /** Identified compliance gaps */
    identifiedGaps: string[];
  };
  
  /** Metadata */
  metadata: {
    /** When this profile was created */
    createdAt: string;
    
    /** Last update timestamp */
    lastUpdated: string;
    
    /** Data source */
    dataSource: string;
    
    /** Discovery method (automated scan, manual entry, API, etc.) */
    discoveryMethod: string;

    /** Research sources (Tavily, documentation references) */
    researchSources?: string[];
  };
}

/**
 * Discovery Response for AI Systems
 * Aggregate response for multiple systems with summary
 */
export interface AISystemsDiscoveryResponse {
  /** List of discovered AI systems */
  systems: AISystemProfile[];
  
  /** Risk summary across all systems */
  riskSummary: {
    unacceptableRiskCount: number;
    highRiskCount: number;
    limitedRiskCount: number;
    minimalRiskCount: number;
    totalCount: number;
  };
  
  /** Compliance summary */
  complianceSummary: {
    fullyCompliantCount: number;
    partiallyCompliantCount: number;
    nonCompliantCount: number;
    requiresAttention: AISystemProfile[];
    criticalGapCount?: number;
    highGapCount?: number;
    overallCompliancePercentage?: number;
  };

  /** Regulatory framework information */
  regulatoryFramework?: {
    legislation: string;
    officialJournal: string;
    entryIntoForce: string;
    implementationTimeline: string;
    jurisdiction: string;
  };

  /** Compliance deadlines */
  complianceDeadlines?: {
    highRisk: string;
    limitedRisk: string;
    generalGPAI: string;
  };

  /** Discovery sources */
  discoverySources?: string[];
  
  /** Discovery metadata */
  discoveryMetadata: {
    timestamp: string;
    method: string;
    coverage: string; // Estimated coverage of discovery
    researchIntegration?: string;
    conformityAssessmentUrgency?: string;
  };
}

/**
 * Tool Input Schemas
 */
export interface DiscoverOrganizationInput {
  /** Organization name or identifier */
  organizationName: string;
  
  /** Optional domain/website for research */
  domain?: string;
  
  /** Additional context for discovery */
  context?: string;
}

export interface DiscoverAIServicesInput {
  /** Organization context (from discover_organization or manual) */
  organizationContext?: OrganizationProfile;
  
  /** Specific system names to discover */
  systemNames?: string[];
  
  /** Scope of discovery (e.g., "all", "high-risk-only") */
  scope?: string;
}

/**
 * Compliance Assessment Types
 * Based on EU AI Act requirements for gap analysis and remediation
 */

/**
 * Gap Severity Level
 */
export type GapSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Remediation Effort Level
 */
export type RemediationEffort = "LOW" | "MEDIUM" | "HIGH";

/**
 * Gap Analysis Item
 * Represents a single compliance gap identified during assessment
 */
export interface GapAnalysis {
  /** Unique identifier for the gap */
  id: string;
  
  /** Severity level of the gap */
  severity: GapSeverity;
  
  /** Category of the gap (e.g., "Technical Documentation", "Risk Management") */
  category: string;
  
  /** Detailed description of the gap */
  description: string;
  
  /** AI systems affected by this gap */
  affectedSystems: string[];
  
  /** EU AI Act article reference */
  articleReference: string;
  
  /** Current state description */
  currentState: string;
  
  /** Required state per regulation */
  requiredState: string;
  
  /** Estimated effort to remediate */
  remediationEffort: RemediationEffort;
  
  /** Estimated cost range */
  estimatedCost?: string;
  
  /** Compliance deadline */
  deadline?: string;
}

/**
 * Remediation Recommendation
 */
export interface Recommendation {
  /** Unique identifier */
  id: string;
  
  /** Priority (1-10, 1 being highest) */
  priority: number;
  
  /** Recommendation title */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** EU AI Act article reference */
  articleReference: string;
  
  /** Step-by-step implementation guide */
  implementationSteps: string[];
  
  /** Estimated effort */
  estimatedEffort: string;
  
  /** Expected outcome */
  expectedOutcome: string;
  
  /** Dependencies on other recommendations */
  dependencies?: string[];
}

/**
 * Compliance Documentation Templates
 * Markdown templates for various EU AI Act documentation requirements
 */
export interface ComplianceDocumentation {
  /** Risk Management System template (Article 9) */
  riskManagementTemplate?: string;
  
  /** Technical Documentation template (Article 11, Annex IV) */
  technicalDocumentation?: string;
  
  /** Conformity Assessment template (Article 43) */
  conformityAssessment?: string;
  
  /** Transparency Notice template (Article 50) */
  transparencyNotice?: string;
  
  /** Quality Management System template (Article 17) */
  qualityManagementSystem?: string;
  
  /** Human Oversight Procedure template (Article 14) */
  humanOversightProcedure?: string;
  
  /** Data Governance Policy template (Article 10) */
  dataGovernancePolicy?: string;
  
  /** Incident Reporting Procedure template */
  incidentReportingProcedure?: string;
}

/**
 * Compliance Assessment Input
 */
export interface ComplianceAssessmentInput {
  /** Organization context from discover_organization tool */
  organizationContext?: OrganizationProfile;
  
  /** AI services context from discover_ai_services tool */
  aiServicesContext?: AISystemsDiscoveryResponse;
  
  /** Specific focus areas for assessment */
  focusAreas?: string[];
  
  /** Whether to generate documentation templates (default: true) */
  generateDocumentation?: boolean;
}

/**
 * Compliance Assessment Response
 */
export interface ComplianceAssessmentResponse {
  /** Assessment results */
  assessment: {
    /** Overall compliance score (0-100) */
    overallScore: number;
    
    /** Overall risk level */
    riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    
    /** Identified compliance gaps */
    gaps: GapAnalysis[];
    
    /** Remediation recommendations */
    recommendations: Recommendation[];
    
    /** Compliance status by EU AI Act article */
    complianceByArticle: Record<string, {
      compliant: boolean;
      gaps: string[];
    }>;
  };
  
  /** Generated documentation templates */
  documentation?: ComplianceDocumentation;
  
  /** Chain-of-thought reasoning explanation */
  reasoning: string;
  
  /** Assessment metadata */
  metadata: {
    /** Assessment timestamp */
    assessmentDate: string;
    
    /** Assessment version */
    assessmentVersion: string;
    
    /** AI model used for assessment */
    modelUsed: string;
    
    /** Organization assessed */
    organizationAssessed?: string;
    
    /** Systems assessed */
    systemsAssessed: string[];
    
    /** Focus areas */
    focusAreas: string[];
  };
}

