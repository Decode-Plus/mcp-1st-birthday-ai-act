/**
 * Zod Validation Schemas for EU AI Act MCP Server
 * Provides runtime validation and type safety
 */

import { z } from "zod";

/**
 * Organization Size Schema
 */
export const OrganizationSizeSchema = z.enum([
  "SME",
  "Large Enterprise",
  "Public Body",
  "Micro Enterprise",
]);

/**
 * AI Maturity Level Schema
 */
export const AIMaturityLevelSchema = z.enum([
  "Nascent",
  "Developing",
  "Advanced",
  "Expert",
]);

/**
 * Risk Category Schema
 */
export const RiskCategorySchema = z.enum([
  "Unacceptable",
  "High",
  "Limited",
  "Minimal",
]);

/**
 * Deployment Model Schema
 */
export const DeploymentModelSchema = z.enum([
  "On-premise",
  "Cloud",
  "Hybrid",
  "Edge",
  "SaaS",
]);

/**
 * Provider Role Schema
 */
export const ProviderRoleSchema = z.enum([
  "Provider",
  "Deployer",
  "Importer",
  "Distributor",
  "Authorized Representative",
]);

/**
 * Conformity Assessment Type Schema
 */
export const ConformityAssessmentTypeSchema = z.enum([
  "Internal Control",
  "Third Party Assessment",
  "Not Required",
  "Pending",
]);

/**
 * Organization Profile Schema
 */
export const OrganizationProfileSchema = z.object({
  organization: z.object({
    name: z.string(),
    registrationNumber: z.string().optional(),
    sector: z.string(),
    size: OrganizationSizeSchema,
    jurisdiction: z.array(z.string()),
    euPresence: z.boolean(),
    headquarters: z.object({
      country: z.string(),
      city: z.string(),
      address: z.string().optional(),
    }),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
    }),
    aiMaturityLevel: AIMaturityLevelSchema,
    aiSystemsCount: z.number().optional(),
    primaryRole: ProviderRoleSchema,
  }),
  regulatoryContext: z.object({
    applicableFrameworks: z.array(z.string()),
    complianceDeadlines: z.array(
      z.object({
        date: z.string(),
        description: z.string(),
        article: z.string(),
      })
    ),
    existingCertifications: z.array(z.string()),
    hasAuthorizedRepresentative: z.boolean().optional(),
    notifiedBodyId: z.string().optional(),
    hasQualityManagementSystem: z.boolean(),
    hasRiskManagementSystem: z.boolean(),
  }),
  metadata: z.object({
    createdAt: z.string(),
    lastUpdated: z.string(),
    completenessScore: z.number().min(0).max(100),
    dataSource: z.string(),
  }),
});

/**
 * AI System Profile Schema
 */
export const AISystemProfileSchema = z.object({
  system: z.object({
    name: z.string(),
    systemId: z.string().optional(),
    description: z.string(),
    intendedPurpose: z.string(),
    version: z.string(),
    status: z.enum(["Development", "Testing", "Production", "Deprecated"]),
    provider: z.object({
      name: z.string(),
      role: ProviderRoleSchema,
      contact: z.string(),
    }),
  }),
  riskClassification: z.object({
    category: RiskCategorySchema,
    annexIIICategory: z.string().optional(),
    justification: z.string(),
    safetyComponent: z.boolean(),
    riskScore: z.number().min(0).max(100),
    conformityAssessmentRequired: z.boolean(),
    conformityAssessmentType: ConformityAssessmentTypeSchema,
  }),
  technicalDetails: z.object({
    aiTechnology: z.array(z.string()),
    dataProcessed: z.array(z.string()),
    processesSpecialCategoryData: z.boolean(),
    deploymentModel: DeploymentModelSchema,
    vendor: z.string().optional(),
    trainingData: z
      .object({
        description: z.string(),
        sources: z.array(z.string()),
        biasAssessment: z.boolean(),
      })
      .optional(),
    integrations: z.array(z.string()),
    humanOversight: z.object({
      enabled: z.boolean(),
      description: z.string().optional(),
    }),
  }),
  complianceStatus: z.object({
    hasTechnicalDocumentation: z.boolean(),
    conformityAssessmentStatus: z.enum([
      "Not Started",
      "In Progress",
      "Completed",
      "Not Required",
    ]),
    hasEUDeclaration: z.boolean(),
    hasCEMarking: z.boolean(),
    registeredInEUDatabase: z.boolean(),
    hasPostMarketMonitoring: z.boolean(),
    hasAutomatedLogging: z.boolean(),
    lastAssessmentDate: z.string().optional(),
    identifiedGaps: z.array(z.string()),
  }),
  metadata: z.object({
    createdAt: z.string(),
    lastUpdated: z.string(),
    dataSource: z.string(),
    discoveryMethod: z.string(),
  }),
});

/**
 * Discovery Input Schemas
 */
export const DiscoverOrganizationInputSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  domain: z.string().optional(),
  context: z.string().optional(),
});

export const DiscoverAIServicesInputSchema = z.object({
  organizationContext: OrganizationProfileSchema.optional(),
  systemNames: z.array(z.string()).optional(),
  scope: z.string().optional(),
});

/**
 * AI Systems Discovery Response Schema
 */
export const AISystemsDiscoveryResponseSchema = z.object({
  systems: z.array(AISystemProfileSchema),
  riskSummary: z.object({
    unacceptableRiskCount: z.number(),
    highRiskCount: z.number(),
    limitedRiskCount: z.number(),
    minimalRiskCount: z.number(),
    totalCount: z.number(),
  }),
  complianceSummary: z.object({
    fullyCompliantCount: z.number(),
    partiallyCompliantCount: z.number(),
    nonCompliantCount: z.number(),
    requiresAttention: z.array(AISystemProfileSchema),
  }),
  discoveryMetadata: z.object({
    timestamp: z.string(),
    method: z.string(),
    coverage: z.string(),
  }),
});

