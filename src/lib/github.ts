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
  name: string;
  status: string;
  conclusion: string | null;
  head_sha: string;
  head_branch: string | null;
  run_started_at: string;
  updated_at: string;
  html_url: string;
};

export type GitHubWorkflowJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
};

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 15_000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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
  const response = await fetchWithTimeout(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs?per_page=20`,
    { headers: githubHeaders(token) },
  );
  if (!response.ok)
    throw new Error(`GitHub workflow retrieval failed (${response.status}).`);
  const payload = (await response.json()) as {
    workflow_runs?: GitHubWorkflowRun[];
  };
  return (payload.workflow_runs || []).slice(0, 20);
}

export async function fetchGitHubWorkflowJobs(
  token: string,
  owner: string,
  repo: string,
  runId: number,
) {
  const response = await fetchWithTimeout(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/runs/${runId}/jobs?per_page=20`,
    { headers: githubHeaders(token) },
  );
  if (!response.ok)
    throw new Error(
      `GitHub workflow jobs retrieval failed (${response.status}).`,
    );
  const payload = (await response.json()) as { jobs?: GitHubWorkflowJob[] };
  return (payload.jobs || []).slice(0, 20);
}

export async function fetchGitHubJobLogs(
  token: string,
  owner: string,
  repo: string,
  jobId: number,
  maxBytes = 100_000,
) {
  const response = await fetchWithTimeout(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/jobs/${jobId}/logs`,
    { headers: { ...githubHeaders(token), Accept: "text/plain" } },
  );
  if (!response.ok)
    throw new Error(`GitHub job log retrieval failed (${response.status}).`);
  return readBoundedText(response, Math.min(maxBytes, 100_000));
}

export async function fetchGitHubRepositorySummary(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubRepositorySummary> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const [repoRes, branchesRes, commitsRes, prsRes, issuesRes] =
    await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
        headers,
      }),
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`,
        { headers },
      ),
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=10`,
        { headers },
      ),
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=10`,
        { headers },
      ),
    ]);

  if (!repoRes.ok) {
    throw new Error("GitHub repository retrieval failed.");
  }

  const [repository, branches, commits, pullRequests, issues] =
    await Promise.all([
      repoRes.json() as Promise<GitHubRepositoryMeta>,
      branchesRes.ok
        ? (branchesRes.json() as Promise<
            Array<{ name: string; protected: boolean }>
          >)
        : Promise.resolve([]),
      commitsRes.ok
        ? (commitsRes.json() as Promise<
            Array<{
              sha: string;
              commit: {
                message: string;
                author: {
                  name: string;
                  date: string;
                };
              };
              author?: { login: string };
            }>
          >)
        : Promise.resolve([]),
      prsRes.ok
        ? (prsRes.json() as Promise<
            Array<{
              id: number;
              title: string;
              state: string;
              created_at: string;
            }>
          >)
        : Promise.resolve([]),
      issuesRes.ok
        ? (issuesRes.json() as Promise<
            Array<{
              id: number;
              title: string;
              state: string;
              created_at: string;
            }>
          >)
        : Promise.resolve([]),
    ]);

  return {
    repository,
    branches: branches.map((branch) => ({
      name: branch.name,
      protected: Boolean(branch.protected),
    })),
    recentCommits: commits.slice(0, 10).map((commit) => ({
      sha: commit.sha.slice(0, 8),
      message: commit.commit.message.split("\n")[0],
      author: commit.author?.login || commit.commit.author.name,
      date: commit.commit.author.date,
    })),
    pullRequests: pullRequests.map((pr) => ({
      id: pr.id,
      title: pr.title,
      state: pr.state,
      createdAt: pr.created_at,
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      state: issue.state,
      createdAt: issue.created_at,
    })),
  };
}
