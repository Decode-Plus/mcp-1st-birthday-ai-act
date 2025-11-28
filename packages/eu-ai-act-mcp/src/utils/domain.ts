/**
 * Domain utilities for organization discovery
 * Handles domain extraction and discovery from search results
 */

/**
 * Extract domain from URL
 */
export function extractDomainFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return undefined;
  }
}

/**
 * Find company domain from search results
 */
export function findCompanyDomain(
  searchResults: any,
  companyName: string
): string | undefined {
  const results = searchResults.results || [];

  // Look for official company website in results
  for (const result of results) {
    const url = result.url?.toLowerCase() || "";
    const title = result.title?.toLowerCase() || "";

    // Check if this looks like an official company website
    if (
      title.includes("official") ||
      title.includes("about") ||
      url.includes("/about")
    ) {
      const domain = extractDomainFromUrl(result.url);
      if (
        domain &&
        !domain.includes("linkedin") &&
        !domain.includes("wiki") &&
        !domain.includes("news")
      ) {
        console.error(`🌐 Found official company domain: ${domain}`);
        return domain;
      }
    }
  }

  // If no official website found, try to find main company domain
  for (const result of results) {
    const url = result.url?.toLowerCase() || "";
    const domain = extractDomainFromUrl(result.url);

    // Skip knowledge bases, wikis, news sites
    if (
      domain &&
      !domain.includes("linkedin") &&
      !domain.includes("wiki") &&
      !domain.includes("news") &&
      !domain.includes("ebsco") &&
      !domain.includes("globaldata")
    ) {
      console.error(`🌐 Found company domain from search: ${domain}`);
      return domain;
    }
  }

  return undefined;
}

