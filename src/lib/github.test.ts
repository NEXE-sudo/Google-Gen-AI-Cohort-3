import { describe, expect, it } from "vitest";
import {
  encryptGitHubToken,
  decryptGitHubToken,
  createGitHubOAuthState,
  verifyGitHubOAuthState,
} from "../server/githubConnections";
import { parseGitHubRepository } from "./github";

describe("GitHub integration boundaries", () => {
  it("accepts owner/name repository identifiers and rejects arbitrary URLs", () => {
    expect(
      parseGitHubRepository("https://github.com/acme/payments.git"),
    ).toEqual({
      owner: "acme",
      repo: "payments",
    });
    expect(() =>
      parseGitHubRepository("https://example.com/acme/payments"),
    ).toThrow();
    expect(() => parseGitHubRepository("acme")).toThrow();
  });

  it("round-trips encrypted GitHub tokens without exposing plaintext", () => {
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "test-encryption-key";
    const encrypted = encryptGitHubToken("ghp_test_token");
    expect(encrypted.ciphertext).not.toContain("ghp_test_token");
    expect(decryptGitHubToken(encrypted)).toBe("ghp_test_token");
  });

  it("rejects tampered OAuth state", () => {
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-state-secret";
    const state = createGitHubOAuthState({
      projectId: "project-1",
      uid: "user-1",
    });
    expect(verifyGitHubOAuthState(state)).toMatchObject({
      projectId: "project-1",
      uid: "user-1",
    });
    expect(() => verifyGitHubOAuthState(`${state}tampered`)).toThrow();
  });
});
