# Trace

Trace is an AI-powered engineering intelligence platform that helps teams understand why software failed, not just that it failed. It correlates repository activity, CI/CD failures, incidents, security findings, and engineering memory into a structured investigation workflow powered by Gemini.

## Product overview

Trace gives developers a single place to:

- connect and inspect GitHub repositories
- review workflow health and failed CI runs
- create and investigate incidents
- surface likely root causes with evidence-backed AI analysis
- retain engineering memory from resolved incidents
- run a context-aware AI assistant grounded in a project's actual data
- track security risks and recommended remediation

The app is designed as a serious developer tool rather than a generic chatbot demo.

## Features

- Overview dashboard with operational health indicators
- Project and repository tracking
- Incident lifecycle management with statuses and severity
- CI/CD workflow review and failure analysis
- AI Security Review findings with evidence and recommendations
- Engineering memory search and reuse
- Context-aware AI assistant for project investigation
- Firebase Authentication and project-scoped data access
- Demo mode with deterministic synthetic data

## Architecture

- Client: React + TypeScript + Vite
- Backend: Express server for API boundaries and Cloud Run compatibility
- Authentication: Firebase Authentication
- Database: Firestore with explicit ownership and membership data
- AI: Gemini models accessed through a server-side service boundary
- Secret handling: environment variables and Secret Manager where available
- Deployment: compatible with Google Cloud Run

## Technology stack

- React 19
- TypeScript
- Vite
- Express
- Firebase Authentication
- Firestore
- Google GenAI SDK
- Tailwind CSS
- Lucide icons

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the example env file if needed:
   ```bash
   cp .env.example .env
   ```
3. Start the app in development mode:
   ```bash
   npm run dev
   ```
4. Open the local app in the browser.

## Environment variables

Required variables for the current project:

```bash
GEMINI_API_KEY=
NODE_ENV=development
PORT=3000
```

For a production deployment, store sensitive values in Cloud Secret Manager or environment variables provided by the runtime.

## Firebase configuration

The app expects Firebase configuration to be available in `firebase-applet-config.json` or the equivalent environment-backed config. The app must not expose service-account credentials to the browser.

## Firestore schema

A sensible Trace schema includes:

- `users/{userId}`
- `projects/{projectId}`
- `projects/{projectId}/repositories/{repositoryId}`
- `projects/{projectId}/commits/{commitId}`
- `projects/{projectId}/pullRequests/{prId}`
- `projects/{projectId}/workflowRuns/{runId}`
- `projects/{projectId}/incidents/{incidentId}`
- `projects/{projectId}/incidentEvents/{eventId}`
- `projects/{projectId}/securityFindings/{findingId}`
- `projects/{projectId}/engineeringMemory/{memoryId}`
- `chatSessions/{sessionId}`
- `notifications/{notificationId}`
- `auditLogs/{auditId}`

The live server currently writes project data to these project-scoped paths:

- `projects/{projectId}` with `ownerId`, `memberUids`, and a role-bearing `members` map
- `projects/{projectId}/incidents/{incidentId}`
- `projects/{projectId}/engineeringMemory/{memoryId}`
- `projects/{projectId}/repositories/{repositoryId}`
- `projects/{projectId}/workflowRuns/{runId}`
- `projects/{projectId}/auditLogs/{auditId}`
- `githubConnections/{projectId}` with an encrypted GitHub token, readable only by the Admin SDK
- `webhookDeliveries/{deliveryId}` for transactional webhook idempotency

Each resource should include explicit ownership or membership metadata such as `ownerId`, `members`, `createdAt`, and `updatedAt`.

## Firestore security rules

Rules should default deny and restrict reads or writes to authenticated users with project ownership or membership. The repository includes a restrictive baseline in `firestore.rules` to enforce this model.

## GitHub integration setup

- Configure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_STATE_SECRET`, and `GITHUB_TOKEN_ENCRYPTION_KEY`.
- A project owner or admin starts OAuth from the project view; the callback exchanges the code server-side.
- GitHub access tokens are AES-GCM encrypted before storage and never returned to the browser.
- Repository sync persists bounded metadata, recent commits/PRs/issues, and up to 20 workflow runs.
- Job log reads are timeout-limited and capped at 100,000 bytes.
- Configure the webhook URL as `/api/github/webhook` with `GITHUB_WEBHOOK_SECRET`.

## Secret Manager setup

For production deployment, store credentials such as Gemini API keys or GitHub tokens in Secret Manager and mount them as runtime environment variables to the Cloud Run service.

Example:

```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

## Gemini configuration

- Use a backend-only AI service layer.
- Validate requests and model output before persistence.
- Keep prompts bounded and external content treated as untrusted.
- Prefer structured JSON outputs where practical.
- Fail gracefully when Gemini is unavailable or returns malformed content.

## Cloud Run deployment

Deploy with the service listening on the Cloud Run-provided `PORT`, and do not rely on local filesystem storage for application state.

Example pattern:

```bash
gcloud run deploy trace \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

## Security model

Trace follows a security-first lifecycle:

- default deny for database access
- authenticated user identity derived from Firebase session
- server-side permission checks before any action
- explicit confirmation before consequential write operations
- audit logging for sensitive actions
- no fabrication of external data or security claims

## Threat model

Primary threats include:

- prompt injection inside repository text or CI logs
- unauthorised project access from user-controlled client state
- excessive AI trust in model-generated output
- secret leakage through frontend code or logs
- duplicate webhook ingestion creating duplicate incidents

## Prompt-injection defence

Repository content, issue descriptions, PR comments, commit messages, and logs are treated as untrusted input. The model should never be allowed to override system instructions or security boundaries based on external content.

## RBAC model

The target permission model is:

- Owner: full project access and member management
- Admin: manage project and integrations
- Member: analyse repo, create/update incidents, use AI assistant
- Viewer: read-only access

These rules must be enforced server-side and in Firestore security rules; UI hiding alone is insufficient.

## Testing

The project should include backend tests for:

- authentication boundaries
- Firestore access control
- RBAC
- GitHub webhook signature validation
- webhook idempotency
- malformed GitHub data
- Gemini failure
- malformed Gemini response
- prompt injection attempts
- unauthorised actions
- incident creation and resolution
- audit logging

## Demo mode

Trace includes a clearly marked demo mode with synthetic data that demonstrates a repository, recent commits, a pull request, a failed CI workflow, an incident, Gemini-based root-cause analysis, a security finding, and engineering memory.

The demo should always be visibly labelled as synthetic to avoid fake integration claims.

## Known limitations

- A real Firebase project, Admin credentials or Cloud Run ADC, GitHub OAuth app, webhook secret, and Gemini key are required to exercise live integrations.
- Workflow and job records are ingested, but richer cross-run correlation and security scanning remain limited.
- External data sources may be incomplete, and AI findings should be treated as evidence-backed but not definitive.

## Remaining improvements

- richer workflow log analysis and commit correlation
- project-scoped RBAC management UI
- persistent chat history and deeper incident-driven memory retrieval
- deeper security scanning and repository risk scoring

## AI Studio usage

AI Studio was used during development to help validate the project direction, maintain security-first custom instructions, and ensure changes aligned with the requirements for prompt-injection defense, least privilege, and explicit confirmation before consequential writes.

The repository includes the project custom instruction files to keep future AI-assisted development aligned with the Trace security model.
