import { describe, expect, it } from "vitest";
import {
  createIncident,
  listVisibleProjects,
  type ProjectRecord,
} from "./projectStore";

describe("project store", () => {
  const projects: ProjectRecord[] = [
    {
      id: "proj_trace_demo",
      name: "Northstar Payments",
      ownerId: "alice",
      repository: "github.com/northstar/payments-service",
      status: "Healthy",
      members: [
        { uid: "alice", role: "owner" },
        { uid: "marcus", role: "member" },
        { uid: "priya", role: "viewer" },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-06T12:00:00.000Z",
    },
  ];

  it("returns only projects the user can read", () => {
    expect(listVisibleProjects(projects, "marcus")).toHaveLength(1);
    expect(listVisibleProjects(projects, "unknown")).toHaveLength(0);
  });

  it("creates incidents for authorized project members and rejects viewer attempts", () => {
    const incident = createIncident(projects[0], "marcus", {
      title: "Request context lost after middleware reorder",
      severity: "High",
      summary:
        "Authentication middleware changed order before context extraction.",
      source: "payments-auth-integration",
    });

    expect(incident).not.toBeNull();
    expect(incident?.status).toBe("Open");
    expect(incident?.ownerId).toBe("marcus");

    expect(
      createIncident(projects[0], "priya", {
        title: "Unauthorized incident",
        severity: "Medium",
        summary: "Viewer should not create incidents.",
        source: "manual",
      }),
    ).toBeNull();
  });
});
