import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encryptGitHubToken,
  decryptGitHubToken,
  createGitHubOAuthState,
  verifyGitHubOAuthState,
} from "../server/githubConnections";
import {
  fetchGitHubWorkflowJobs,
  normalizeWorkflowJob,
  normalizeWorkflowRun,
  parseGitHubRepository,
} from "./github";

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("normalizes workflow runs with stable IDs and no token data", () => {
    const normalized = normalizeWorkflowRun({
      id: 42,
      name: "build",
      status: "completed",
      conclusion: "success",
      head_branch: "main",
      head_sha: "abcdef123456",
      run_started_at: "2026-09-06T10:00:00.000Z",
      updated_at: "2026-09-06T10:05:00.000Z",
      html_url: "https://github.com/acme/app/actions/runs/42",
      access_token: "must-not-be-stored",
    });
    expect(normalized).toEqual({
      id: 42,
      name: "build",
      status: "completed",
      conclusion: "success",
      branch: "main",
      commitSha: "abcdef123456",
      startedAt: "2026-09-06T10:00:00.000Z",
      updatedAt: "2026-09-06T10:05:00.000Z",
      url: "https://github.com/acme/app/actions/runs/42",
    });
    expect(normalized).not.toHaveProperty("completedAt");
    expect(normalizeWorkflowRun({ id: "not-a-run" })).toBeNull();
  });

  it("reads and normalizes the GitHub workflow jobs wrapper without dropping failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          jobs: [
            {
              id: 123,
              name: "Trace CI",
              status: "completed",
              conclusion: "failure",
              started_at: "2026-09-06T10:00:00.000Z",
              completed_at: "2026-09-06T10:01:00.000Z",
              html_url: "https://github.com/acme/app/actions/runs/1/job/123",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    await expect(
      fetchGitHubWorkflowJobs("server-token", "acme", "app", 1),
    ).resolves.toEqual([
      {
        id: 123,
        name: "Trace CI",
        status: "completed",
        conclusion: "failure",
        startedAt: "2026-09-06T10:00:00.000Z",
        completedAt: "2026-09-06T10:01:00.000Z",
        url: "https://github.com/acme/app/actions/runs/1/job/123",
      },
    ]);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/app/actions/runs/1/jobs?per_page=20",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer server-token",
        }),
      }),
    );
  });

  it("rejects malformed jobs and preserves supported failure conclusions", () => {
    expect(
      normalizeWorkflowJob({
        id: 123,
        name: "Trace CI",
        status: "completed",
        conclusion: "failure",
        started_at: "2026-09-06T10:00:00.000Z",
        completed_at: "2026-09-06T10:01:00.000Z",
        html_url: "https://github.com/example/job/123",
      }),
    ).toMatchObject({ id: 123, conclusion: "failure" });
    expect(normalizeWorkflowJob({ id: "invalid" })).toBeNull();
  });

  it("retrieves job logs with GitHub's supported media type", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Run tests failed", { status: 200 }),
    );

    const { fetchGitHubJobLogs } = await import("./github");
    await expect(
      fetchGitHubJobLogs("server-token", "acme", "app", 123),
    ).resolves.toBe("Run tests failed");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/app/actions/jobs/123/logs",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer server-token",
          Accept: "application/vnd.github+json",
        }),
      }),
    );
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

  it("binds OAuth state to a random nonce and rejects modified payloads", () => {
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-state-secret";
    const first = createGitHubOAuthState({
      projectId: "project-1",
      uid: "user-1",
    });
    const second = createGitHubOAuthState({
      projectId: "project-1",
      uid: "user-1",
    });
    const firstData = verifyGitHubOAuthState(first);
    const secondData = verifyGitHubOAuthState(second);
    expect(firstData.nonce).toMatch(/^[a-f0-9]{64}$/);
    expect(secondData.nonce).not.toBe(firstData.nonce);
    const [payload, signature] = first.split(".");
    const alteredPayload = Buffer.from(
      JSON.stringify({ ...firstData, projectId: "project-2" }),
    ).toString("base64url");
    expect(() =>
      verifyGitHubOAuthState(`${alteredPayload}.${signature}`),
    ).toThrow();
    const alteredUserPayload = Buffer.from(
      JSON.stringify({ ...firstData, uid: "user-2" }),
    ).toString("base64url");
    expect(() =>
      verifyGitHubOAuthState(`${alteredUserPayload}.${signature}`),
    ).toThrow();
    expect(payload).toBeTruthy();
  });
});
