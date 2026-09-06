const MEANINGFUL_CONCLUSIONS = new Set([
  "success",
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
]);

export function getCIHealthMetrics(runs: Array<{ conclusion: string | null }>) {
  const meaningfulRuns = runs.filter((run) =>
    MEANINGFUL_CONCLUSIONS.has(run.conclusion || ""),
  );
  const successfulRuns = meaningfulRuns.filter(
    (run) => run.conclusion === "success",
  );

  return {
    meaningfulRunCount: meaningfulRuns.length,
    failedRunCount: meaningfulRuns.filter((run) => run.conclusion !== "success")
      .length,
    health: meaningfulRuns.length
      ? `${Math.round((successfulRuns.length / meaningfulRuns.length) * 100)}%`
      : "Unavailable",
  };
}
