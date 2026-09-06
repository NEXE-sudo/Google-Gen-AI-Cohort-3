import {
  canAccessProject,
  resolveProjectRole,
  type Project,
  type ProjectMemberRole,
  type ProjectPermission,
} from "./projects";

export type IncidentSeverity = "Low" | "Medium" | "High" | "Critical";
export type IncidentStatus =
  | "Open"
  | "Investigating"
  | "Mitigated"
  | "Resolved";

export interface ProjectRecord extends Project {}

export interface IncidentInput {
  title: string;
  severity: IncidentSeverity;
  summary: string;
  source: string;
}

export interface IncidentRecord {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  summary: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export function listVisibleProjects(
  projects: ProjectRecord[],
  userId: string | null | undefined,
): ProjectRecord[] {
  if (!userId) return [];

  return projects.filter((project) =>
    canAccessProject(project, userId, "read"),
  );
}

export function createIncident(
  project: ProjectRecord,
  userId: string | null | undefined,
  input: IncidentInput,
): IncidentRecord | null {
  if (!userId || !canAccessProject(project, userId, "create")) {
    return null;
  }

  const role = resolveProjectRole(project, userId);
  if (!role) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: `incident_${Date.now()}`,
    projectId: project.id,
    ownerId: userId,
    title: input.title,
    severity: input.severity,
    status: "Open",
    summary: input.summary,
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
}
