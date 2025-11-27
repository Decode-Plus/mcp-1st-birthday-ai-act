/**
 * Organization Discovery Tool
 * Implements EU AI Act Article 16 and Article 49 requirements
 * Uses research to discover organization details and regulatory context
 */

import type {
  OrganizationProfile,
  DiscoverOrganizationInput,
} from "../types/index.js";

/**
 * Mock research function - In production, this would integrate with:
 * - Company databases (Companies House, etc.)
 * - Web scraping/research APIs
 * - Public registries
 * - AI Act registration database
 */
async function researchOrganization(
  name: string,
  domain?: string,
  context?: string
): Promise<Partial<OrganizationProfile>> {
  // This is a mock implementation
  // In production, you would integrate with Tavily or similar research API
  
  const now = new Date().toISOString();
  
  return {
    organization: {
      name,
      sector: "Technology",
      size: "SME",
      jurisdiction: ["EU", "United States"],
      euPresence: true,
      headquarters: {
        country: "Germany",
        city: "Berlin",
      },
      contact: {
        email: `contact@${domain || "example.com"}`,
        website: domain ? `https://${domain}` : undefined,
      },
      aiMaturityLevel: "Developing",
      aiSystemsCount: 0,
      primaryRole: "Provider",
    },
    regulatoryContext: {
      applicableFrameworks: ["EU AI Act", "GDPR", "ISO 27001"],
      complianceDeadlines: [
        {
          date: "2025-02-02",
          description: "Prohibited AI practices ban (Article 5)",
          article: "Article 5",
        },
        {
          date: "2025-08-02",
          description: "GPAI model obligations (Article 53)",
          article: "Article 53",
        },
        {
          date: "2027-08-02",
          description: "Full AI Act enforcement for high-risk systems",
          article: "Article 113",
        },
      ],
      existingCertifications: [],
      hasQualityManagementSystem: false,
      hasRiskManagementSystem: false,
    },
    metadata: {
      createdAt: now,
      lastUpdated: now,
      completenessScore: 60,
      dataSource: "automated-discovery",
    },
  };
}

/**
 * Enrich organization profile with AI Act specific context
 */
function enrichWithAIActContext(
  profile: Partial<OrganizationProfile>
): OrganizationProfile {
  // Ensure all required fields are present
  const enriched: OrganizationProfile = {
    organization: {
      name: profile.organization?.name || "",
      registrationNumber: profile.organization?.registrationNumber,
      sector: profile.organization?.sector || "Unknown",
      size: profile.organization?.size || "SME",
      jurisdiction: profile.organization?.jurisdiction || ["EU"],
      euPresence: profile.organization?.euPresence ?? true,
      headquarters: profile.organization?.headquarters || {
        country: "Unknown",
        city: "Unknown",
      },
      contact: profile.organization?.contact || {
        email: "unknown@example.com",
      },
      aiMaturityLevel: profile.organization?.aiMaturityLevel || "Nascent",
      aiSystemsCount: profile.organization?.aiSystemsCount || 0,
      primaryRole: profile.organization?.primaryRole || "Provider",
    },
    regulatoryContext: {
      applicableFrameworks:
        profile.regulatoryContext?.applicableFrameworks || ["EU AI Act"],
      complianceDeadlines: profile.regulatoryContext?.complianceDeadlines || [],
      existingCertifications:
        profile.regulatoryContext?.existingCertifications || [],
      hasAuthorizedRepresentative:
        profile.regulatoryContext?.hasAuthorizedRepresentative,
      notifiedBodyId: profile.regulatoryContext?.notifiedBodyId,
      hasQualityManagementSystem:
        profile.regulatoryContext?.hasQualityManagementSystem ?? false,
      hasRiskManagementSystem:
        profile.regulatoryContext?.hasRiskManagementSystem ?? false,
    },
    metadata: {
      createdAt: profile.metadata?.createdAt || new Date().toISOString(),
      lastUpdated: profile.metadata?.lastUpdated || new Date().toISOString(),
      completenessScore: profile.metadata?.completenessScore || 50,
      dataSource: profile.metadata?.dataSource || "manual",
    },
  };

  // Add recommendations based on organization profile
  if (!enriched.organization.euPresence) {
    // Non-EU organizations need authorized representative
    enriched.regulatoryContext.hasAuthorizedRepresentative =
      enriched.regulatoryContext.hasAuthorizedRepresentative ?? false;
  }

  return enriched;
}

/**
 * Main organization discovery function
 */
export async function discoverOrganization(
  input: DiscoverOrganizationInput
): Promise<OrganizationProfile> {
  const { organizationName, domain, context } = input;

  // Step 1: Research organization details
  const researchedData = await researchOrganization(
    organizationName,
    domain,
    context
  );

  // Step 2: Enrich with AI Act context
  const enrichedProfile = enrichWithAIActContext(researchedData);

  // Step 3: Return complete profile
  return enrichedProfile;
}

