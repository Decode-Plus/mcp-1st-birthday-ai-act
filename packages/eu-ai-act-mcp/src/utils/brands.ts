/**
 * Known brand colors and logos for major companies
 * Fallback when logo extraction fails
 */

export interface BrandData {
  logoUrl: string;
  primaryColor: string;
  palette: string[];
}

export const KNOWN_BRANDS: Record<string, BrandData> = {
  // Tech Giants
  google: {
    logoUrl: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
    primaryColor: "#4285F4",
    palette: ["#4285F4", "#EA4335", "#FBBC05", "#34A853"],
  },
  microsoft: {
    logoUrl: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b",
    primaryColor: "#00A4EF",
    palette: ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"],
  },
  apple: {
    logoUrl: "https://www.apple.com/ac/globalnav/7/en_US/images/be15095f-5a20-57d0-ad14-cf4c638e223a/globalnav_apple_image__b5er5ngrzxqq_large.svg",
    primaryColor: "#000000",
    palette: ["#000000", "#555555", "#A3AAAE"],
  },
  amazon: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    primaryColor: "#FF9900",
    palette: ["#FF9900", "#232F3E", "#146EB4"],
  },
  meta: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
    primaryColor: "#0081FB",
    palette: ["#0081FB", "#0064E0", "#0A66C2"],
  },
  facebook: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
    primaryColor: "#1877F2",
    palette: ["#1877F2", "#166FE5", "#0866FF"],
  },
  // AI Companies
  openai: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
    primaryColor: "#10A37F",
    palette: ["#10A37F", "#000000", "#FFFFFF"],
  },
  anthropic: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/7/78/Anthropic_logo.svg",
    primaryColor: "#D4A574",
    palette: ["#D4A574", "#1A1A1A", "#F5F5F5"],
  },
  // Enterprise Tech
  salesforce: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
    primaryColor: "#00A1E0",
    palette: ["#00A1E0", "#032D60", "#1B96FF"],
  },
  oracle: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
    primaryColor: "#F80000",
    palette: ["#F80000", "#000000", "#312D2A"],
  },
  sap: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/59/SAP_2011_logo.svg",
    primaryColor: "#0FAAFF",
    palette: ["#0FAAFF", "#000000", "#354A5F"],
  },
  ibm: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
    primaryColor: "#0530AD",
    palette: ["#0530AD", "#000000", "#161616"],
  },
  // European Tech
  spotify: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg",
    primaryColor: "#1DB954",
    palette: ["#1DB954", "#191414", "#FFFFFF"],
  },
  // Cloud Providers
  aws: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
    primaryColor: "#FF9900",
    palette: ["#FF9900", "#232F3E", "#146EB4"],
  },
  // Social/Tech
  twitter: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg",
    primaryColor: "#1DA1F2",
    palette: ["#1DA1F2", "#14171A", "#657786"],
  },
  x: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg",
    primaryColor: "#000000",
    palette: ["#000000", "#FFFFFF"],
  },
  linkedin: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
    primaryColor: "#0A66C2",
    palette: ["#0A66C2", "#000000", "#FFFFFF"],
  },
  // Healthcare/Pharma
  pfizer: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Pfizer_%282021%29.svg",
    primaryColor: "#0093D0",
    palette: ["#0093D0", "#003087", "#FFFFFF"],
  },
  // Automotive
  tesla: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png",
    primaryColor: "#E82127",
    palette: ["#E82127", "#000000", "#FFFFFF"],
  },
  // Finance
  visa: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg",
    primaryColor: "#1A1F71",
    palette: ["#1A1F71", "#F7B600", "#FFFFFF"],
  },
  mastercard: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg",
    primaryColor: "#EB001B",
    palette: ["#EB001B", "#FF5F00", "#F79E1B"],
  },
  stripe: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
    primaryColor: "#635BFF",
    palette: ["#635BFF", "#00D4FF", "#0A2540"],
  },
  // Consulting
  accenture: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Accenture.svg",
    primaryColor: "#A100FF",
    palette: ["#A100FF", "#000000", "#FFFFFF"],
  },
  deloitte: {
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/56/Deloitte.svg",
    primaryColor: "#86BC25",
    palette: ["#86BC25", "#000000", "#FFFFFF"],
  },
};

