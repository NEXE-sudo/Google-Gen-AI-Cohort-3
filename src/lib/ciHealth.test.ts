import { describe, expect, it } from "vitest";
import { getCIHealthMetrics } from "./ciHealth";

function runs(...conclusions: Array<string | null>) {
  return conclusions.map((conclusion) => ({ conclusion }));
}

describe("CI health metrics", () => {
  it("calculates 83% for five successes and one failure", () => {
    expect(
      getCIHealthMetrics(
        runs("success", "success", "success", "success", "success", "failure"),
      ),
    ).toMatchObject({ health: "83%", failedRunCount: 1 });
  });

  it("excludes skipped and neutral runs from health", () => {
    expect(getCIHealthMetrics(runs("success", "skipped")).health).toBe("100%");
    expect(getCIHealthMetrics(runs("success", "neutral")).health).toBe("100%");
    expect(getCIHealthMetrics(runs("skipped", "neutral")).health).toBe(
      "Unavailable",
    );
  });

  it("counts cancelled, timed out, and action required runs", () => {
    expect(
      getCIHealthMetrics(
        runs("success", "cancelled", "timed_out", "action_required"),
      ),
    ).toMatchObject({ health: "25%", failedRunCount: 3 });
  });

  it("returns unavailable when there are no workflow runs", () => {
    expect(getCIHealthMetrics([])).toMatchObject({
      health: "Unavailable",
      meaningfulRunCount: 0,
      failedRunCount: 0,
    });
  });
});
