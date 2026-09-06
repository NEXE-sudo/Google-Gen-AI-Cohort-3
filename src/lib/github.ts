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
