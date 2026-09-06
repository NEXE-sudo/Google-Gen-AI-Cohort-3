import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "./firebaseAdmin";
import {
  canAccessProject,
  canManageProjectIntegration,
  resolveProjectRole,
  type Project,
  type ProjectMemberRole,
  type ProjectPermission,
} from "../lib/projects";
import type { IncidentSeverity, IncidentStatus } from "../lib/projectStore";
import { parseGitHubRepository } from "../lib/github";
import { redactSecrets } from "../lib/security";

export interface PersistedIncident {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  summary: string;
  source: string;
  rootCause?: string;
  confidence?: "High" | "Medium" | "Low";
  evidence?: string[];
  affectedComponents?: string[];
  relatedCommits?: string[];
  relatedPullRequests?: string[];
  recommendedActions?: string[];
  actualResolution?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

function projectCollection() {
  return getFirebaseAdminDb().collection("projects");
}

function now() {
  return new Date().toISOString();
}

function asProject(id: string, data: FirebaseFirestore.DocumentData): Project {
  return {
    id,
    name: String(data.name || ""),
    ownerId: String(data.ownerId || ""),
    status: String(data.status || "Healthy"),
    repository: String(data.repository || ""),
    members: Object.entries(data.members || {}).map(([uid, value]) => ({
      uid,
      role: String(
        (value as { role?: string })?.role || "viewer",
      ) as ProjectMemberRole,
    })),
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
  };
}

export async function createProject(args: {
  name: string;
  repository: string;
  ownerId: string;
}) {
  const name = args.name.trim();
  let repository: string;
  try {
    const parsedRepository = parseGitHubRepository(args.repository);
    repository = `${parsedRepository.owner}/${parsedRepository.repo}`;
  } catch {
    throw new Error(
      "A valid GitHub repository in owner/name format is required.",
    );
  }
  if (!name || !repository)
    throw new Error("Project name and repository are required.");

  const timestamp = now();
  const reference = projectCollection().doc();
  const project = {
    id: reference.id,
    name,
    repository,
    status: "Healthy",
    ownerId: args.ownerId,
    memberUids: [args.ownerId],
    members: {
      [args.ownerId]: { role: "owner", createdAt: timestamp },
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await reference.set(project);
  await getFirebaseAdminDb().collection("users").doc(args.ownerId).set(
    {
      uid: args.ownerId,
      updatedAt: timestamp,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return project;
}

export async function listProjectsForUser(userId: string) {
  const snapshot = await projectCollection()
    .where("memberUids", "array-contains", userId)
    .limit(100)
    .get();
  return snapshot.docs.map((document) =>
    asProject(document.id, document.data()),
  );
}

export async function getProject(projectId: string) {
  const document = await projectCollection().doc(projectId).get();
  return document.exists ? asProject(document.id, document.data() || {}) : null;
}

export function projectHasPermission(
  project: Project,
  userId: string,
  permission: ProjectPermission,
) {
  return canAccessProject(project, userId, permission);
}

export function projectRole(project: Project, userId: string) {
  return resolveProjectRole(project, userId);
}

export async function createIncident(args: {
  projectId: string;
  actorId: string;
  title: string;
  severity: IncidentSeverity;
  summary: string;
  source: string;
  rootCause?: string;
  confidence?: "High" | "Medium" | "Low";
  evidence?: string[];
  affectedComponents?: string[];
  relatedCommits?: string[];
  relatedPullRequests?: string[];
  recommendedActions?: string[];
}) {
  const reference = projectCollection()
    .doc(args.projectId)
    .collection("incidents")
    .doc();
  const timestamp = now();
  const incident: PersistedIncident = {
    id: reference.id,
    projectId: args.projectId,
    ownerId: args.actorId,
    title: args.title.trim(),
    severity: args.severity,
    status: "Open",
    summary: args.summary.trim(),
    source: args.source.trim() || "manual",
    rootCause: args.rootCause?.trim() || undefined,
    confidence: args.confidence,
    evidence: args.evidence?.slice(0, 20),
    affectedComponents: args.affectedComponents?.slice(0, 20),
    relatedCommits: args.relatedCommits?.slice(0, 20),
    relatedPullRequests: args.relatedPullRequests?.slice(0, 20),
    recommendedActions: args.recommendedActions?.slice(0, 20),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (!incident.title || !incident.summary) {
    throw new Error("Incident title and summary are required.");
  }
  if (!["Low", "Medium", "High", "Critical"].includes(incident.severity)) {
    throw new Error("Incident severity is invalid.");
  }

  await reference.set(incident);
  return incident;
}

export async function listIncidents(projectId: string) {
  const snapshot = await projectCollection()
    .doc(projectId)
    .collection("incidents")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snapshot.docs.map((document) => document.data() as PersistedIncident);
}

export async function getIncident(projectId: string, incidentId: string) {
  const document = await projectCollection()
    .doc(projectId)
    .collection("incidents")
    .doc(incidentId)
    .get();
  return document.exists ? (document.data() as PersistedIncident) : null;
}

export async function updateIncident(args: {
  projectId: string;
  incidentId: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  title?: string;
  summary?: string;
  actualResolution?: string;
  resolvedBy?: string;
}) {
  const reference = projectCollection()
    .doc(args.projectId)
    .collection("incidents")
    .doc(args.incidentId);
  const existing = await reference.get();
  if (!existing.exists) return null;
  const current = existing.data() as PersistedIncident;
  const validStatuses: IncidentStatus[] = [
    "Open",
    "Investigating",
    "Mitigated",
    "Resolved",
  ];
  if (args.status && !validStatuses.includes(args.status)) {
    throw new Error("Incident status is invalid.");
  }
  if (
    args.severity &&
    !["Low", "Medium", "High", "Critical"].includes(args.severity)
  ) {
    throw new Error("Incident severity is invalid.");
  }
  const allowedTransitions: Record<IncidentStatus, IncidentStatus[]> = {
    Open: ["Open", "Investigating", "Mitigated", "Resolved"],
    Investigating: ["Investigating", "Mitigated", "Resolved"],
    Mitigated: ["Mitigated", "Investigating", "Resolved"],
    Resolved: ["Resolved", "Investigating"],
  };
  if (
    args.status &&
    !allowedTransitions[current.status].includes(args.status)
  ) {
    throw new Error("Incident status transition is invalid.");
  }

  const changes: Record<string, unknown> = { updatedAt: now() };
  if (args.status) changes.status = args.status;
  if (args.severity) changes.severity = args.severity;
  if (args.title) changes.title = args.title.trim();
  if (args.summary) changes.summary = args.summary.trim();
  if (args.actualResolution?.trim())
    changes.actualResolution = args.actualResolution.trim();
  if (args.status === "Resolved") {
    changes.resolvedAt = now();
    if (args.resolvedBy) changes.resolvedBy = args.resolvedBy;
  }
  await reference.update(changes);
  return {
    ...current,
    ...changes,
  } as PersistedIncident;
}

export async function listMemory(projectId: string) {
  const snapshot = await projectCollection()
    .doc(projectId)
    .collection("engineeringMemory")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snapshot.docs.map((document) => document.data());
}

export async function createMemoryFromIncident(incident: PersistedIncident) {
  const reference = projectCollection()
    .doc(incident.projectId)
    .collection("engineeringMemory")
    .doc(incident.id);
  const memory = {
    id: reference.id,
    projectId: incident.projectId,
    sourceIncidentId: incident.id,
    problem: incident.title,
    summary: incident.summary,
    rootCause: incident.rootCause || "Root cause not recorded.",
    confidence: incident.confidence || "Low",
    evidence: incident.evidence || [],
    resolution: incident.actualResolution || "Resolution not recorded.",
    prevention: incident.recommendedActions || [],
    createdAt: now(),
    updatedAt: now(),
  };
  await reference.set(memory, { merge: true });
  return memory;
}

export async function writeAuditLog(args: {
  projectId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  result: "success" | "failed";
  metadata?: Record<string, unknown>;
}) {
  const reference = projectCollection()
    .doc(args.projectId)
    .collection("auditLogs")
    .doc();
  const metadataText = redactSecrets(JSON.stringify(args.metadata || {}));
  const boundedMetadata: Record<string, unknown> =
    metadataText.length <= 4_000
      ? (JSON.parse(metadataText) as Record<string, unknown>)
      : { truncated: true, preview: metadataText.slice(0, 3_900) };
  await reference.set({
    id: reference.id,
    projectId: args.projectId,
    actorId: args.actorId,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    result: args.result,
    metadata: boundedMetadata,
    createdAt: now(),
  });
}

export async function deleteProjectForOwner(args: {
  projectId: string;
  actorId: string;
}) {
  const project = await getProject(args.projectId);
  if (!project) {
    throw Object.assign(new Error("Project not found."), { statusCode: 404 });
  }
  if (project.ownerId !== args.actorId) {
    throw Object.assign(new Error("Only the project owner may delete it."), {
      statusCode: 403,
    });
  }

  const projectReference = projectCollection().doc(args.projectId);

  const subcollections = [
    "incidents",
    "engineeringMemory",
    "auditLogs",
    "repositories",
    "workflowRuns",
  ];

  const referencesToDelete: FirebaseFirestore.DocumentReference[] = [
    projectReference,
  ];
  for (const collectionName of subcollections) {
    const snapshot = await projectReference.collection(collectionName).get();
    for (const document of snapshot.docs) {
      referencesToDelete.push(document.ref);
    }
  }

  const githubConnectionSnapshot = await getFirebaseAdminDb()
    .collection("githubConnections")
    .where("projectId", "==", args.projectId)
    .get();
  for (const document of githubConnectionSnapshot.docs) {
    referencesToDelete.push(document.ref);
  }

  const githubOAuthStateSnapshot = await getFirebaseAdminDb()
    .collection("githubOAuthStates")
    .where("projectId", "==", args.projectId)
    .get();
  for (const document of githubOAuthStateSnapshot.docs) {
    referencesToDelete.push(document.ref);
  }

  const db = getFirebaseAdminDb();
  for (let index = 0; index < referencesToDelete.length; index += 400) {
    const batch = db.batch();
    for (const reference of referencesToDelete.slice(index, index + 400)) {
      batch.delete(reference);
    }
    await batch.commit();
  }

  await db.collection("auditLogs").add({
    projectId: args.projectId,
    actorId: args.actorId,
    action: "PROJECT_DELETED",
    targetType: "project",
    targetId: args.projectId,
    result: "success",
    createdAt: now(),
  });

  return { success: true, projectId: args.projectId };
}

export async function saveRepositorySync(args: {
  projectId: string;
  repository: unknown;
  branches: unknown;
  recentCommits: unknown;
  pullRequests: unknown;
  issues: unknown;
  workflowRuns: Array<{ id: number; [key: string]: unknown }>;
}) {
  const projectReference = projectCollection().doc(args.projectId);
  const repositoryData = {
    repository: args.repository,
    branches: args.branches,
    recentCommits: args.recentCommits,
    pullRequests: args.pullRequests,
    issues: args.issues,
    syncedAt: now(),
  };
  await projectReference
    .collection("repositories")
    .doc(
      String(
        (args.repository as { full_name?: string })?.full_name || "repository",
      ).replace(/[\\/]/g, "_"),
    )
    .set(repositoryData);

  const batch = getFirebaseAdminDb().batch();
  for (const run of args.workflowRuns.slice(0, 20)) {
    batch.set(projectReference.collection("workflowRuns").doc(String(run.id)), {
      ...run,
      syncedAt: now(),
    });
  }
  await batch.commit();
}

export async function claimWebhookDelivery(args: {
  deliveryId: string;
  eventType: string;
  repository: string;
}) {
  const reference = getFirebaseAdminDb()
    .collection("webhookDeliveries")
    .doc(args.deliveryId);
  return getFirebaseAdminDb().runTransaction(async (transaction) => {
    const existing = await transaction.get(reference);
    if (existing.exists) return false;
    transaction.create(reference, {
      deliveryId: args.deliveryId,
      eventType: args.eventType,
      repository: args.repository,
      status: "accepted",
      receivedAt: now(),
    });
    return true;
  });
}

export async function updateWebhookDelivery(
  deliveryId: string,
  update: {
    status: "accepted" | "duplicate" | "rejected" | "failed";
    projectId?: string;
  },
) {
  await getFirebaseAdminDb()
    .collection("webhookDeliveries")
    .doc(deliveryId)
    .set({ ...update, updatedAt: now() }, { merge: true });
}

export async function findProjectByRepository(repository: string) {
  let canonicalRepository: string;
  try {
    const parsedRepository = parseGitHubRepository(repository);
    canonicalRepository =
      `${parsedRepository.owner}/${parsedRepository.repo}`.toLowerCase();
  } catch {
    return null;
  }

  const snapshot = await projectCollection().limit(100).get();
  const document = snapshot.docs.find((candidate) => {
    try {
      const parsedRepository = parseGitHubRepository(
        String(candidate.data().repository || ""),
      );
      return (
        `${parsedRepository.owner}/${parsedRepository.repo}`.toLowerCase() ===
        canonicalRepository
      );
    } catch {
      return false;
    }
  });
  return document ? asProject(document.id, document.data()) : null;
}

export async function saveWorkflowRunEvent(args: {
  projectId: string;
  run: Record<string, unknown>;
}) {
  const runId = String(args.run.id || "");
  if (!runId) throw new Error("Workflow event is missing an id.");
  await projectCollection()
    .doc(args.projectId)
    .collection("workflowRuns")
    .doc(runId)
    .set(
      { ...args.run, syncedAt: now(), source: "github-webhook" },
      { merge: true },
    );
}
