/**
 * Compliance Assessment Tool - FAST MODE
 * EU AI Act compliance analysis optimized for speed
 * Generates brief outputs for agent processing
 */

import { generateText } from "ai";
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
import { getModel, type ApiKeys } from "../utils/model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * EU AI Act guidelines for compliance assessment
 * Based on Regulation (EU) 2024/1689 - Official Journal L 2024/1689, 12.7.2024
 */
const EU_AI_ACT_BRIEF = `You are an expert EU AI Act compliance consultant. You have deep knowledge of:

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

**When analyzing compliance, always:**
1. Reference specific articles and annexes
2. Provide actionable remediation steps
3. Prioritize gaps by severity (CRITICAL, HIGH, MEDIUM, LOW)
4. Calculate realistic compliance scores
5. ALWAYS classify legal/judicial AI systems as HIGH RISK per Annex III Point 8(a)`;

/**
 * HIGH-RISK KEYWORDS from EU AI Act Annex III
 */
const HIGH_RISK_KEYWORDS = [
	"legal",
	"law",
	"lawyer",
	"attorney",
	"judicial",
	"justice",
	"court",
	"litigation",
	"contract",
	"compliance",
	"regulatory",
	"dispute resolution",
	"arbitration",
	"recruitment",
	"hiring",
	"hr",
	"employee",
	"resume",
	"candidate",
	"termination",
	"credit",
	"scoring",
	"loan",
	"insurance",
	"creditworthiness",
	"biometric",
	"facial recognition",
	"fingerprint",
	"identity verification",
	"education",
	"student",
	"exam",
	"grading",
	"admission",
	"law enforcement",
	"police",
	"crime",
	"profiling",
	"critical infrastructure",
	"healthcare",
	"medical",
	"diagnosis",
	"patient",
];

/**
 * Generate BRIEF assessment prompt
 */
function generateAssessmentPrompt(
	organizationContext?: OrganizationProfile,
	aiServicesContext?: AISystemsDiscoveryResponse,
	focusAreas?: string[],
): string {
	let prompt = `${EU_AI_ACT_BRIEF}\n\nASSESS COMPLIANCE:\n`;

	if (organizationContext?.organization) {
		const org = organizationContext.organization;
		prompt += `Org: ${org.name} | ${org.sector} | ${org.size} | EU:${org.euPresence}\n`;
	}

	if (aiServicesContext?.systems) {
		const rs = aiServicesContext.riskSummary;
		prompt += `Systems: ${rs.totalCount} (High:${rs.highRiskCount}, Ltd:${rs.limitedRiskCount}, Min:${rs.minimalRiskCount})\n`;
		for (const s of aiServicesContext.systems.slice(0, 5)) {
			prompt += `- ${s.system.name}: ${s.riskClassification.category} | ${s.system.intendedPurpose.slice(0, 50)}\n`;
		}
	}

	if (focusAreas?.length) prompt += `Focus: ${focusAreas.join(", ")}\n`;

	prompt += `\nJSON OUTPUT (be brief, max 3 gaps, max 3 recommendations):
{"overallScore":<0-100>,"riskLevel":"<CRITICAL|HIGH|MEDIUM|LOW>","gaps":[{"id":"g1","severity":"<sev>","category":"<cat>","description":"<brief>","affectedSystems":["<sys>"],"articleReference":"<Art>","currentState":"<now>","requiredState":"<needed>","remediationEffort":"<L|M|H>","deadline":"<date>"}],"recommendations":[{"id":"r1","priority":<1-10>,"title":"<title>","description":"<brief>","articleReference":"<Art>","implementationSteps":["<s1>","<s2>"],"estimatedEffort":"<est>","expectedOutcome":"<out>","dependencies":[]}],"reasoning":"<1 sentence>"}`;

	return prompt;
}

/**
 * Validate risk classification
 */
