import type { ProjectMemberRole } from "./projects";

export interface ProjectMemberDraft {
  uid: string;
  role: ProjectMemberRole;
}

export interface ProjectDraft {
  name: string;
  repository: string;
  status: string;
  ownerId: string;
  members: ProjectMemberDraft[];
}

export interface ProjectDocument extends ProjectDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  memberUids: string[];
}

export interface IncidentDraft {
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  summary: string;
  source: string;
}

export interface IncidentDocument extends IncidentDraft {
  id: string;
  projectId: string;
  ownerId: string;
  status: "Open" | "Investigating" | "Mitigated" | "Resolved";
  createdAt: string;
  updatedAt: string;
}

export function normalizeProjectInput(input: ProjectDraft): ProjectDraft {
  const normalizedMembers = (input.members || []).map((member) => ({
    uid: String(member.uid || "").trim(),
    role: member.role,
  }));

  const safeOwner = String(input.ownerId || "").trim();

  return {
    name: String(input.name || "").trim(),
    repository: String(input.repository || "").trim(),
    status: String(input.status || "Healthy").trim(),
    ownerId: safeOwner,
    members: normalizedMembers,
  };
}

export function buildProjectDocument(
  input: ProjectDraft,
  actorUserId: string,
): ProjectDocument {
  const normalized = normalizeProjectInput(input);

  if (!normalized.ownerId) {
    throw new Error("Project ownerId is required.");
  }

  if (normalized.ownerId !== actorUserId) {
    throw new Error("Only the project owner can set ownerId.");
  }

  const now = new Date().toISOString();
  const memberUids = normalized.members
    .map((member) => member.uid)
    .filter(Boolean);

  return {
    id: `project_${Date.now()}`,
    ...normalized,
    createdAt: now,
    updatedAt: now,
    memberUids,
  };
}

export function buildIncidentDocument(
  projectId: string,
  ownerId: string,
  input: IncidentDraft,
): IncidentDocument {
  const title = String(input.title || "").trim();
  const summary = String(input.summary || "").trim();

  if (!projectId || !ownerId) {
    throw new Error("projectId and ownerId are required.");
  }

  const now = new Date().toISOString();

  return {
    id: `incident_${Date.now()}`,
    projectId,
    ownerId,
    title,
    severity: input.severity,
    summary,
    source: String(input.source || "manual").trim(),
    status: "Open",
    createdAt: now,
    updatedAt: now,
  };
}
