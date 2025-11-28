/**
 * Organization Discovery Tool
 * Implements EU AI Act Article 16 and Article 49 requirements
 * Uses Tavily AI-powered research to discover organization details and regulatory context
 */

import { tavily } from "@tavily/core";
import type {
  OrganizationProfile,
  DiscoverOrganizationInput,
} from "../types/index.js";
import { getBrandingInfo } from "../utils/branding.js";
import { findCompanyDomain } from "../utils/domain.js";

/**
 * Well-known company domains mapping
 * Used as fallback when domain is not provided
 */
const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  // Tech Giants
  "microsoft": "microsoft.com",
  "google": "google.com",
  "alphabet": "abc.xyz",
  "apple": "apple.com",
  "amazon": "amazon.com",
  "meta": "meta.com",
  "facebook": "meta.com",
  "ibm": "ibm.com",
  "oracle": "oracle.com",
  "salesforce": "salesforce.com",
  "sap": "sap.com",
  "adobe": "adobe.com",
  "nvidia": "nvidia.com",
  "intel": "intel.com",
  "cisco": "cisco.com",
  "dell": "dell.com",
  "hp": "hp.com",
  "vmware": "vmware.com",
  "servicenow": "servicenow.com",
  "workday": "workday.com",
  "snowflake": "snowflake.com",
  "databricks": "databricks.com",
  "palantir": "palantir.com",
  
  // AI Companies
  "openai": "openai.com",
  "anthropic": "anthropic.com",
  "deepmind": "deepmind.com",
  "cohere": "cohere.com",
  "stability ai": "stability.ai",
  "hugging face": "huggingface.co",
  "huggingface": "huggingface.co",
  "midjourney": "midjourney.com",
  "runway": "runwayml.com",
  "mistral": "mistral.ai",
  "mistral ai": "mistral.ai",
  "xai": "x.ai",
  "inflection": "inflection.ai",
  "inflection ai": "inflection.ai",
  "perplexity": "perplexity.ai",
  "perplexity ai": "perplexity.ai",
  
  // Cloud Providers
  "aws": "aws.amazon.com",
  "amazon web services": "aws.amazon.com",
  "azure": "azure.microsoft.com",
  "google cloud": "cloud.google.com",
  "gcp": "cloud.google.com",
  
  // European Tech
  "spotify": "spotify.com",
  "klarna": "klarna.com",
  "adyen": "adyen.com",
  "booking.com": "booking.com",
  "booking": "booking.com",
  "asml": "asml.com",
  "siemens": "siemens.com",
  "bosch": "bosch.com",
  "philips": "philips.com",
  "ericsson": "ericsson.com",
  "nokia": "nokia.com",
  "uipath": "uipath.com",
  "arm": "arm.com",
  "deliveroo": "deliveroo.com",
  "revolut": "revolut.com",
  "wise": "wise.com",
  "transferwise": "wise.com",
  
  // Financial Services
  "jpmorgan": "jpmorgan.com",
  "jp morgan": "jpmorgan.com",
  "goldman sachs": "goldmansachs.com",
  "morgan stanley": "morganstanley.com",
  "blackrock": "blackrock.com",
  "visa": "visa.com",
  "mastercard": "mastercard.com",
  "paypal": "paypal.com",
  "stripe": "stripe.com",
  "square": "squareup.com",
  "block": "block.xyz",
  
  // Healthcare/Pharma
  "pfizer": "pfizer.com",
  "johnson & johnson": "jnj.com",
  "j&j": "jnj.com",
  "roche": "roche.com",
  "novartis": "novartis.com",
  "merck": "merck.com",
  "abbvie": "abbvie.com",
  "astrazeneca": "astrazeneca.com",
  "gsk": "gsk.com",
  "glaxosmithkline": "gsk.com",
  "sanofi": "sanofi.com",
  "bayer": "bayer.com",
  
  // Automotive
  "tesla": "tesla.com",
  "volkswagen": "volkswagen.com",
  "vw": "volkswagen.com",
  "bmw": "bmw.com",
  "mercedes": "mercedes-benz.com",
  "mercedes-benz": "mercedes-benz.com",
  "toyota": "toyota.com",
  "ford": "ford.com",
  "gm": "gm.com",
  "general motors": "gm.com",
  "rivian": "rivian.com",
  "lucid": "lucidmotors.com",
  "waymo": "waymo.com",
  "cruise": "getcruise.com",
  
  // Retail/E-commerce
  "walmart": "walmart.com",
  "target": "target.com",
  "costco": "costco.com",
  "alibaba": "alibaba.com",
  "shopify": "shopify.com",
  "ebay": "ebay.com",
  "etsy": "etsy.com",
  
  // Social/Media
  "twitter": "x.com",
  "x": "x.com",
  "linkedin": "linkedin.com",
  "tiktok": "tiktok.com",
  "bytedance": "bytedance.com",
  "snap": "snap.com",
  "snapchat": "snap.com",
  "pinterest": "pinterest.com",
  "reddit": "reddit.com",
  "discord": "discord.com",
  "zoom": "zoom.us",
  "slack": "slack.com",
  "netflix": "netflix.com",
  "disney": "disney.com",
  
  // Consulting
  "accenture": "accenture.com",
  "deloitte": "deloitte.com",
  "pwc": "pwc.com",
  "kpmg": "kpmg.com",
  "ey": "ey.com",
  "ernst & young": "ey.com",
  "mckinsey": "mckinsey.com",
  "bcg": "bcg.com",
  "boston consulting group": "bcg.com",
  "bain": "bain.com",
};

