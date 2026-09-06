const PROBLEMATIC_CONCLUSIONS = [
  "failure",
  "cancelled",
  "timed_out",
  "action_required",
];

export function selectProblematicWorkflowRun<
  T extends { conclusion: string | null },
>(runs: T[]): T | null {
  return (
    runs.find((run) => run.conclusion === "failure") ||
    runs.find((run) =>
      PROBLEMATIC_CONCLUSIONS.includes(run.conclusion || ""),
    ) ||
    null
  );
}

export function selectFailedWorkflowJob<
  T extends { conclusion: string | null },
>(jobs: T[]): T | null {
  return (
    jobs.find((job) => job.conclusion === "failure") ||
    jobs.find((job) =>
      PROBLEMATIC_CONCLUSIONS.includes(job.conclusion || ""),
    ) ||
    null
  );
}
