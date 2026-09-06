import { describe, expect, it } from "vitest";
import {
  createProjectForUser,
  listVisibleProjectsForUser,
  type ProjectRecordLike,
} from "./projectService";

describe("project service", () => {
  const projects: ProjectRecordLike[] = [
    {
      id: "proj_trace_demo",
      name: "Northstar Payments",
      ownerId: "alice",
      repository: "github.com/northstar/payments-service",
      status: "Monitoring",
      members: [
        { uid: "alice", role: "owner" },
        { uid: "marcus", role: "member" },
        { uid: "priya", role: "viewer" },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-06T12:00:00.000Z",
    },
  ];

  it("returns only the projects visible to the current user", () => {
    expect(listVisibleProjectsForUser(projects, "marcus")).toHaveLength(1);
    expect(listVisibleProjectsForUser(projects, "unknown")).toHaveLength(0);
  });

  it("creates a project only when the user is the owner", () => {
    const newProject = createProjectForUser(
      {
        name: "Payments V2",
        repository: "github.com/northstar/payments-v2",
        status: "Healthy",
        ownerId: "alice",
        members: [
          { uid: "alice", role: "owner" },
          { uid: "marcus", role: "member" },
        ],
      },
      "alice",
    );

    expect(newProject).not.toBeNull();
    expect(newProject?.name).toBe("Payments V2");
    expect(
      createProjectForUser(
        {
          name: "Bad project",
          repository: "github.com/northstar/bad",
          status: "Healthy",
          ownerId: "marcus",
          members: [{ uid: "marcus", role: "owner" }],
        },
        "alice",
      ),
    ).toBeNull();
  });
});
