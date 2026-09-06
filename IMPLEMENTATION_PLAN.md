# Trace implementation plan

## Phase 1 — refactor the starter app to Trace

- Replace the journal branding and landing experience with a developer-tool dashboard.
- Keep the existing Firebase auth foundation while renaming the product to Trace.
- Preserve working Gemini server proxy and Firestore helpers where they map to the new product.

## Phase 2 — dashboard, project model and Firestore schema

- Add a secure dashboard layout with overview, projects, incidents, CI/CD, security, memory, AI assistant, and settings views.
- Define core entities: projects, repositories, incidents, workflowRuns, securityFindings, engineeringMemory, and chatSessions.
- Document explicit ownership and membership fields so data is scoped by authenticated user identity.

## Phase 3 — GitHub repository connection and retrieval

- Add a GitHub service abstraction with repository metadata, branch, commit, PR, issue, and workflow retrieval boundaries.
- Keep the integration behind a server-side boundary and expose only approved data to the client.
- Add clear configuration and error handling for missing credentials or API failures.

## Phase 4 — CI/CD intelligence

- Build a workflow status view with failure analysis and Gemini review support.
- Add structured analysis outputs for summary, likely root cause, evidence, confidence, related commit/PR, fix, and next steps.

## Phase 5 — incidents and root-cause analysis

- Add incident creation and lifecycle management.
- Correlate commits, PRs, workflow failures, issues, and previous incidents into a structured investigation summary.

## Phase 6 — engineering memory

- Store resolved incident lessons in a searchable memory store.
- Allow server-side retrieval of relevant memory before AI responses.

## Phase 7 — AI Security Review

- Add security findings with severity, category, evidence, affected resource, recommendation, and status.
- Distinguish evidence from inference and avoid claiming the application is secure based on no findings.

## Phase 8 — RBAC and audit logging

- Enforce owner/admin/member/viewer permissions server-side and in Firestore rules.
- Record security-sensitive changes with actor, action, resource, timestamp, result, and metadata.

## Phase 9 — secure AI assistant

- Build a context-aware assistant that only uses selected project data retrieved server-side.
- Reject prompt injection attempts and keep user-supplied repo content untrusted.

## Phase 10 — demo mode

- Add a clearly marked synthetic data demo project that demonstrates incidents, CI/CD failures, memory, and AI analysis.

## Phase 11 — testing

- Add backend tests covering auth boundaries, Firestore access, RBAC, webhook validation, idempotency, malformed inputs, and Gemini error handling.

## Phase 12 — security review and Cloud Run polish

- Perform a final review of security assumptions, deployment requirements, and error handling.
- Prepare the app for Cloud Run with environment variable conventions and production-safe server setup.

## Phase 13 — final README and deployment docs

- Document product overview, architecture, local setup, Firebase rules, GitHub integration, Secret Manager, Cloud Run deployment, demo mode, and testing.
