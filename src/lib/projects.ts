export type ProjectMemberRole = "owner" | "admin" | "member" | "viewer";

export type ProjectPermission = "read" | "create" | "update" | "delete";

export interface ProjectMember {
  uid: string;
  role: ProjectMemberRole;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  status: string;
  repository: string;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export function resolveProjectRole(
  project: Pick<Project, "ownerId" | "members">,
  userId: string | null | undefined,
): ProjectMemberRole | null {
  if (!userId) return null;

  if (project.ownerId === userId) return "owner";

  const membership = project.members.find((member) => member.uid === userId);
  return membership ? membership.role : null;
}

export function canAccessProject(
  project: Pick<Project, "ownerId" | "members">,
  userId: string | null | undefined,
  action: ProjectPermission,
): boolean {
  const role = resolveProjectRole(project, userId);
  if (!role) return false;

  const permissions: Record<ProjectMemberRole, ProjectPermission[]> = {
    owner: ["read", "create", "update", "delete"],
    admin: ["read", "create", "update"],
    member: ["read", "create", "update"],
    viewer: ["read"],
  };

  return (permissions[role] ?? []).includes(action);
}

export function canManageProjectIntegration(
  project: Pick<Project, "ownerId" | "members">,
  userId: string | null | undefined,
) {
  return ["owner", "admin"].includes(resolveProjectRole(project, userId) || "");
}
