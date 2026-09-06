# Gemini Journal & Reflections

A production-grade, full-stack user-authenticated web application integrating Google Gemini 3.6 Flash and Cloud Firestore with owner-bound security rules. This application enables individuals to maintain private multi-turn journal entries and reflections, consult Gemini for empathetic reframing, brainstorm ideas, and generate executive summaries.

---

## 1. System Architecture & Tech Stack

| Layer | Technology | Operational Responsibility |
| :--- | :--- | :--- |
| **Client UI** | React 19 + Tailwind CSS + Lucide Icons | Responsive single-page interface with multi-turn reflection stream, category selectors, and real-time Firestore listeners. |
| **Authentication** | Firebase Authentication | Federated Google Sign-In with popup provider flow; zero plain-text password storage. |
| **Backend Service** | Node.js + Express + TypeScript (`server.ts`) | Server-side API proxy routing Gemini requests, defensive payload sanitization, and fallback orchestration. |
| **AI Engine** | Gemini 3.6 Flash (`@google/genai`) | Multi-turn reflection synthesis with automated fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`). |
| **Database** | Cloud Firestore | User-isolated document storage under `/users/{userId}/reflections/{reflectionId}` protected by hardened security rules. |
| **Secret Management** | Google Cloud Secret Manager / Env Vars | Secure storage and access of `GEMINI_API_KEY` and Firebase credentials with zero hardcoded secrets. |

---

## 2. Agentic Threat Modeling (OWASP & LLM Top 10)

| Threat Zone | Identified Attack Vector | Production Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malicious prompt tampering, payload flood | Strict schema validation, 8,000 character buffer bounds, and payload undefined-stripping prior to storage. |
| **2. Planning & Reasoning** | System instruction bypass, jailbreak attempts | Hardened system prompts enforcing reflection mentor persona; contextual data sandboxing. |
| **3. Tool Execution** | Model outage (503/429), API key leakage | Server-side API proxy (zero client key exposure); 4-tier model fallback ladder recovering transient failures. |
| **4. Memory & State** | Cross-tenant reflection tampering, horizontal privilege escalation | Cloud Firestore owner-bound security rules (`request.auth.uid == userId`) with default-deny fallback. |
| **5. Inter-System Comm** | Man-in-the-middle token interception, secret leakage | Google OAuth token verification, HTTPS communication, dynamic Secret Manager runtime injection. |

---

## 3. Database Security Configuration (`firestore.rules`)

Owner-bound data isolation ensures users can only read, create, update, or delete their own reflections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zero Insecure Defaults: Default-deny catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    // Connection test document
    match /test/connection {
      allow read: if request.auth != null;
    }

    // User profile document isolated to the authenticated user
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User-isolated reflections collection: only the owner can read or write
    match /users/{userId}/reflections/{reflectionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 4. Secret Management & Cloud Setup

### Prerequisites
1. Install the Google Cloud SDK (`gcloud`) and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
2. Enable required Google Cloud APIs:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com
   ```

### Secret Manager Configuration
Store the Gemini API Key in Secret Manager and grant the Cloud Run default service account permission to read it:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the Cloud Run compute service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Google Cloud Run Deployment & Campaign Verification

### Deploying the Application
Deploy directly using Cloud Run container build:

```bash
gcloud run deploy gemini-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production"
```

### Mandatory Campaign Labeling
To register the service for automated challenge verification, apply the mandatory label:

```bash
gcloud run services update gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Stability & Walkthrough Verification

Every user process and interactive surface has a corresponding structured test scenario:

### Test Case 1: Landing & Authentication Flow
- **Precondition**: User is logged out.
- **Action**: Visit `/`. Click `Sign in with Google` (`#google-signin-btn`).
- **Expected Outcome**:
  1. Google Authentication popup displays.
  2. Upon approving permissions, user token is acquired.
  3. UI transitions from `<LandingView />` to the private `<Dashboard />`.
  4. User name, avatar, and email are rendered in the top navbar.

### Test Case 2: Multi-Turn Journaling & Conversational Reflection
- **Precondition**: Authenticated on the dashboard.
- **Action**:
  1. Type a reflection into the textarea (`#reflection-input`): *"I had an overwhelming week managing multiple deliverables and struggled to prioritize."*
  2. Ensure `Reflect & Inquire` mode is highlighted (`#mode-converse-btn`).
  3. Click `Send` (`#send-reflection-btn`) or press `Cmd+Enter`.
- **Expected Outcome**:
  1. User message appears immediately in the conversation thread.
  2. Gemini thinking indicator renders while querying `gemini-3.6-flash`.
  3. Gemini response generates with empathetic reframing and guiding questions.
  4. "Saved in Firestore" status indicator confirms write completeness.

### Test Case 3: Brainstorming Ideas
- **Precondition**: Inside an active reflection session.
- **Action**:
  1. Click `Brainstorm Ideas` (`#mode-brainstorm-btn`).
  2. Input: *"What are 3 practical frameworks I can use to organize my daily backlog?"*
  3. Click `Send`.
- **Expected Outcome**:
  1. Gemini server handler routes prompt with brainstorming instructions.
  2. Gemini produces structured bullet points and practical actionable steps.
  3. Firestore updates session messages atomically with undefined-stripping.

### Test Case 4: Generating Executive Summary & Key Takeaways
- **Precondition**: Multi-turn dialogue contains at least 2 entries.
- **Action**:
  1. Click `Executive Summary` (`#mode-summarize-btn`).
  2. Click `Send`.
- **Expected Outcome**:
  1. Server prompts Gemini to synthesize the entire conversation into core themes.
  2. AI Summary Card expands with Core Theme, Key Realizations, and Actionable Takeaways.
  3. `session.summary` field is updated in Firestore and reflected in the history card snippet.

### Test Case 5: History Navigation & Categorization
- **Precondition**: User has 2 or more saved reflections.
- **Action**:
  1. Click `+ New Reflection` (`#new-reflection-btn`) to start a fresh thread.
  2. Change category dropdown from `Reflection` to `Gratitude`.
  3. In the sidebar filter, click `Gratitude`.
- **Expected Outcome**:
  1. The new reflection is created with unique ID in `/users/{userId}/reflections/{id}`.
  2. History list filters down to only show matching category cards.
  3. Selecting a past session re-populates the workspace with the complete message history.

### Test Case 6: Cross-User Isolation Enforcement
- **Precondition**: Two distinct Google user accounts (User A and User B).
- **Action**: User A creates three private reflection documents. User B signs in.
- **Expected Outcome**:
  1. User B's dashboard only queries `/users/{UserB_UID}/reflections`.
  2. User B cannot see any of User A's reflections.
  3. Any direct attempt to query `/users/{UserA_UID}/reflections` triggers a `PERMISSION_DENIED` rejection per `firestore.rules`.
