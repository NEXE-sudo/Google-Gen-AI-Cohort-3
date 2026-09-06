import {
  buildProjectDocument,
  normalizeProjectInput,
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
