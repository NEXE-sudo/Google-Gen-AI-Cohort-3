import { describe, expect, it } from "vitest";
import {
  buildProjectDocument,
  buildIncidentDocument,
  normalizeProjectInput,
  type ProjectDraft,
} from "./projectPersistence";

describe("project persistence model", () => {
  const projectDraft: ProjectDraft = {
    name: "Northstar Payments",
    repository: "github.com/northstar/payments-service",
    status: "Monitoring",
    ownerId: "alice",
    members: [
      { uid: "alice", role: "owner" },
      { uid: "marcus", role: "member" },
    ],
  };

  it("creates a Firestore-friendly project document with a member lookup list", () => {
    const doc = buildProjectDocument(projectDraft, "alice");

    expect(doc.ownerId).toBe("alice");
    expect(doc.memberUids).toEqual(["alice", "marcus"]);
    expect(doc.members).toHaveLength(2);
    expect(doc.updatedAt).toEqual(expect.any(String));
  });

  it("normalizes user input and rejects invalid project ownership mutations", () => {
    const normalized = normalizeProjectInput({
      name: "  Northstar Payments  ",
      repository: "  github.com/northstar/payments-service  ",
      status: "Healthy",
      ownerId: "alice",
      members: [
        { uid: "alice", role: "owner" },
        { uid: "priya", role: "viewer" },
      ],
    });

    expect(normalized.name).toBe("Northstar Payments");
    expect(normalized.repository).toBe("github.com/northstar/payments-service");
    expect(normalized.members[1].role).toBe("viewer");

    expect(() =>
      buildProjectDocument(
        {
          ...projectDraft,
          ownerId: "marcus",
        },
        "alice",
      ),
    ).toThrow("ownerId");
  });

  it("builds a consistent incident document from project and user data", () => {
    const incident = buildIncidentDocument("proj_trace_demo", "marcus", {
      title: "  Request context lost  ",
      severity: "High",
      summary: "Middleware ordering changed before request context extraction.",
      source: "payments-auth-integration",
    });

    expect(incident.projectId).toBe("proj_trace_demo");
    expect(incident.ownerId).toBe("marcus");
    expect(incident.title).toBe("Request context lost");
    expect(incident.status).toBe("Open");
  });
});