/**
 * Get known domain for a company name
 */
function getKnownDomain(companyName: string): string | undefined {
  const normalizedName = companyName.toLowerCase().trim();
  
  // Direct match
  if (KNOWN_COMPANY_DOMAINS[normalizedName]) {
    return KNOWN_COMPANY_DOMAINS[normalizedName];
  }
  
  // Try partial match (e.g., "Microsoft Corporation" → "microsoft")
  for (const [key, domain] of Object.entries(KNOWN_COMPANY_DOMAINS)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return domain;
    }
  }
  
  return undefined;
}

/**
 * Extract comprehensive organization data from Tavily search results
 * Extracts all fields needed for enrichWithAIActContext
 */
function extractComprehensiveData(
  name: string,
  domain: string | undefined,
  searchResults: any
): Partial<OrganizationProfile> {
  const answer = searchResults.answer || "";
  const results = searchResults.results || [];
  const allContent = answer.toLowerCase() + results.map((r: any) => r.content).join(" ").toLowerCase();
  
  console.error("\n📊 Tavily Data Extraction Log:");
  console.error("=" .repeat(60));
  console.error(`Company: ${name}`);
  console.error(`Domain: ${domain || "Not provided"}`);
  console.error(`Answer length: ${answer.length} chars`);
  console.error(`Results count: ${results.length}`);
  console.error("-".repeat(60));
  
  // Extract registration number (VAT, company registration)
  let registrationNumber: string | undefined;
  const regPatterns = [
    /vat\s*(?:number|id|registration)?[:\s]+([A-Z0-9\-]+)/i,
    /company\s*(?:registration|reg\.?|number)[:\s]+([A-Z0-9\-]+)/i,
    /registration\s*(?:number|no\.?)[:\s]+([A-Z0-9\-]+)/i,
    /\b([A-Z]{2}\d{8,})\b/, // EU VAT format
  ];
  
  for (const pattern of regPatterns) {
    const match = allContent.match(pattern);
    if (match) {
      registrationNumber = match[1];
      console.error(`✅ Registration Number found: ${registrationNumber}`);
      break;
    }
  }
  if (!registrationNumber) {
    console.error("❌ Registration Number: Not found");
  }
  
  // Extract headquarters location
  let headquartersCountry = "Unknown";
  let headquartersCity = "Unknown";
  let headquartersAddress: string | undefined;
  
  const countryPatterns = [
    /headquarters?[:\s]+(?:in|at|located in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /based\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    /located\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
  ];
  
  for (const pattern of countryPatterns) {
    const match = answer.match(pattern);
    if (match) {
      const location = match[1];
      if (location.includes("United States") || location.includes("USA") || location.includes("U.S.")) {
        headquartersCountry = "United States";
      } else if (location.includes("United Kingdom") || location.includes("UK")) {
        headquartersCountry = "United Kingdom";
      } else if (location.match(/\b(Germany|France|Spain|Italy|Netherlands|Belgium|Austria|Sweden|Denmark|Poland|Portugal|Finland|Ireland|Czech|Romania|Greece|Hungary|Slovakia|Bulgaria|Croatia|Lithuania|Slovenia|Latvia|Estonia|Luxembourg|Malta|Cyprus)\b/i)) {
        headquartersCountry = location;
      } else {
        headquartersCountry = location;
      }
      console.error(`✅ Headquarters Country: ${headquartersCountry}`);
      break;
    }
  }
  
  const cityPatterns = [
    /headquarters?[:\s]+(?:in|at)\s+([A-Z][a-z]+),?\s+(?:[A-Z][a-z]+)/,
    /based\s+in\s+([A-Z][a-z]+),/,
    /located\s+in\s+([A-Z][a-z]+),/,
  ];
  
  for (const pattern of cityPatterns) {
    const match = answer.match(pattern);
    if (match) {
      headquartersCity = match[1];
      console.error(`✅ Headquarters City: ${headquartersCity}`);
      break;
    }
  }
  
  if (headquartersCountry === "Unknown") {
    console.error("❌ Headquarters Country: Not found");
  }
  if (headquartersCity === "Unknown") {
    console.error("❌ Headquarters City: Not found");
  }
  
  // Extract contact information
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = allContent.match(emailPattern);
  const email = emailMatch ? emailMatch[1] : (domain ? `contact@${domain}` : "unknown@example.com");
  console.error(`✅ Contact Email: ${email}`);
  
  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = allContent.match(phonePattern);
  const phone = phoneMatch ? phoneMatch[0] : undefined;
  if (phone) {
    console.error(`✅ Contact Phone: ${phone}`);
  } else {
    console.error("❌ Contact Phone: Not found");
  }
  
  const websiteUrl = domain ? `https://${domain}` : results[0]?.url || undefined;
  if (websiteUrl) {
    console.error(`✅ Website: ${websiteUrl}`);
  }
  
  // Extract sector - look for company type indicators
  let sector = "Technology"; // default
  
  // Look for explicit company type mentions
  if (allContent.includes("technology company") || allContent.includes("tech company") || 
      allContent.includes("software company") || allContent.includes("it services") ||
      allContent.includes("information technology") || allContent.includes("computer") ||
      allContent.includes("semiconductor") || allContent.includes("cloud computing") ||
      allContent.includes("artificial intelligence") || allContent.includes("ai company")) {
    sector = "Technology";
  } else if (allContent.includes("healthcare company") || allContent.includes("medical company") ||
             allContent.includes("pharmaceutical") || allContent.includes("biotech") ||
             allContent.includes("life sciences")) {
    sector = "Healthcare";
  } else if (allContent.includes("financial services") || allContent.includes("banking company") ||
             allContent.includes("insurance company") || allContent.includes("financial company") ||
             allContent.includes("investment") && allContent.includes("company")) {
    sector = "Financial Services";
  } else if (allContent.includes("retail company") || allContent.includes("e-commerce company") ||
             allContent.includes("retail business")) {
    sector = "Retail";
  } else if (allContent.includes("manufacturing company") || allContent.includes("industrial")) {
    sector = "Manufacturing";
  } else if (allContent.includes("education company") || allContent.includes("educational") ||
             allContent.includes("university") || allContent.includes("school")) {
    sector = "Education";
  } else if (allContent.includes("media company") || allContent.includes("entertainment")) {
    sector = "Media & Entertainment";
  } else if (allContent.includes("energy company") || allContent.includes("oil") && allContent.includes("gas")) {
    sector = "Energy";
  } else if (allContent.includes("telecommunications") || allContent.includes("telecom")) {
    sector = "Telecommunications";
  } else if (allContent.includes("automotive") || allContent.includes("car")) {
    sector = "Automotive";
  }
  // Fallback: if only generic mentions exist, keep default Technology
  console.error(`✅ Sector: ${sector}`);
  
  // Extract EU presence
  const hasEUPresence = allContent.includes("europe") || 
                        allContent.includes("eu ") || 
                        allContent.includes("european") ||
                        allContent.includes("gdpr") ||
                        headquartersCountry.match(/\b(Germany|France|Spain|Italy|Netherlands|Belgium|Austria|Sweden|Denmark|Poland|Portugal|Finland|Ireland|Czech|Romania|Greece|Hungary|Slovakia|Bulgaria|Croatia|Lithuania|Slovenia|Latvia|Estonia|Luxembourg|Malta|Cyprus)\b/i);
  console.error(`✅ EU Presence: ${hasEUPresence}`);
  
  // Extract jurisdiction
  const jurisdictions: string[] = [];
  if (hasEUPresence) jurisdictions.push("EU");
  if (allContent.includes("united states") || allContent.includes("usa") || allContent.includes("u.s.")) {
    jurisdictions.push("United States");
  }
  if (allContent.includes("united kingdom") || allContent.includes("uk")) {
    jurisdictions.push("United Kingdom");
  }
  if (jurisdictions.length === 0) jurisdictions.push("Unknown");
  console.error(`✅ Jurisdictions: ${jurisdictions.join(", ")}`);
  
  // Extract company size
  let size: "Startup" | "SME" | "Enterprise" = "SME";
  if (allContent.includes("startup") || allContent.includes("founded recently")) {
    size = "Startup";
  } else if (allContent.includes("enterprise") || allContent.includes("fortune 500") || 
             allContent.includes("multinational") || allContent.includes("global corporation") ||
             allContent.includes("large company")) {
    size = "Enterprise";
  }
  console.error(`✅ Company Size: ${size}`);
  
  // Extract AI maturity
  let aiMaturityLevel: "Nascent" | "Developing" | "Mature" | "Leader" = "Developing";
  if (allContent.includes("ai leader") || allContent.includes("ai pioneer") || allContent.includes("leading ai")) {
    aiMaturityLevel = "Leader";
  } else if (allContent.includes("ai-powered") || allContent.includes("machine learning") || allContent.includes("deep learning")) {
    aiMaturityLevel = "Mature";
  } else if (allContent.includes("exploring ai") || allContent.includes("starting ai")) {
    aiMaturityLevel = "Nascent";
  }
  console.error(`✅ AI Maturity Level: ${aiMaturityLevel}`);
  
  // Extract certifications
  const certifications: string[] = [];
  if (allContent.includes("iso 27001")) certifications.push("ISO 27001");
  if (allContent.includes("iso 27701")) certifications.push("ISO 27701");
  if (allContent.includes("iso 9001")) certifications.push("ISO 9001");
  if (allContent.includes("soc 2")) certifications.push("SOC 2");
  if (allContent.includes("gdpr")) certifications.push("GDPR Compliant");
  if (allContent.includes("hipaa")) certifications.push("HIPAA");
  console.error(`✅ Certifications: ${certifications.length > 0 ? certifications.join(", ") : "None found"}`);
  
  // Extract quality management system
  const hasQMS = allContent.includes("quality management") || 
                 allContent.includes("iso 9001") ||
                 allContent.includes("qms");
  console.error(`✅ Quality Management System: ${hasQMS}`);
  
  // Extract risk management system
  const hasRMS = allContent.includes("risk management") || 
                 allContent.includes("risk management system") ||
                 allContent.includes("enterprise risk management");
  console.error(`✅ Risk Management System: ${hasRMS}`);
  
  // Extract authorized representative (for non-EU companies)
  const hasAuthorizedRep = allContent.includes("authorized representative") ||
                           allContent.includes("eu representative");
  console.error(`✅ Authorized Representative: ${hasAuthorizedRep || "Not found"}`);
  
  // Extract notified body ID
  let notifiedBodyId: string | undefined;
  const notifiedBodyPattern = /notified\s+body[:\s]+([A-Z0-9\-]+)/i;
  const notifiedMatch = allContent.match(notifiedBodyPattern);
  if (notifiedMatch) {
    notifiedBodyId = notifiedMatch[1];
    console.error(`✅ Notified Body ID: ${notifiedBodyId}`);
  } else {
    console.error("❌ Notified Body ID: Not found");
  }
  
  console.error("=" .repeat(60));
  console.error("📊 Extraction Complete\n");
  
  return {
    organization: {
      name,
      registrationNumber,
      sector,
      size,
      jurisdiction: jurisdictions,
      euPresence: !!hasEUPresence,
      headquarters: {
        country: headquartersCountry,
        city: headquartersCity,
        address: headquartersAddress,
      },
      contact: {
        email,
        phone,
        website: websiteUrl,
      },
      aiMaturityLevel,
      aiSystemsCount: 0,
      primaryRole: "Provider",
    },
    regulatoryContext: {
      applicableFrameworks: ["EU AI Act", "GDPR"],
      complianceDeadlines: [], // Will be populated in researchOrganization
      existingCertifications: certifications,
      hasAuthorizedRepresentative: hasAuthorizedRep || undefined,
      notifiedBodyId,
      hasQualityManagementSystem: hasQMS,
      hasRiskManagementSystem: hasRMS,
    },
  };
}

/**
 * Research organization using Tavily AI search
 * Performs comprehensive company research with a single advanced search
 */
async function researchOrganization(
  name: string,
  domain?: string,
  context?: string
): Promise<Partial<OrganizationProfile>> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set, using fallback mock data");
    return createFallbackProfile(name, domain);
  }
  
  try {
    const client = tavily({ apiKey });
    
    // Optimized search query (max 400 chars for Tavily)
    // Focus on key identifiers that yield rich company information
    const comprehensiveQuery = `${name} company headquarters location sector size AI products services certifications${context ? ` ${context}` : ""}`.slice(0, 400);
    
    console.error("\n🔍 Starting Tavily Comprehensive Search:");
    console.error(`Organization: ${name}`);
    console.error(`Query: ${comprehensiveQuery.substring(0, 100)}...`);
    
    const searchResults = await client.search(comprehensiveQuery, {
      searchDepth: "advanced",
      maxResults: 10,
      includeAnswer: true,
    });
    
    console.error("\n✅ Tavily Search Complete");
    console.error(`Answer length: ${searchResults.answer?.length || 0} characters`);
    console.error(`Results found: ${searchResults.results?.length || 0}`);
    console.error(`Sources: ${searchResults.results?.slice(0, 3).map((r: any) => r.url).join(", ") || "None"}`);
    
    // Auto-discover domain if not provided
    let discoveredDomain = domain;
    if (!discoveredDomain) {
      // First, check if it's a known company
      const knownDomain = getKnownDomain(name);
      if (knownDomain) {
        console.error(`\n✅ Using known company domain: ${knownDomain}`);
        discoveredDomain = knownDomain;
      } else {
        console.error("\n🔎 Auto-discovering company domain from search results...");
        discoveredDomain = findCompanyDomain(searchResults, name);
      }
    } else {
      console.error(`\n✅ Using provided domain: ${discoveredDomain}`);
    }
    
    const now = new Date().toISOString();
    
    // Extract all comprehensive data from single search
    const extractedData = extractComprehensiveData(name, discoveredDomain, searchResults);
    
    // Extract branding information (logo and colors)
    console.error("\n🎨 Extracting branding information...");
    const branding = await getBrandingInfo(name, discoveredDomain, searchResults);
    console.error(`✅ Branding extraction complete: ${branding?.source || "none"}`);
    
    const completenessScore = calculateCompletenessScore(searchResults);
    
    return {
      organization: {
        ...extractedData.organization,
        name: extractedData.organization?.name || name,
        sector: extractedData.organization?.sector || "Technology",
        size: extractedData.organization?.size || "SME",
        jurisdiction: extractedData.organization?.jurisdiction || ["Unknown"],
        euPresence: extractedData.organization?.euPresence ?? false,
        headquarters: extractedData.organization?.headquarters || { country: "Unknown", city: "Unknown" },
        contact: {
          email: extractedData.organization?.contact?.email || "unknown@example.com",
          phone: extractedData.organization?.contact?.phone,
          website: extractedData.organization?.contact?.website,
        },
        branding,
        aiMaturityLevel: extractedData.organization?.aiMaturityLevel || "Developing",
        aiSystemsCount: extractedData.organization?.aiSystemsCount || 0,
        primaryRole: extractedData.organization?.primaryRole || "Provider",
      },
      regulatoryContext: {
        applicableFrameworks: ["EU AI Act", "GDPR"],
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
        existingCertifications: extractedData.regulatoryContext?.existingCertifications || [],
        hasAuthorizedRepresentative: extractedData.regulatoryContext?.hasAuthorizedRepresentative,
        notifiedBodyId: extractedData.regulatoryContext?.notifiedBodyId,
        hasQualityManagementSystem: extractedData.regulatoryContext?.hasQualityManagementSystem ?? false,
        hasRiskManagementSystem: extractedData.regulatoryContext?.hasRiskManagementSystem ?? false,
      },
      metadata: {
        createdAt: now,
        lastUpdated: now,
        completenessScore,
        dataSource: "tavily-research",
        tavilyResults: {
          overview: searchResults.answer || "No overview available",
          aiCapabilities: searchResults.answer || "No AI information found",
          compliance: searchResults.answer || "No compliance information found",
          sources: searchResults.results?.slice(0, 5).map((r: any) => r.url) || [],
        },
      },
    };
  } catch (error) {
    console.error("❌ Tavily research error:", error);
    return createFallbackProfile(name, domain);
  }
}