function validateRiskClassification(
	rc: any,
	ctx?: { name?: string; description?: string; intendedPurpose?: string },
): any {
	if (!rc) return rc;
	const result = { ...rc };
	const text = [
		ctx?.name,
		ctx?.description,
		ctx?.intendedPurpose,
		rc.annexIIICategory,
		rc.justification,
	]
		.join(" ")
		.toLowerCase();

	const hasHighRisk = HIGH_RISK_KEYWORDS.some((k) => text.includes(k));
	const isLegal = [
		"legal",
		"law",
		"lawyer",
		"judicial",
		"justice",
		"court",
		"contract",
		"compliance",
	].some((k) => text.includes(k));

	if (
		isLegal ||
		hasHighRisk ||
		rc.riskScore >= 70 ||
		rc.conformityAssessmentRequired
	) {
		result.category = "High";
		if (isLegal) {
			result.annexIIICategory = "Annex III, Point 8(a) - Legal/Justice";
			result.riskScore = Math.max(result.riskScore || 0, 85);
		}
		result.conformityAssessmentRequired = true;
		result.conformityAssessmentType =
			result.conformityAssessmentType || "Internal Control";
	}

	return result;
}

/**
 * Validate AI services context
 */
function validateAIServicesContext(context: any): any {
	if (!context?.systems) return context;

	const systems = context.systems.map((s: any) => ({
		...s,
		riskClassification: validateRiskClassification(s.riskClassification, {
			name: s.system?.name,
			description: s.system?.description,
			intendedPurpose: s.system?.intendedPurpose,
		}),
	}));

	return {
		...context,
		systems,
		riskSummary: {
			unacceptableRiskCount: systems.filter(
				(s: any) => s.riskClassification?.category === "Unacceptable",
			).length,
			highRiskCount: systems.filter(
				(s: any) => s.riskClassification?.category === "High",
			).length,
			limitedRiskCount: systems.filter(
				(s: any) => s.riskClassification?.category === "Limited",
			).length,
			minimalRiskCount: systems.filter(
				(s: any) => s.riskClassification?.category === "Minimal",
			).length,
			totalCount: systems.length,
		},
	};
}

/**
 * Parse JSON safely
 */
