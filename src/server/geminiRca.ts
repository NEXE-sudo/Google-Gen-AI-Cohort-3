import { normalizeExternalText, redactSecrets } from "../lib/security";

export const INSUFFICIENT_EVIDENCE =
  "Insufficient evidence to determine the root cause.";

export const RCA_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  propertyOrdering: [
    "summary",
    "likelyRootCause",
    "confidence",
    "evidence",
    "affectedComponents",
    "relatedCommits",
    "relatedPullRequests",
    "recommendedActions",
    "uncertainty",
  ],
  properties: {
    summary: { type: "string", maxLength: 1_000 },
    likelyRootCause: { type: "string", maxLength: 1_000 },
    confidence: { type: "string", enum: ["High", "Medium", "Low"] },
    evidence: {
      type: "array",
      items: { type: "string", maxLength: 500 },
      maxItems: 20,
    },
    affectedComponents: {
      type: "array",
      items: { type: "string", maxLength: 300 },
      maxItems: 20,
    },
    relatedCommits: {
      type: "array",
      items: { type: "string", maxLength: 100 },
      maxItems: 20,
    },
    relatedPullRequests: {
      type: "array",
      items: { type: "string", maxLength: 100 },
      maxItems: 20,
    },
    recommendedActions: {
      type: "array",
      items: { type: "string", maxLength: 500 },
      maxItems: 20,
    },
    uncertainty: { type: "string", maxLength: 1_000 },
  },
} as const;

export interface FailureAnalysisInput {
  logs?: string;
  commit?: string;
  recentCommits?: string[];
}

export interface FailureAnalysis {
  summary: string;
  likelyRootCause: string;
  confidence: "High" | "Medium" | "Low";
  evidence: string[];
  affectedComponents: string[];
  relatedCommits: string[];
  relatedPullRequests: string[];
  recommendedActions: string[];
  uncertainty: string;
}

function boundedText(value: unknown, maxLength: number, fallback = "") {
  return typeof value === "string"
    ? redactSecrets(normalizeExternalText(value)).slice(0, maxLength)
    : fallback;
}

function boundedStrings(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => boundedText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function validateFailureAnalysis(
  value: unknown,
  input: FailureAnalysisInput,
): FailureAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("Malformed Gemini response.");
  }

  const data = value as Record<string, unknown>;
  const sourceEvidence = [
    input.logs || "",
    input.commit || "",
    ...(input.recentCommits || []),
  ].join("\n");
  const evidence = boundedStrings(data.evidence, 20, 500).filter((item) =>
    sourceEvidence.toLowerCase().includes(item.toLowerCase()),
  );
  const allowedCommits = new Set(
    [input.commit, ...(input.recentCommits || [])].filter(Boolean),
  );

  return {
    summary:
      boundedText(data.summary, 1_000, INSUFFICIENT_EVIDENCE) ||
      INSUFFICIENT_EVIDENCE,
    likelyRootCause:
      boundedText(data.likelyRootCause, 1_000, INSUFFICIENT_EVIDENCE) ||
      INSUFFICIENT_EVIDENCE,
    confidence: ["High", "Medium", "Low"].includes(String(data.confidence))
      ? (data.confidence as "High" | "Medium" | "Low")
      : "Low",
    evidence,
    affectedComponents: boundedStrings(data.affectedComponents, 20, 300),
    relatedCommits: boundedStrings(data.relatedCommits, 20, 100).filter(
      (item) => allowedCommits.has(item),
    ),
    relatedPullRequests: boundedStrings(
      data.relatedPullRequests,
      20,
      100,
    ).filter((item) => /^(PR\s*#?\d+|#\d+)$/i.test(item)),
    recommendedActions: boundedStrings(data.recommendedActions, 20, 500),
    uncertainty:
      boundedText(data.uncertainty, 1_000, INSUFFICIENT_EVIDENCE) ||
      INSUFFICIENT_EVIDENCE,
  };
}

export function getGeminiModelLadder(env: NodeJS.ProcessEnv = process.env) {
  const primary = env.GEMINI_MODEL || "gemini-2.5-flash";
  const fallback = env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash-lite";
  return [...new Set([primary, fallback].filter(Boolean))];
}

export function isGeminiFallbackEligible(error: unknown) {
  const status = Number(
    (error as { status?: number; statusCode?: number } | null)?.status ||
      (error as { statusCode?: number } | null)?.statusCode ||
      0,
  );
  if ([401, 403].includes(status)) return false;
  if ([404, 429, 500, 503].includes(status)) return true;
  const message = String((error as { message?: string } | null)?.message || "");
  return /model.*(not found|unavailable)|resource[_ ]exhausted|temporarily unavailable/i.test(
    message,
  );
}
