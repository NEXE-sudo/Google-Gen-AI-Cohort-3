import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  GitBranch,
  GitCommitHorizontal,
  Lock,
  MessageSquareText,
  Radar,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import {
  demoAssistantPromptSuggestions,
  demoCICD,
  demoIncidents,
  demoMemory,
  demoOverview,
  demoProject,
  demoProjects,
  demoSecurity,
  demoSettings,
  type DemoTab,
} from "../data/demoData";
import { createIncident, listVisibleProjects } from "../lib/projectStore";

const navItems: Array<{
  key: DemoTab;
  label: string;
  icon: React.ComponentType<any>;
}> = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "projects", label: "Projects", icon: GitBranch },
  { key: "incidents", label: "Incidents", icon: AlertTriangle },
  { key: "cicd", label: "CI/CD", icon: Workflow },
  { key: "security", label: "Security", icon: Shield },
  { key: "memory", label: "Memory", icon: BookOpen },
  { key: "assistant", label: "AI Assistant", icon: MessageSquareText },
  { key: "settings", label: "Settings", icon: Lock },
];

const statusClasses: Record<string, string> = {
  Healthy: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  Monitoring: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  "At risk": "bg-orange-500/15 text-orange-300 border border-orange-500/30",
  Failed: "bg-red-500/15 text-red-300 border border-red-500/30",
  Succeeded: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  Investigating: "bg-orange-500/15 text-orange-300 border border-orange-500/30",
  Mitigated: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  Open: "bg-red-500/15 text-red-300 border border-red-500/30",
  Pending: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  High: "bg-red-500/15 text-red-300 border border-red-500/30",
  Medium: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  Low: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
};

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TraceDashboard() {
  const [activeTab, setActiveTab] = useState<DemoTab>("overview");
  const [query, setQuery] = useState("");
  const [incidentNotice, setIncidentNotice] = useState<string | null>(null);

  const visibleProjects = useMemo(
    () => listVisibleProjects(demoProjects, "alice"),
    [],
  );

  const filteredMemory = useMemo(() => {
    const phrase = query.trim().toLowerCase();
    if (!phrase) return demoMemory;
    return demoMemory.filter((entry) => {
      const text =
        `${entry.problem} ${entry.rootCause} ${entry.lesson}`.toLowerCase();
      return text.includes(phrase);
    });
  }, [query]);

  const handleCreateIncident = () => {
    const newIncident = createIncident(demoProject, "alice", {
      title: "AI assistant misread workflow logs",
      severity: "High",
      summary:
        "The latest incident review suggests the assistant interpreted stale logs as new evidence.",
      source: "trace-ai-assistant",
    });

    if (newIncident) {
      setIncidentNotice(
        `Incident created: ${newIncident.title} (${newIncident.status})`,
      );
      return;
    }

    setIncidentNotice(
      "You do not have permission to create an incident in this project.",
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-950/90 p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/30">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Trace</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Engineering Intelligence
              </div>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" /> Demo Project
            </div>
            Synthetic data only — clearly marked for evaluation.
          </div>

          <nav className="space-y-1.5">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${activeTab === key ? "bg-slate-800 text-white ring-1 ring-slate-700" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                {activeTab === key && (
                  <ArrowRight className="h-4 w-4 text-cyan-300" />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
              <span>Project</span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                Live
              </span>
            </div>
            <div className="text-base font-semibold">{demoProject.name}</div>
            <div className="mt-2 text-sm text-slate-400">
              {demoProject.repository}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-300">
              {demoProject.branches.map((branch) => (
                <span
                  key={branch}
                  className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1"
                >
                  {branch}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-slate-950 p-4 lg:p-6">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Trace • {activeTab}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {demoProject.name}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200">
                <Bell className="h-4 w-4 text-cyan-300" />
                Alerts
              </button>
              <button
                onClick={handleCreateIncident}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950"
              >
                <Activity className="h-4 w-4" />
                Create incident
              </button>
            </div>
          </header>

          {incidentNotice && (
            <div className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
              {incidentNotice}
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Active incidents",
                    value: demoOverview.activeIncidents,
                  },
                  {
                    label: "Recent failures",
                    value: demoOverview.failedWorkflows,
                  },
                  { label: "CI health", value: demoOverview.ciHealth },
                  {
                    label: "Security findings",
                    value: demoOverview.securityFindings,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {card.label}
                    </div>
                    <div className="mt-3 text-3xl font-semibold text-white">
                      {card.value}
                    </div>
                  </div>
                ))}
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                      Recent engineering activity
                    </h2>
                    <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                      Updated 14m ago
                    </span>
                  </div>
                  <div className="space-y-3">
                    {demoOverview.recentActivity.map((item) => (
                      <div
                        key={item}
                        className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300"
                      >
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                      AI summary
                    </h2>
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                      High confidence
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-slate-300">
                    The latest auth flow regression is the strongest signal in
                    the system. Evidence points to a middleware ordering change
                    just before the first failed integration workflow, with one
                    prior incident showing similar request-context loss.
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeTab === "projects" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Projects</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {visibleProjects.length} connected
                </span>
              </div>
              <div className="space-y-3">
                {visibleProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-base font-medium text-white">
                        {project.name}
                      </div>
                      <div className="text-sm text-slate-400">
                        {project.repository}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[project.status] || "bg-slate-700 text-slate-200"}`}
                      >
                        {project.status}
                      </span>
                      <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                        Members: {project.members.length}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "incidents" && (
            <div className="space-y-4">
              {demoIncidents.map((incident) => (
                <div
                  key={incident.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-xl font-semibold text-white">
                        {incident.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {incident.source}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[incident.severity]}`}
                      >
                        {incident.severity}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[incident.status]}`}
                      >
                        {incident.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        Detected
                      </div>
                      <div className="mt-2 text-sm">
                        {formatDate(incident.detectedAt)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        Root cause
                      </div>
                      <div className="mt-2 text-sm text-slate-300">
                        {incident.rootCause}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        Related
                      </div>
                      <div className="mt-2 text-sm text-slate-300">
                        PR #418 • Commit d1c9f2a
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "cicd" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">CI/CD</h2>
                <button className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Analyse with Gemini
                </button>
              </div>
              <div className="space-y-3">
                {demoCICD.map((run) => (
                  <div
                    key={`${run.workflow}-${run.timestamp}`}
                    className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] md:items-center"
                  >
                    <div>
                      <div className="font-medium text-white">
                        {run.workflow}
                      </div>
                      <div className="text-xs text-slate-400">
                        {run.branch} • {run.commit}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300">
                      {formatDate(run.timestamp)}
                    </div>
                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[run.status]}`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-300">{run.duration}</div>
                    <div className="text-sm text-slate-300">{run.branch}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4">
              {demoSecurity.map((finding) => (
                <div
                  key={`${finding.resource}-${finding.description}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {finding.category}
                      </div>
                      <div className="text-sm text-slate-400">
                        Affected resource: {finding.resource}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[finding.severity]}`}
                      >
                        {finding.severity}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[finding.status]}`}
                      >
                        {finding.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-slate-300">
                    {finding.description}
                  </p>
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                    <div className="font-medium text-white">Evidence</div>
                    <div className="mt-1">{finding.evidence}</div>
                  </div>
                  <div className="mt-3 text-sm text-cyan-300">
                    Recommendation: {finding.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "memory" && (
            <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Engineering memory
                </h2>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search lessons or incidents..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 md:max-w-xs"
                />
              </div>
              <div className="space-y-3">
                {filteredMemory.map((entry, index) => (
                  <div
                    key={`${entry.problem}-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300"
                  >
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                      Incident lesson
                    </div>
                    <div className="mb-1">
                      <span className="font-medium text-white">Problem:</span>{" "}
                      {entry.problem}
                    </div>
                    <div className="mb-1">
                      <span className="font-medium text-white">
                        Root cause:
                      </span>{" "}
                      {entry.rootCause}
                    </div>
                    <div className="mb-1">
                      <span className="font-medium text-white">
                        Resolution:
                      </span>{" "}
                      {entry.resolution}
                    </div>
                    <div>
                      <span className="font-medium text-white">Lesson:</span>{" "}
                      {entry.lesson}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "assistant" && (
            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    AI Assistant
                  </h2>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                    Context-aware
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                  “Likely root cause: authentication middleware introduced in
                  commit d1c9f2a changed the expected request context. Three
                  integration tests were skipped in PR #418. The first failing
                  workflow occurred 11 minutes after the merge.”
                </div>
                <div className="mt-4 space-y-2">
                  {demoAssistantPromptSuggestions.map((prompt) => (
                    <button
                      key={prompt}
                      className="block w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left text-sm text-slate-200 hover:border-cyan-400/40 hover:bg-slate-900"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-semibold text-white">
                  Project facts
                </h2>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center gap-3">
                    <GitCommitHorizontal className="h-4 w-4 text-cyan-300" />{" "}
                    Recent commit: {demoCICD[0].commit}
                  </div>
                  <div className="flex items-center gap-3">
                    <Workflow className="h-4 w-4 text-cyan-300" /> Last failed
                    workflow: {demoCICD[0].workflow}
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-cyan-300" />{" "}
                    Severity: High
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-cyan-300" /> Security
                    posture: review recommended
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <span>Mode</span>
                  <span>{demoSettings.mode}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <span>Data source</span>
                  <span>{demoSettings.dataSource}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <span>Retention</span>
                  <span>{demoSettings.retention}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <span>Webhook status</span>
                  <span>{demoSettings.webhookStatus}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