function parseJSON<T>(content: string): T | null {
	try {
		const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
		const json = match
			? match[1].trim()
			: content.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}

/**
 * Normalize organization context
 */
function normalizeOrgContext(ctx: any): OrganizationProfile {
	if (ctx?.organization) return ctx;
	return {
		organization: {
			name: ctx?.name || "Unknown",
			sector: ctx?.sector || "Technology",
			size: ctx?.size || "Enterprise",
			jurisdiction: ctx?.jurisdiction || ["EU"],
			euPresence: ctx?.euPresence ?? true,
			headquarters: ctx?.headquarters || {
				country: "Unknown",
				city: "Unknown",
			},
			contact: ctx?.contact || { email: "unknown@example.com" },
			aiMaturityLevel: ctx?.aiMaturityLevel || "Developing",
			aiSystemsCount: ctx?.aiSystemsCount || 0,
			primaryRole: ctx?.primaryRole || "Provider",
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
			dataSource: "input",
		},
	};
}

/**
 * Normalize AI services context
 */
function normalizeServicesContext(ctx: any): AISystemsDiscoveryResponse {
	if (ctx?.riskSummary) return ctx;
	const systems = ctx?.systems || [];
	return {
		systems: systems.map((s: any) => ({
			system: {
				name: s.name || "Unknown",
				systemId: s.systemId || `sys-${Date.now()}`,
				description: s.description || "",
				intendedPurpose: s.intendedPurpose || "",
				version: "1.0",
				status: "Production",
				provider: { name: "Unknown", role: "Provider", contact: "" },
			},
			riskClassification: {
				category: s.riskLevel || "Minimal",
				safetyComponent: false,
				annexIIICategory: "N/A",
				justification: "",
				riskScore: 50,
				conformityAssessmentRequired: false,
				conformityAssessmentType: "Not Required",
				regulatoryReferences: [],
			},
			technicalDetails: {
				aiTechnology: s.aiTechnology || ["ML"],
				dataProcessed: [],
				processesSpecialCategoryData: false,
				deploymentModel: "Cloud",
				vendor: "",
				integrations: [],
				humanOversight: { enabled: true, description: "" },
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
				identifiedGaps: [],
				complianceDeadline: "2026-08-02",
				estimatedComplianceEffort: "TBD",
			},
			metadata: {
				createdAt: new Date().toISOString(),
				lastUpdated: new Date().toISOString(),
				dataSource: "input",
				discoveryMethod: "manual",
				researchSources: [],
			},
		})),
		riskSummary: {
			unacceptableRiskCount: 0,
			highRiskCount: 0,
			limitedRiskCount: 0,
			minimalRiskCount: systems.length,
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
			legislation: "EU AI Act 2024/1689",
			officialJournal: "OJ L 2024/1689",
			entryIntoForce: "Aug 2024",
			implementationTimeline: "Aug 2026",
			jurisdiction: "EU",
		},
		complianceDeadlines: {
			highRisk: "Aug 2026",
			limitedRisk: "Jun 2026",
			generalGPAI: "Aug 2026",
		},
		discoverySources: ["input"],
		discoveryMetadata: {
			timestamp: new Date().toISOString(),
			method: "input",
			coverage: `${systems.length} systems`,
			researchIntegration: "N/A",
			conformityAssessmentUrgency: "Review",
		},
	};
}

/**
 * Generate BRIEF documentation templates with prefilled data
 */
function generateDocTemplates(
	orgName: string,
	systems: string[],
	gaps: GapAnalysis[],
): ComplianceDocumentation {
	const sysStr = systems.slice(0, 5).join(", ");
	const gapStr = gaps
		.slice(0, 3)
		.map((g) => `- ${g.category}: ${g.description}`)
		.join("\n");

	return {
		riskManagementTemplate: `# Risk Management System - ${orgName}
## Article 9 Compliance

**Organization:** ${orgName}
**Systems:** ${sysStr}
**Date:** ${new Date().toLocaleDateString()}

### 1. Risk Identification
[List risks for each AI system]

### 2. Risk Analysis
[Analyze likelihood and impact]

### 3. Risk Mitigation
[Document mitigation measures]

### 4. Monitoring
[Describe ongoing monitoring process]

### Key Gaps to Address:
${gapStr || "None identified"}
`,
		technicalDocumentation: `# Technical Documentation - ${orgName}
## Article 11 / Annex IV Compliance

**Organization:** ${orgName}
**Systems:** ${sysStr}
**Date:** ${new Date().toLocaleDateString()}

### 1. System Description
[Describe each AI system's purpose and functionality]

### 2. Intended Purpose
[Document intended use cases and limitations]

### 3. Data Governance
[Describe training data, quality measures, bias detection]

### 4. Performance Metrics
[Document accuracy, robustness, cybersecurity measures]

### 5. Human Oversight
[Describe human intervention mechanisms]

### Key Gaps to Address:
${gapStr || "None identified"}
`,
	};
}

/**
 * Save documentation files
 */
async function saveDocFiles(
	docs: ComplianceDocumentation,
	assessment: any,
	orgName?: string,
): Promise<string[]> {
	const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
	const org = orgName?.replace(/[^a-zA-Z0-9]/g, "_") || "Org";
	const dir = join(process.cwd(), "compliance-docs", `${org}_${ts}`);

	await mkdir(dir, { recursive: true });
	const paths: string[] = [];

	// Save report
	const report = `# EU AI Act Compliance Report - ${orgName || "Organization"}
**Date:** ${new Date().toLocaleDateString()}
**Score:** ${assessment.overallScore}/100 | **Risk:** ${assessment.riskLevel}

## Gaps (${assessment.gaps.length})
${assessment.gaps.map((g: GapAnalysis) => `- **${g.severity}** ${g.category}: ${g.description} (${g.articleReference})`).join("\n")}

## Recommendations (${assessment.recommendations.length})
${assessment.recommendations.map((r: Recommendation) => `- **P${r.priority}** ${r.title}: ${r.description}`).join("\n")}

## Next Steps
1. Address critical gaps first
2. Complete technical documentation (Art 11)
3. Conduct conformity assessment (Art 43)
4. Register in EU database (Art 49)
`;
	const reportPath = join(dir, "00_Compliance_Report.md");
	await writeFile(reportPath, report);
	paths.push(reportPath);

	if (docs.riskManagementTemplate) {
		const p = join(dir, "01_Risk_Management.md");
		await writeFile(p, docs.riskManagementTemplate);
		paths.push(p);
	}
	if (docs.technicalDocumentation) {
		const p = join(dir, "02_Technical_Docs.md");
		await writeFile(p, docs.technicalDocumentation);
		paths.push(p);
	}

	return paths;
}

/**
 * Main compliance assessment - FAST MODE
 */
export async function assessCompliance(
	input: ComplianceAssessmentInput & {
		model?: string;
		apiKeys?: ApiKeys;
		tavilyApiKey?: string;
	},
): Promise<ComplianceAssessmentResponse> {
	let {
		organizationContext,
		aiServicesContext,
		focusAreas,
		generateDocumentation = true,
		model: modelParam,
		apiKeys,
	} = input;

	if (!modelParam) throw new Error("Model selection required");
	if (!apiKeys) throw new Error("API keys required");

	// Normalize inputs
	if (organizationContext && !organizationContext.organization) {
		organizationContext = normalizeOrgContext(organizationContext);
	}
	if (aiServicesContext && !aiServicesContext.riskSummary) {
		aiServicesContext = normalizeServicesContext(aiServicesContext);
	}
	if (aiServicesContext) {
		aiServicesContext = validateAIServicesContext(aiServicesContext);
	}

	console.error(
		`\n🔍 Fast Compliance Assessment: ${organizationContext?.organization?.name || "Unknown"}`,
	);

	const model = getModel(modelParam, apiKeys, "assess_compliance");

	// Single fast call - no streaming, no reasoning
	const result = await generateText({
		model,
		system:
			"EU AI Act compliance expert. Output valid JSON only. Be very brief.",
		prompt: generateAssessmentPrompt(
			organizationContext,
			aiServicesContext,
			focusAreas,
		),
		temperature: 0,
	});

	const data = parseJSON<{
		overallScore: number;
		riskLevel: string;
		gaps: GapAnalysis[];
		recommendations: Recommendation[];
		reasoning: string;
	}>(result.text);

	if (!data) throw new Error("Failed to parse assessment");

	console.error(
		`✅ Score: ${data.overallScore}/100 | Risk: ${data.riskLevel} | Gaps: ${data.gaps.length}`,
	);

	// Generate brief documentation templates
	let documentation: ComplianceDocumentation | undefined;
	let docPaths: string[] = [];

	if (generateDocumentation) {
		documentation = generateDocTemplates(
			organizationContext?.organization?.name || "Organization",
			aiServicesContext?.systems?.map((s) => s.system.name) || [],
			data.gaps,
		);

		try {
			docPaths = await saveDocFiles(
				documentation,
				data,
				organizationContext?.organization?.name,
			);
			console.error(`📄 Saved ${docPaths.length} docs`);
		} catch (e) {
			console.error("⚠️ Doc save failed:", e);
		}
	}

	const modelMap: Record<string, string> = {
		"gpt-5": "openai-gpt-5",
		"claude-4.5": "anthropic-claude-sonnet-4-5",
		"claude-opus": "anthropic-claude-opus-4",
		"gemini-3": "google-gemini-3-pro",
		"gpt-oss": "openai-gpt-oss-20b",
		"grok-4-1": "xai-grok-4-1",
	};
	const modelUsed = modelMap[modelParam] || "unknown";

	return {
		assessment: {
			overallScore: data.overallScore,
			riskLevel: data.riskLevel as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
			gaps: data.gaps,
			recommendations: data.recommendations,
			complianceByArticle: {},
		},
		documentation,
		reasoning: data.reasoning,
		metadata: {
			assessmentDate: new Date().toISOString(),
			assessmentVersion: "2.0-fast",
			modelUsed,
			organizationAssessed: organizationContext?.organization?.name,
			systemsAssessed:
				aiServicesContext?.systems?.map((s) => s.system.name) || [],
			focusAreas: focusAreas || [],
			documentationFiles: docPaths.length > 0 ? docPaths : undefined,
		},
	};
}
