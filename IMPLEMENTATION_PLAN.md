# Trace implementation plan

## Current repository status

The repository already contains a functional Trace prototype with:

- Firebase Authentication flow and a protected landing screen
- a Trace dashboard and demo-mode UI
- a Google Gemini proxy for legacy reflection use
- a basic security utility layer with prompt injection and secret redaction helpers
- demo engineering data and a Cloud Run-friendly Express server
- a first-pass Firestore rules baseline
- a basic test setup with security utility validation

The app is no longer the original journal starter, but it is still a vertical-slice prototype rather than a complete production Trace platform.

## Implemented in this repository

### Phase 1 — app refactor and product identity

- Trace branding and dashboard have been introduced in the UI.
- The app now presents a developer-focused product story rather than the personal journal experience.
- Firebase auth remains the authentication source.

### Phase 2 — demo product experience

- Demo-project dashboard data is available and clearly labelled as synthetic.
- Overview, incidents, CI/CD, security, memory, AI assistant, and settings screens are present in the UI.

### Phase 3 — backend safety scaffolding

- Cloud Run-compatible port handling is now enforced in the server.
- GitHub signature validation logic has been tightened to reject invalid/malformed signatures safely.
- Prompt injection checks exist as a first defensive layer.

### Phase 4 — analysis surface

- A real failure-analysis endpoint exists to return either Gemini-backed or deterministic demo results.
- The backend checks malformed inputs and returns structured results instead of hidden failures.

### Phase 5 — verification

- Type-checking, build validation, and test execution are active in the repo.

### Phase 6 — live persistence and authorization checkpoint

- Firebase Admin ID-token verification is enforced on protected live APIs.
- Projects, incidents, engineering memory, workflow records, audit logs, and webhook delivery claims persist in Firestore through server-only services.
- Project ownership and member roles are derived from verified identity and stored project state; client-supplied owner or actor identifiers are ignored.
- Firestore rules default deny and preserve project ownership and role constraints.

### Phase 7 — GitHub and live-mode checkpoint

- Project-scoped GitHub OAuth uses signed state and encrypted server-side token storage.
- Repository metadata, commits, pull requests, issues, workflow runs, and bounded job logs have server API boundaries.
- Webhook signatures are validated against the raw body and delivery claims are transactionally idempotent in Firestore.
- Live RCA and assistant paths fail explicitly when Gemini or project context is unavailable; demo fallback is gated by explicit demo mode.
- The existing dashboard now fetches live projects, incidents, memory, and workflow sync results instead of silently using demo data after sign-in.
- A Cloud Run Dockerfile and Secret Manager deployment references are present.

## Remaining work for a full production-quality Trace

1. Richer workflow/job correlation and persisted job metadata
2. Project-scoped member management UI and broader audit browsing
3. More complete security finding ingestion and repository scanning
4. Persistent assistant conversation history and richer memory retrieval
5. Firestore emulator integration tests and a live credentialed acceptance run

## Immediate implementation priority

1. Fix architecture/runtime issues and keep the app runnable.
2. Make Firebase auth + Firestore persistence real.
3. Make GitHub repository synchronisation real.
4. Make CI/CD data real.
5. Make Gemini root-cause analysis real.
6. Make incidents persistent and connected to analysis.
7. Make engineering memory persistent and searchable.
8. Implement RBAC and server-side authorisation.
9. Implement audit logging.
10. Implement security review.
11. Implement secure context-aware AI assistant.
12. Implement webhook ingestion and idempotency.
13. Expand tests.
14. Final README and security review.

## Current status summary

- Implemented foundation: Yes
- Demo product experience: Yes
- Real GitHub integration: Not yet complete
- Real Firestore project model: Not yet complete
- Real RBAC/audit enforcement: Not yet complete
- Real incident system: In progress
- Real AI analysis pipeline: Backed by a structured endpoint but still needs stronger validation and persisted context
- Production deploy readiness: Partial
