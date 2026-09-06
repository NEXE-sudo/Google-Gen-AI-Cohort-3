import { describe, expect, it } from "vitest";
import {
  getGeminiModelLadder,
  INSUFFICIENT_EVIDENCE,
  isGeminiFallbackEligible,
  RCA_RESPONSE_SCHEMA,
  validateFailureAnalysis,
} from "./geminiRca";

describe("Gemini RCA contract", () => {
  const input = {
    logs: "TypeError: request context missing",
    commit: "abc1234",
    recentCommits: ["def5678"],
  };

  it("defines an exact structured JSON response schema", () => {
    expect(RCA_RESPONSE_SCHEMA.additionalProperties).toBe(false);
    expect(Object.keys(RCA_RESPONSE_SCHEMA.properties)).toEqual([
      "summary",
      "likelyRootCause",
      "confidence",
      "evidence",
      "affectedComponents",
      "relatedCommits",
      "relatedPullRequests",
      "recommendedActions",
      "uncertainty",
    ]);
  });

  it("accepts valid output and filters invented evidence and commits", () => {
    const result = validateFailureAnalysis(
      {
        summary: "The request context is missing.",
        likelyRootCause: "Middleware order changed.",
        confidence: "High",
        evidence: ["TypeError: request context missing", "invented log line"],
        affectedComponents: ["auth middleware"],
        relatedCommits: ["abc1234", "invented999"],
        relatedPullRequests: ["PR #42", "not a PR"],
        recommendedActions: ["Restore middleware ordering."],
        uncertainty: "The exact change is not confirmed.",
      },
      input,
    );

    expect(result.evidence).toEqual(["TypeError: request context missing"]);
    expect(result.relatedCommits).toEqual(["abc1234"]);
    expect(result.relatedPullRequests).toEqual(["PR #42"]);
  });

  it("handles malformed, missing, and invalid fields safely", () => {
    expect(() => validateFailureAnalysis(null, input)).toThrow("Malformed");
    const result = validateFailureAnalysis({ confidence: "Certain" }, input);
    expect(result.confidence).toBe("Low");
    expect(result.summary).toBe(INSUFFICIENT_EVIDENCE);
  });

  it("bounds oversized strings and arrays", () => {
    const result = validateFailureAnalysis(
      {
        summary: "x".repeat(10_000),
        likelyRootCause: "y".repeat(10_000),
        confidence: "Medium",
        evidence: Array.from(
          { length: 50 },
          () => "TypeError: request context missing",
        ),
        affectedComponents: Array.from({ length: 50 }, () => "component"),
        relatedCommits: Array.from({ length: 50 }, () => "abc1234"),
        relatedPullRequests: Array.from({ length: 50 }, () => "PR #1"),
        recommendedActions: Array.from({ length: 50 }, () => "action"),
        uncertainty: "z".repeat(10_000),
      },
      input,
    );
    expect(result.summary.length).toBeLessThanOrEqual(1_000);
    expect(result.evidence).toHaveLength(20);
    expect(result.recommendedActions).toHaveLength(20);
  });

  it("uses configured models and only falls back for appropriate failures", () => {
    expect(
      getGeminiModelLadder({
        GEMINI_MODEL: "primary",
        GEMINI_FALLBACK_MODEL: "backup",
      }),
    ).toEqual(["primary", "backup"]);
    expect(isGeminiFallbackEligible({ status: 404 })).toBe(true);
    expect(isGeminiFallbackEligible({ status: 429 })).toBe(true);
    expect(isGeminiFallbackEligible({ status: 401 })).toBe(false);
    expect(isGeminiFallbackEligible({ status: 400 })).toBe(false);
  });
});
