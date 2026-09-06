import { describe, expect, it } from "vitest";
import { matchesSessionSearch } from "./SidebarHistory";

describe("matchesSessionSearch", () => {
  it("does not crash when session fields are missing", () => {
    const session = {
      id: "a1",
      userId: "u1",
      category: "reflection",
      messages: [
        {
          id: "m1",
          sender: "user",
          content: "hello",
          timestamp: "2026-01-01T00:00:00Z",
        },
      ],
    } as any;

    expect(matchesSessionSearch(session, "hello")).toBe(true);
    expect(matchesSessionSearch(session, "missing")).toBe(false);
  });

  it("handles sessions with undefined titles or summaries", () => {
    const session = {
      id: "a2",
      userId: "u2",
      title: undefined,
      summary: undefined,
      category: "brainstorm",
      messages: [
        {
          id: "m2",
          sender: "gemini",
          content: "summary of events",
          timestamp: "2026-01-01T00:00:00Z",
        },
      ],
    } as any;

    expect(matchesSessionSearch(session, "events")).toBe(true);
  });
});
