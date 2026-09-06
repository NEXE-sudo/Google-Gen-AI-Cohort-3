import { describe, expect, it } from "vitest";
import {
  canAccessProject,
  canManageProjectIntegration,
  resolveProjectRole,
  type ProjectMemberRole,
} from "./projects";
import {
  readSelectedProjectId,
  resolveSelectedProjectId,
  writeSelectedProjectId,
} from "./projectSelection";

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

  it("allows deletion only for the project owner", () => {
    expect(canAccessProject(project, "alice", "delete")).toBe(true);
    expect(canAccessProject(project, "marcus", "delete")).toBe(false);
    expect(canAccessProject(project, "priya", "delete")).toBe(false);
  });

  it("selects the first project when there is no valid persisted selection", () => {
    const projects = [
      { id: "proj_a", name: "A" },
      { id: "proj_b", name: "B" },
    ] as any[];

    expect(resolveSelectedProjectId(projects, "proj_b")).toBe("proj_b");
    expect(resolveSelectedProjectId(projects, "missing")).toBe("proj_a");
    expect(resolveSelectedProjectId(projects, null)).toBe("proj_a");
    expect(resolveSelectedProjectId([], "proj_a")).toBeNull();
  });

  it("preserves project-scoped data while switching and refreshing selection", () => {
    const projects = [{ id: "proj_a" }, { id: "proj_b" }];
    const projectData = new Map([
      [
        "proj_a",
        {
          incidents: ["incident-a"],
          memory: ["memory-a"],
          workflowRuns: ["run-a"],
        },
      ],
      [
        "proj_b",
        {
          incidents: ["incident-b"],
          memory: ["memory-b"],
          workflowRuns: ["run-b"],
        },
      ],
    ]);

    const selectedAfterSwitch = resolveSelectedProjectId(projects, "proj_b");
    const selectedAfterRefresh = resolveSelectedProjectId(
      projects,
      selectedAfterSwitch,
    );

    expect(selectedAfterSwitch).toBe("proj_b");
    expect(projectData.get(selectedAfterSwitch)?.incidents).toEqual([
      "incident-b",
    ]);
    expect(projectData.get(selectedAfterSwitch)?.memory).toEqual(["memory-b"]);
    expect(projectData.get(selectedAfterSwitch)?.workflowRuns).toEqual([
      "run-b",
    ]);
    expect(projectData.get("proj_a")).toEqual({
      incidents: ["incident-a"],
      memory: ["memory-a"],
      workflowRuns: ["run-a"],
    });
    expect(selectedAfterRefresh).toBe("proj_b");
  });

  it("selects another project after deletion and clears the final selection", () => {
    const projects = [{ id: "proj_a" }, { id: "proj_b" }];
    const remainingProjects = projects.filter(
      (project) => project.id !== "proj_b",
    );

    expect(resolveSelectedProjectId(remainingProjects, null)).toBe("proj_a");
    expect(resolveSelectedProjectId([], null)).toBeNull();
  });

  it("persists and reads selected project IDs with a namespaced localStorage key", () => {
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    } as Storage;

    writeSelectedProjectId("proj_b", fakeStorage);
    expect(readSelectedProjectId(fakeStorage)).toBe("proj_b");
    writeSelectedProjectId(null, fakeStorage);
    expect(readSelectedProjectId(fakeStorage)).toBeNull();
  });
});