/**
 * Calculate completeness score based on search results quality
 */
function calculateCompletenessScore(
  searchResults: any
): number {
  let score = 50; // base score
  
  if (searchResults.results?.length > 0) {
    score += 20;
    // Bonus for more results
    if (searchResults.results.length >= 5) score += 10;
    if (searchResults.results.length >= 10) score += 10;
  }
  if (searchResults.answer) {
    score += 10;
    // Bonus for longer, more detailed answers
    if (searchResults.answer.length > 500) score += 10;
  }
  
  return Math.min(score, 100);
}

/**
 * Fallback profile when Tavily is not available
 */
function createFallbackProfile(name: string, domain?: string): Partial<OrganizationProfile> {
  const now = new Date().toISOString();
  
  return {
    organization: {
      name,
      sector: "Technology",
      size: "SME",
      jurisdiction: ["EU"],
      euPresence: true,
      headquarters: {
        country: "Unknown",
        city: "Unknown",
      },
      contact: {
        email: domain ? `contact@${domain}` : "unknown@example.com",
        website: domain ? `https://${domain}` : undefined,
      },
      aiMaturityLevel: "Developing",
      aiSystemsCount: 0,
      primaryRole: "Provider",
    },
    regulatoryContext: {
      applicableFrameworks: ["EU AI Act", "GDPR"],
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
      completenessScore: 40,
      dataSource: "fallback-mock",
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
      branding: profile.organization?.branding,
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

  console.error("Raw result:", JSON.stringify(researchedData, null, 2));

  // Step 2: Enrich with AI Act context
  const enrichedProfile = enrichWithAIActContext(researchedData);

  // Step 3: Return complete profile
  return enrichedProfile;
}

