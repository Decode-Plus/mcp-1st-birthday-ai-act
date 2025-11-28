/**
 * Branding utilities for organization discovery
 * Handles logo discovery and color extraction from brand assets
 */

import ColorThief from "colorthief";
import type { OrganizationProfile } from "../types/index.js";
import { KNOWN_BRANDS } from "./brands.js";

/**
 * Convert RGB array to hex color string
 */
export function rgbToHex(rgb: [number, number, number]): string {
  return `#${rgb.map(x => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * Convert HSL to Hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Extract brand colors from a logo URL using ColorThief
 */
export async function extractColorsFromLogo(
  logoUrl: string
): Promise<{ primaryColor: string; palette: string[] } | null> {
  try {
    console.error(`🎨 Extracting colors from logo: ${logoUrl}`);

    // ColorThief.getColor and getPalette work with image URLs in Node.js
    const dominantColor = await ColorThief.getColor(logoUrl);
    const colorPalette = await ColorThief.getPalette(logoUrl, 5);

    const primaryColor = rgbToHex(dominantColor as [number, number, number]);
    const palette = colorPalette.map((rgb: number[]) =>
      rgbToHex(rgb as [number, number, number])
    );

    console.error(`✅ Extracted primary color: ${primaryColor}`);
    console.error(`✅ Extracted palette: ${palette.join(", ")}`);

    return { primaryColor, palette };
  } catch (error) {
    console.error(`❌ Failed to extract colors from logo: ${error}`);
    return null;
  }
}

/**
 * Find logo URL from search results
 */
export function findLogoFromSearchResults(
  searchResults: any,
  domain?: string
): string | undefined {
  const results = searchResults.results || [];

  // Look for logo URLs in search results
  for (const result of results) {
    const url = result.url?.toLowerCase() || "";

    // Check if this is an image or logo page
    if (url.includes("logo") || url.includes("brand") || url.includes("press-kit")) {
      // Try to find image URL in content
      const imgMatch = result.content?.match(
        /https?:\/\/[^\s"']+\.(png|jpg|jpeg|svg|webp)/i
      );
      if (imgMatch) {
        console.error(`🖼️ Found logo URL from press/brand page: ${imgMatch[0]}`);
        return imgMatch[0];
      }
    }
  }

  // Use Clearbit as fallback for logo URL if domain is available
  if (domain) {
    return `https://logo.clearbit.com/${domain}`;
  }

  return undefined;
}

/**
 * Get branding information for an organization
 */
export async function getBrandingInfo(
  name: string,
  domain?: string,
  searchResults?: any
): Promise<OrganizationProfile["organization"]["branding"]> {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Check if this is a known brand
  for (const [brandKey, brandData] of Object.entries(KNOWN_BRANDS)) {
    if (normalizedName.includes(brandKey) || brandKey.includes(normalizedName)) {
      console.error(`✅ Found known brand: ${brandKey}`);
      return {
        logoUrl: brandData.logoUrl,
        primaryColor: brandData.primaryColor,
        palette: brandData.palette,
        source: "known-brand",
      };
    }
  }

  // Try to find logo from search results
  let logoUrl: string | undefined;
  if (searchResults) {
    logoUrl = findLogoFromSearchResults(searchResults, domain);
  }

  // Use Clearbit as fallback for logo URL
  if (!logoUrl && domain) {
    logoUrl = `https://logo.clearbit.com/${domain}`;
    console.error(`🔄 Using Clearbit logo API: ${logoUrl}`);
  }

  // If we have a logo URL, try to extract colors
  if (logoUrl) {
    try {
      const colors = await extractColorsFromLogo(logoUrl);
      if (colors) {
        return {
          logoUrl,
          primaryColor: colors.primaryColor,
          palette: colors.palette,
          source: "logo-extraction",
        };
      }
    } catch (error) {
      console.error(`⚠️ Color extraction failed, using fallback: ${error}`);
    }
  }

  // Fallback - generate colors based on company name hash
  const hash = normalizedName.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const hue = Math.abs(hash) % 360;
  const primaryColor = hslToHex(hue, 70, 50);
  const palette = [
    primaryColor,
    hslToHex(hue, 60, 40),
    hslToHex(hue, 80, 60),
    hslToHex((hue + 30) % 360, 70, 50),
    hslToHex((hue + 180) % 360, 70, 50),
  ];

  console.error(`🎨 Generated fallback colors based on name hash`);
  console.error(`Primary: ${primaryColor}, Palette: ${palette.join(", ")}`);

  return {
    logoUrl,
    primaryColor,
    palette,
    source: "fallback",
  };
}

