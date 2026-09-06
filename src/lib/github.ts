export type GitHubRepositoryMeta = {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
};

export type GitHubRepositorySummary = {
  repository: GitHubRepositoryMeta;
  branches: Array<{ name: string; protected: boolean }>;
  recentCommits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  pullRequests: Array<{
    id: number;
    title: string;
    state: string;
    createdAt: string;
  }>;
  issues: Array<{
    id: number;
    title: string;
    state: string;
    createdAt: string;
  }>;
};

export type GitHubWorkflowRun = {
  id: number;
  name?: string;
  status?: string;
  conclusion: string | null;
  head_sha?: string;
  head_branch: string | null;
  run_started_at?: string;
  updated_at?: string;
  html_url?: string;
};

export type PersistedWorkflowRun = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string | null;
  commitSha: string;
  startedAt: string | null;
  updatedAt: string | null;
  url: string | null;
};

export function normalizeWorkflowRun(
  value: Record<string, unknown>,
): PersistedWorkflowRun | null {
  const id = Number(value.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return {
    id,
    name: typeof value.name === "string" ? value.name : "Unnamed workflow",
    status: typeof value.status === "string" ? value.status : "unknown",
    conclusion: typeof value.conclusion === "string" ? value.conclusion : null,
    branch:
      typeof value.head_branch === "string"
        ? value.head_branch
        : typeof value.branch === "string"
          ? value.branch
          : null,
    commitSha:
      typeof value.head_sha === "string"
        ? value.head_sha
        : typeof value.commitSha === "string"
          ? value.commitSha
          : "",
    startedAt:
      typeof value.run_started_at === "string"
        ? value.run_started_at
        : typeof value.startedAt === "string"
          ? value.startedAt
          : null,
    updatedAt:
      typeof value.updated_at === "string"
        ? value.updated_at
        : typeof value.updatedAt === "string"
          ? value.updatedAt
          : null,
    url:
      typeof value.html_url === "string"
        ? value.html_url
        : typeof value.url === "string"
          ? value.url
          : null,
  };
}

export type GitHubWorkflowJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
};

const GITHUB_TIMEOUT_MS = 15_000;
const MAX_JSON_BYTES = 1_000_000;
const MAX_COLLECTION_ITEMS = 100;

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = GITHUB_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readBoundedJson<T>(response: Response): Promise<T> {
  const text = await readBoundedText(response, MAX_JSON_BYTES);
  if (!text)
    throw new GitHubApiError(
      "GitHub returned an empty response.",
      response.status,
    );
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GitHubApiError(
      "GitHub returned malformed JSON.",
      response.status,
    );
  }
}

async function fetchGitHubJson<T>(url: string, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithTimeout(url, { headers: githubHeaders(token) });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GitHubApiError("GitHub request timed out.", 504);
    }
    throw new GitHubApiError("GitHub is unavailable.", 502);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new GitHubApiError("GitHub authentication failed.", 401);
    }
    if (response.status === 403) {
      throw new GitHubApiError(
        response.headers.get("x-ratelimit-remaining") === "0"
          ? "GitHub rate limit reached."
          : "GitHub permissions are insufficient.",
        403,
      );
    }
    if (response.status === 404) {
      throw new GitHubApiError(
        "GitHub repository or resource was not found.",
        404,
      );
    }
    throw new GitHubApiError(
      `GitHub request failed (${response.status}).`,
      response.status,
    );
  }

  return readBoundedJson<T>(response);
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function parseGitHubRepository(value: string) {
  const normalized = value
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/, "");
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(normalized);
  if (!match) throw new Error("Repository must use the owner/name format.");
  return { owner: match[1], repo: match[2] };
}

async function readBoundedText(response: Response, maxBytes: number) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const result = await reader.read();
    if (result.done) break;
    const remaining = maxBytes - total;
    const chunk =
      result.value.byteLength <= remaining
        ? result.value
        : result.value.slice(0, remaining);
    chunks.push(chunk);
    total += chunk.byteLength;
    if (chunk.byteLength < result.value.byteLength) {
      await reader.cancel();
      break;
    }
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
    "utf8",
  );
}

export async function fetchGitHubWorkflowRuns(
  token: string,
  owner: string,
  repo: string,
) {
  const payload = await fetchGitHubJson<{
    workflow_runs?: GitHubWorkflowRun[];
  }>(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=50`,
    token,
  );
  return (payload.workflow_runs || [])
    .slice(0, 50)
    .map((run) =>
      normalizeWorkflowRun(run as unknown as Record<string, unknown>),
    )
    .filter((run): run is PersistedWorkflowRun => run !== null);
}

export async function fetchGitHubWorkflowJobs(
  token: string,
  owner: string,
  repo: string,
  runId: number,
) {
  const payload = await fetchGitHubJson<{ jobs?: GitHubWorkflowJob[] }>(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/jobs?per_page=20`,
    token,
  );
  return (payload.jobs || []).slice(0, MAX_COLLECTION_ITEMS);
}

export async function fetchGitHubJobLogs(
  token: string,
  owner: string,
  repo: string,
  jobId: number,
  maxBytes = 100_000,
) {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/jobs/${jobId}/logs`,
      { headers: { ...githubHeaders(token), Accept: "text/plain" } },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new GitHubApiError("GitHub job log request timed out.", 504);
    }
    throw new GitHubApiError("GitHub job logs are unavailable.", 502);
  }
  if (!response.ok) {
    if (response.status === 404)
      throw new GitHubApiError("GitHub job logs were not found.", 404);
    throw new GitHubApiError(
      `GitHub job log request failed (${response.status}).`,
      response.status,
    );
  }
  return readBoundedText(response, Math.min(maxBytes, 100_000));
}

export async function fetchGitHubRepositorySummary(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubRepositorySummary> {
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const [repository, branches, commits, pullRequests, issues] =
    await Promise.all([
      fetchGitHubJson<GitHubRepositoryMeta>(baseUrl, token),
      fetchGitHubJson<Array<{ name: string; protected: boolean }>>(
        `${baseUrl}/branches?per_page=100`,
        token,
      ),
      fetchGitHubJson<
        Array<{
          sha: string;
          commit: { message: string; author: { name: string; date: string } };
          author?: { login: string };
        }>
      >(`${baseUrl}/commits?per_page=100`, token),
      fetchGitHubJson<
        Array<{ id: number; title: string; state: string; created_at: string }>
      >(`${baseUrl}/pulls?state=all&per_page=100`, token),
      fetchGitHubJson<
        Array<{ id: number; title: string; state: string; created_at: string }>
      >(`${baseUrl}/issues?state=all&per_page=100`, token),
    ]);

  return {
    repository,
    branches: branches.slice(0, MAX_COLLECTION_ITEMS).map((branch) => ({
      name: branch.name,
      protected: Boolean(branch.protected),
    })),
    recentCommits: commits.slice(0, 10).map((commit) => ({
      sha: commit.sha.slice(0, 8),
      message: commit.commit.message.split("\n")[0],
      author: commit.author?.login || commit.commit.author.name,
      date: commit.commit.author.date,
    })),
    pullRequests: pullRequests.slice(0, MAX_COLLECTION_ITEMS).map((pr) => ({
      id: pr.id,
      title: pr.title,
      state: pr.state,
      createdAt: pr.created_at,
    })),
    issues: issues.slice(0, MAX_COLLECTION_ITEMS).map((issue) => ({
      id: issue.id,
      title: issue.title,
      state: issue.state,
      createdAt: issue.created_at,
    })),
  };
}
