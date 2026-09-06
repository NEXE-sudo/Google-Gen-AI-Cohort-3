import { describe, expect, it } from "vitest";
import {
  canAccessProject,
  canManageProjectIntegration,
  resolveProjectRole,
  type ProjectMemberRole,
} from "./projects";

describe("project access model", () => {
  const project = {
    id: "proj_trace_demo",
    name: "Northstar Payments",
    ownerId: "alice",
    status: "Healthy",
    repository: "github.com/northstar/payments-service",
    members: [
      { uid: "alice", role: "owner" as ProjectMemberRole },
      { uid: "marcus", role: "member" as ProjectMemberRole },
      { uid: "priya", role: "viewer" as ProjectMemberRole },
    ],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-06T12:00:00.000Z",
  };

  it("resolves the correct role for owners and members", () => {
    expect(resolveProjectRole(project, "alice")).toBe("owner");
    expect(resolveProjectRole(project, "marcus")).toBe("member");
    expect(resolveProjectRole(project, "priya")).toBe("viewer");
    expect(resolveProjectRole(project, "unknown-user")).toBeNull();
  });

  it("allows read access for project members and rejects unauthorized updates", () => {
    expect(canAccessProject(project, "marcus", "read")).toBe(true);
    expect(canAccessProject(project, "priya", "create")).toBe(false);
    expect(canAccessProject(project, "unknown-user", "read")).toBe(false);
  });

  it("restricts GitHub integration management to owners and admins", () => {
    expect(canManageProjectIntegration(project, "alice")).toBe(true);
    expect(
      canManageProjectIntegration(
        {
          ...project,
          members: [...project.members, { uid: "admin", role: "admin" }],
        },
        "admin",
      ),
    ).toBe(true);
    expect(canManageProjectIntegration(project, "marcus")).toBe(false);
    expect(canManageProjectIntegration(project, "priya")).toBe(false);
  });
});
