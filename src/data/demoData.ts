import type { ProjectMemberRole } from "../lib/projects";

export type DemoTab =
  | "overview"
  | "projects"
  | "incidents"
  | "cicd"
  | "security"
  | "memory"
  | "assistant"
  | "settings";

export const demoProject: {
  id: string;
  name: string;
  ownerId: string;
  status: string;
  repository: string;
  branches: string[];
  members: Array<{ uid: string; role: ProjectMemberRole }>;
  createdAt: string;
  updatedAt: string;
} = {
  id: "proj_trace_demo",
  name: "Northstar Payments",
  ownerId: "alice",
  status: "Healthy but trending risky",
  repository: "github.com/northstar/payments-service",
  branches: ["main", "release-2026.09", "hotfix/auth-flow"],
  members: [
    { uid: "alice", role: "owner" },
    { uid: "marcus", role: "member" },
    { uid: "priya", role: "viewer" },
  ],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-06T14:20:00.000Z",
};

export const demoOverview = {
  activeIncidents: 2,
  failedWorkflows: 3,
  ciHealth: "84%",
  securityFindings: 4,
  recentActivity: [
    "Production deploy reached 99.94% success over 7 days",
    "Auth middleware change caused elevated 5xx errors",
    "GitHub issue #184 was escalated to security review",
  ],
};

export const demoProjects: Array<{
  id: string;
  name: string;
  ownerId: string;
  repository: string;
  status: string;
  members: Array<{ uid: string; role: ProjectMemberRole }>;
  createdAt: string;
  updatedAt: string;
}> = [
  {
    id: "proj_trace_demo",
    name: "Northstar Payments",
    ownerId: "alice",
    repository: "github.com/northstar/payments-service",
    status: "Monitoring",
    members: [
      { uid: "alice", role: "owner" },
      { uid: "marcus", role: "member" },
      { uid: "priya", role: "viewer" },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-06T14:20:00.000Z",
  },
  {
    id: "proj_console_demo",
    name: "Customer Console",
    ownerId: "web-team",
    repository: "github.com/northstar/console-web",
    status: "Healthy",
    members: [
      { uid: "web-team", role: "owner" },
      { uid: "marcus", role: "member" },
    ],
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-05T16:00:00.000Z",
  },
  {
    id: "proj_ai_ops_demo",
    name: "AI Operations",
    ownerId: "ml-team",
    repository: "github.com/northstar/ops-agent",
    status: "At risk",
    members: [
      { uid: "ml-team", role: "owner" },
      { uid: "priya", role: "member" },
    ],
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-06T09:00:00.000Z",
  },
];

export const demoIncidents = [
  {
    title: "Authentication context lost after middleware reorder",
    severity: "High",
    status: "Investigating",
    detectedAt: "2026-09-06T10:24:00.000Z",
    source: "CI workflow: payments-auth-integration",
    rootCause: "Middleware ordering changed before request context extraction.",
  },
  {
    title: "Payment retries inflated during peak traffic",
    severity: "Medium",
    status: "Mitigated",
    detectedAt: "2026-09-03T08:15:00.000Z",
    source: "GraphQL webhook failure",
    rootCause: "Retry budget and upstream timeout mismatch.",
  },
];

export const demoCICD = [
  {
    workflow: "payments-auth-integration",
    status: "Failed",
    branch: "main",
    duration: "11m 42s",
    commit: "d1c9f2a",
    timestamp: "2026-09-06T10:24:00.000Z",
  },
  {
    workflow: "payments-contract-tests",
    status: "Succeeded",
    branch: "release-2026.09",
    duration: "8m 21s",
    commit: "7be410d",
    timestamp: "2026-09-05T18:32:00.000Z",
  },
  {
    workflow: "gateway-security-scan",
    status: "Failed",
    branch: "hotfix/auth-flow",
    duration: "4m 50s",
    commit: "fe1124c",
    timestamp: "2026-09-06T09:48:00.000Z",
  },
];

export const demoSecurity = [
  {
    severity: "High",
    category: "Configuration",
    description:
      "JWT verification is configured without explicit issuer validation in the auth bridge.",
    evidence: "Gateway config and env sample show issuer check omitted.",
    resource: "auth-gateway.yaml",
    recommendation:
      "Add strict issuer and audience validation before accepting tokens.",
    status: "Open",
  },
  {
    severity: "Medium",
    category: "Dependency",
    description:
      "New transitive dependency introduced a broad logging surface.",
    evidence: "Package lock diff to jsonwebtoken-helper v2.4.0.",
    resource: "package-lock.json",
    recommendation: "Review and pin to a safer version or remove the package.",
    status: "Pending",
  },
];

export const demoMemory = [
  {
    problem: "Authentication middleware caused requests to lose user context.",
    rootCause: "Middleware ordering changed before request-context extraction.",
    resolution: "Moved auth middleware ahead of request-context extraction.",
    lesson:
      "Request-context extraction depends on authenticated middleware executing first.",
  },
  {
    problem:
      "Excessive retries amplified upstream latency during traffic spikes.",
    rootCause:
      "Retry budget matched percentiles rather than saturation thresholds.",
    resolution:
      "Capped retries and reduced concurrency for payment webhook workers.",
    lesson:
      "Burst traffic requires backpressure changes, not just more retries.",
  },
];

export const demoAssistantPromptSuggestions = [
  "Why did the latest build fail?",
  "What changed before this incident?",
  "Have we seen a similar issue?",
  "Which PR introduced this behaviour?",
  "What are the biggest current engineering risks?",
];

export const demoSettings = {
  mode: "Demo Project",
  dataSource: "Synthetic engineering telemetry",
  retention: "90 days",
  webhookStatus: "Configured",
};
