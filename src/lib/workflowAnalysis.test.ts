import { describe, expect, it } from "vitest";
import {
  selectFailedWorkflowJob,
  selectProblematicWorkflowRun,
} from "./workflowAnalysis";

describe("workflow analysis selection", () => {
  it("prefers an actual failed workflow and failed job", () => {
    const run = selectProblematicWorkflowRun([
      { id: 1, conclusion: "cancelled" },
      { id: 2, conclusion: "failure" },
    ]);
    const job = selectFailedWorkflowJob([
      { id: 10, conclusion: "action_required" },
      { id: 11, conclusion: "failure" },
    ]);

    expect(run?.id).toBe(2);
    expect(job?.id).toBe(11);
  });

  it("falls back to other problematic conclusions", () => {
    expect(
      selectProblematicWorkflowRun([{ id: 1, conclusion: "timed_out" }])?.id,
    ).toBe(1);
    expect(
      selectFailedWorkflowJob([{ id: 2, conclusion: "cancelled" }])?.id,
    ).toBe(2);
  });

  it("returns null when no failed workflow or job exists", () => {
    expect(
      selectProblematicWorkflowRun([{ id: 1, conclusion: "success" }]),
    ).toBeNull();
    expect(selectFailedWorkflowJob([{ id: 2, conclusion: null }])).toBeNull();
  });

  it("does not select successful or skipped jobs as failures", () => {
    expect(
      selectFailedWorkflowJob([
        { id: 1, conclusion: "success" },
        { id: 2, conclusion: "skipped" },
      ]),
    ).toBeNull();
  });
});
