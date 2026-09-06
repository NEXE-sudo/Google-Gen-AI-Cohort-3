import {
  buildIncidentDocument,
  buildProjectDocument,
  normalizeProjectInput,
  type IncidentDraft,
  type ProjectDraft,
} from "./projectPersistence";
import { canAccessProject, type Project } from "./projects";

export type ProjectRecordLike = Pick<
  Project,
  | "id"
  | "name"
  | "ownerId"
  | "repository"
  | "status"
  | "members"
  | "createdAt"
  | "updatedAt"
>;

export interface ServiceIncidentRecord {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Investigating" | "Mitigated" | "Resolved";
  summary: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const inMemoryIncidentStore: ServiceIncidentRecord[] = [
  {
    id: "incident_seed_1",
    projectId: "proj_trace_demo",
    ownerId: "marcus",
    title: "Authentication context lost after middleware reorder",
    severity: "High",
    status: "Investigating",
    summary: "Middleware ordering changed before request context extraction.",
    source: "payments-auth-integration",
    createdAt: "2026-09-06T10:24:00.000Z",
    updatedAt: "2026-09-06T10:24:00.000Z",
  },
];

export function listVisibleProjectsForUser(
  projects: ProjectRecordLike[],
  userId: string | null | undefined,
): ProjectRecordLike[] {
  if (!userId) return [];
  return projects.filter((project) =>
    canAccessProject(project, userId, "read"),
  );
}

export function createProjectForUser(
  input: ProjectDraft,
  actorUserId: string | null | undefined,
): ProjectRecordLike | null {
  if (!actorUserId) return null;

  const normalized = normalizeProjectInput(input);
  if (!normalized.members.some((member) => member.uid === actorUserId)) {
    return null;
  }

  try {
    const projectDocument = buildProjectDocument(normalized, actorUserId);
    return {
      id: projectDocument.id,
      name: projectDocument.name,
      ownerId: projectDocument.ownerId,
      repository: projectDocument.repository,
      status: projectDocument.status,
      members: projectDocument.members,
      createdAt: projectDocument.createdAt,
      updatedAt: projectDocument.updatedAt,
    };
  } catch {
    return null;
  }
}

export function listProjectIncidentsForUser(
  project: ProjectRecordLike,
  userId: string | null | undefined,
): ServiceIncidentRecord[] {
  if (!userId || !canAccessProject(project, userId, "read")) {
    return [];
  }

  return inMemoryIncidentStore.filter(
    (incident) => incident.projectId === project.id,
  );
}

export function createProjectIncidentForUser(
  project: ProjectRecordLike,
  userId: string | null | undefined,
  input: IncidentDraft,
): ServiceIncidentRecord | null {
  if (!userId || !canAccessProject(project, userId, "create")) {
    return null;
  }

  const incident = buildIncidentDocument(project.id, userId, input);
  const record: ServiceIncidentRecord = {
    ...incident,
    severity: incident.severity,
  };

  inMemoryIncidentStore.push(record);
  return record;
}
