import React, { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import type { User } from "firebase/auth";
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
import {
  readSelectedProjectId,
  resolveSelectedProjectId,
  writeSelectedProjectId,
} from "../lib/projectSelection";

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

function formatDate(iso: string | null | undefined) {
  if (!iso) return "Unavailable";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type LiveProject = {
  id: string;
  name: string;
  ownerId: string;
  status: string;
  repository: string;
  members: Array<{ uid: string; role: string }>;
  createdAt: string;
  updatedAt: string;
};

type LiveIncident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  summary: string;
  source: string;
  createdAt: string;
  rootCause?: string;
  evidence?: string[];
  relatedCommits?: string[];
  relatedPullRequests?: string[];
  recommendedActions?: string[];
};

type LiveMemory = {
  id: string;
  problem: string;
  rootCause: string;
  resolution: string;
  summary: string;
};

type LiveWorkflowRun = {
  id: number;
  name: string;
  conclusion: string | null;
  status: string;
  branch: string | null;
  commitSha: string;
  startedAt: string | null;
  completedAt: string | null;
  url: string | null;
};

export function TraceDashboard({ currentUser }: { currentUser: User }) {
  const [activeTab, setActiveTab] = useState<DemoTab>("overview");
  const [query, setQuery] = useState("");
  const [incidentNotice, setIncidentNotice] = useState<string | null>(null);
  const [liveProjects, setLiveProjects] = useState<LiveProject[]>([]);
  const [liveIncidents, setLiveIncidents] = useState<LiveIncident[]>([]);
  const [liveMemory, setLiveMemory] = useState<LiveMemory[]>([]);
  const [liveWorkflowRuns, setLiveWorkflowRuns] = useState<LiveWorkflowRun[]>(
    [],
  );
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectRepository, setProjectRepository] = useState("");
  const [assistantQuestion, setAssistantQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [projectPendingDeletion, setProjectPendingDeletion] =
    useState<LiveProject | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const requestIdRef = useRef(0);
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

  useEffect(() => {
    if (isDemoMode) {
      setSelectedProjectId(null);
      writeSelectedProjectId(null);
      return;
    }

    const storedProjectId = readSelectedProjectId();
    setSelectedProjectId((current) => {
      const next = storedProjectId || current || null;
      if (next !== current) {
        writeSelectedProjectId(next);
      }
      return next;
    });
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      setLiveLoading(false);
      return;
    }

    let cancelled = false;
    const loadLiveData = async () => {
      const requestId = ++requestIdRef.current;
      setLiveLoading(true);
      setLiveError(null);
      setLiveIncidents([]);
      setLiveMemory([]);
      setLiveWorkflowRuns([]);
      try {
        const token = await currentUser.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const projectsResponse = await fetch("/api/projects", { headers });
        if (!projectsResponse.ok) {
          throw new Error("Unable to load authorised projects.");
        }

        const projectsPayload = (await projectsResponse.json()) as {
          projects?: LiveProject[];
        };
        const projects = projectsPayload.projects || [];

        if (cancelled) return;

        setLiveProjects(projects);
        const nextSelection = resolveSelectedProjectId(
          projects,
          selectedProjectId,
        );
        setSelectedProjectId((current) => {
          if (current === nextSelection) return current;
          writeSelectedProjectId(nextSelection);
          return nextSelection;
        });

        const project =
          projects.find((candidate) => candidate.id === nextSelection) ?? null;
        if (!project) {
          setLiveIncidents([]);
          setLiveMemory([]);
          setLiveWorkflowRuns([]);
          return;
        }

        const [incidentsResponse, memoryResponse, workflowRunsResponse] =
          await Promise.all([
            fetch(`/api/projects/${project.id}/incidents`, { headers }),
            fetch(`/api/projects/${project.id}/memory`, { headers }),
            fetch(`/api/projects/${project.id}/workflow-runs`, { headers }),
          ]);

        if (!incidentsResponse.ok || !memoryResponse.ok) {
          throw new Error("Unable to load project intelligence.");
        }
        if (!workflowRunsResponse.ok) {
          throw new Error("Unable to load workflow history.");
        }

        const incidentsPayload = (await incidentsResponse.json()) as {
          incidents?: LiveIncident[];
        };
        const memoryPayload = (await memoryResponse.json()) as {
          memory?: LiveMemory[];
        };
        const workflowRunsPayload = (await workflowRunsResponse.json()) as {
          workflowRuns?: LiveWorkflowRun[];
        };

        if (requestId !== requestIdRef.current || cancelled) return;

        setLiveIncidents(incidentsPayload.incidents || []);
        setLiveMemory(memoryPayload.memory || []);
        setLiveWorkflowRuns(workflowRunsPayload.workflowRuns || []);
      } catch (error) {
        if (!cancelled && requestId === requestIdRef.current) {
          setLiveError(
            error instanceof Error
              ? error.message
              : "Live data could not be loaded.",
          );
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current)
          setLiveLoading(false);
      }
    };

    void loadLiveData();
    return () => {
      cancelled = true;
    };
  }, [currentUser, isDemoMode, selectedProjectId]);

  const activeProject = isDemoMode
    ? demoProject
    : (liveProjects.find((project) => project.id === selectedProjectId) ??
      null);
  const incidentItems = isDemoMode
    ? demoIncidents.map((incident) => ({
        ...incident,
        relatedCommits: [] as string[],
        relatedPullRequests: [] as string[],
      }))
    : liveIncidents.map((incident) => ({
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        detectedAt: incident.createdAt,
        source: incident.source,
        rootCause: incident.rootCause || incident.summary,
        relatedCommits: incident.relatedCommits || [],
        relatedPullRequests: incident.relatedPullRequests || [],
      }));
  const memoryItems = isDemoMode
    ? demoMemory
    : liveMemory.map((entry) => ({
        problem: entry.problem,
        rootCause: entry.rootCause,
        resolution: entry.resolution,
        lesson: entry.summary,
      }));
  const workflowItems = isDemoMode
    ? demoCICD
    : liveWorkflowRuns.map((run) => ({
        id: run.id,
        workflow: run.name,
        status: run.conclusion || run.status,
        branch: run.branch || "unknown",
        duration: "Unavailable",
        commit: run.commitSha.slice(0, 8) || "Unavailable",
        timestamp: run.startedAt || run.completedAt,
        url: run.url,
      }));
  const securityItems = isDemoMode ? demoSecurity : [];
  const completedRuns = liveWorkflowRuns.filter((run) => run.conclusion);
  const successfulRuns = completedRuns.filter(
    (run) => run.conclusion === "success",
  );
  const failedRuns = completedRuns.filter(
    (run) => !["success", "neutral", "skipped"].includes(run.conclusion || ""),
  );
  const liveRecentActivity = [
    ...liveIncidents.map((incident) => ({
      timestamp: incident.createdAt,
      text: `Incident recorded: ${incident.title}`,
    })),
    ...liveWorkflowRuns.map((run) => ({
      timestamp: run.startedAt || run.completedAt,
      text: `Workflow ${run.name} ${run.conclusion || run.status}.`,
    })),
    ...liveMemory.map((entry) => ({
      timestamp: null,
      text: `Engineering memory updated: ${entry.problem}`,
    })),
  ]
    .sort((left, right) => {
      const leftTime = left.timestamp ? Date.parse(left.timestamp) : 0;
      const rightTime = right.timestamp ? Date.parse(right.timestamp) : 0;
      return rightTime - leftTime;
    })
    .slice(0, 5);
  const overviewCards = isDemoMode
    ? [
        { label: "Active incidents", value: demoOverview.activeIncidents },
        { label: "Recent failures", value: demoOverview.failedWorkflows },
        { label: "CI health", value: demoOverview.ciHealth },
        { label: "Security findings", value: demoOverview.securityFindings },
      ]
    : [
        {
          label: "Active incidents",
          value: liveIncidents.filter((incident) => incident.status !== "Resolved")
            .length,
        },
        { label: "Recent failures", value: failedRuns.length },
        {
          label: "CI health",
          value: completedRuns.length
            ? `${Math.round((successfulRuns.length / completedRuns.length) * 100)}%`
            : "Unavailable",
        },
        { label: "Security findings", value: "Unavailable" },
      ];

  const visibleProjects = useMemo(
    () =>
      isDemoMode ? listVisibleProjects(demoProjects, "alice") : liveProjects,
    [isDemoMode, liveProjects],
  );

  const filteredMemory = useMemo(() => {
    const phrase = query.trim().toLowerCase();
    if (!phrase) return memoryItems;
    return memoryItems.filter((entry) => {
      const text =
        `${entry.problem} ${entry.rootCause} ${entry.lesson}`.toLowerCase();
      return text.includes(phrase);
    });
  }, [memoryItems, query]);

  const handleCreateIncident = async () => {
    if (!isDemoMode) {
      if (!activeProject) {
        setIncidentNotice("Select an authorised project before creating an incident.");
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(
          `/api/projects/${activeProject.id}/incidents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: "New engineering incident",
              severity: "High",
              summary: "Incident requires investigation and evidence capture.",
              source: "trace-dashboard",
            }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          incident?: LiveIncident;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Incident creation failed.");
        }
        if (payload.incident) {
          setLiveIncidents((incidents) => [payload.incident!, ...incidents]);
        }
        setIncidentNotice("Incident created and persisted in Firestore.");
        return;
      } catch (error) {
        setIncidentNotice(
          error instanceof Error ? error.message : "Incident creation failed.",
        );
        return;
      }
    }

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

  const handleCreateProject = async () => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          repository: projectRepository,
        }),
      });
      if (!response.ok) throw new Error("Project creation failed.");
      const payload = (await response.json()) as { project: LiveProject };
      const createdProject = payload.project;
      setLiveProjects((projects) => [createdProject, ...projects]);
      setSelectedProjectId(createdProject.id);
      writeSelectedProjectId(createdProject.id);
      setProjectName("");
      setProjectRepository("");
      setIncidentNotice("Project created and persisted in Firestore.");
    } catch (error) {
      setIncidentNotice(
        error instanceof Error ? error.message : "Project creation failed.",
      );
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    writeSelectedProjectId(projectId);
  };

  const handleDeleteProject = async (project: LiveProject) => {
    if (isDemoMode) return;

    setProjectPendingDeletion(project);
    setDeleteConfirmation("");
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectPendingDeletion || deleteConfirmation !== projectPendingDeletion.name) {
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/projects/${projectPendingDeletion.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Project deletion failed.");
      }

      const remainingProjects = liveProjects.filter(
        (candidate) => candidate.id !== projectPendingDeletion.id,
      );
      setLiveProjects(remainingProjects);
      if (selectedProjectId === projectPendingDeletion.id) {
        const nextSelection = resolveSelectedProjectId(remainingProjects, null);
        setSelectedProjectId(nextSelection);
        writeSelectedProjectId(nextSelection);
        setLiveIncidents([]);
        setLiveMemory([]);
        setLiveWorkflowRuns([]);
      }
      setIncidentNotice(`Project “${projectPendingDeletion.name}” was deleted.`);
      setProjectPendingDeletion(null);
      setDeleteConfirmation("");
    } catch (error) {
      setIncidentNotice(
        error instanceof Error ? error.message : "Project deletion failed.",
      );
    }
  };

  const handleConnectGitHub = async (projectId: string) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(
        `/api/projects/${projectId}/github/connect`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const payload = (await response.json()) as {
        authorizationUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.authorizationUrl)
        throw new Error(payload.error || "GitHub connection could not start.");
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setIncidentNotice(
        error instanceof Error
          ? error.message
          : "GitHub connection could not start.",
      );
    }
  };

  const handleSyncRepository = async (projectId: string) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/projects/${projectId}/github/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as {
        workflowRuns?: LiveWorkflowRun[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Repository synchronization failed.");
      if (projectId === selectedProjectId) {
        setLiveWorkflowRuns(payload.workflowRuns || []);
      }
      setIncidentNotice(
        payload.workflowRuns?.length
          ? "Repository metadata and workflow runs synchronized."
          : "Repository synchronized. No GitHub Actions workflow runs found.",
      );
    } catch (error) {
      setIncidentNotice(
        error instanceof Error
          ? error.message
          : "Repository synchronization failed.",
      );
    }
  };

  const handleAskAssistant = async (question: string) => {
    if (isDemoMode) {
      setAssistantAnswer(
        "Demo mode uses synthetic project context. Switch to live mode for an authorised project-grounded answer.",
      );
      return;
    }
    if (!activeProject || !question.trim()) return;
    setAssistantLoading(true);
    setAssistantAnswer(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(
        `/api/projects/${activeProject.id}/assistant`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: question.trim() }),
        },
      );
      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Assistant request failed.");
      setAssistantAnswer(payload.answer || "The assistant returned no answer.");
    } catch (error) {
      setAssistantAnswer(
        error instanceof Error ? error.message : "Assistant request failed.",
      );
    } finally {
      setAssistantLoading(false);
    }
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

          {isDemoMode && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" /> Demo Project
              </div>
              Synthetic data only — clearly marked for evaluation.
            </div>
          )}

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
            <div className="text-base font-semibold">
              {activeProject?.name || "No project selected"}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              {activeProject?.repository ||
                (liveLoading
                  ? "Loading authorised projects..."
                  : "Create or join a project to begin.")}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-300">
              {(isDemoMode ? demoProject.branches : []).map((branch) => (
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
          {!isDemoMode && liveError && (
            <div className="mb-4 rounded-xl border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {liveError}
            </div>
          )}
          {!isDemoMode && !liveLoading && !activeProject && (
            <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
              No authorised projects found. Create a project through the live
              API to begin.
            </div>
          )}
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Trace • {activeTab}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {activeProject?.name || "Trace"}
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

          {projectPendingDeletion && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-100">
              <div className="font-semibold">
                Delete project &quot;{projectPendingDeletion.name}&quot;?
              </div>
              <p className="mt-2 text-red-200">
                This permanently removes incidents, engineering memory,
                workflow history, repository sync data, and GitHub connection
                data.
              </p>
              <label className="mt-3 block text-xs text-red-200">
                Type the project name to confirm.
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-red-400/40 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder={projectPendingDeletion.name}
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void handleConfirmDeleteProject()}
                  disabled={deleteConfirmation !== projectPendingDeletion.name}
                  className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Permanently delete
                </button>
                <button
                  onClick={() => {
                    setProjectPendingDeletion(null);
                    setDeleteConfirmation("");
                  }}
                  className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card) => (
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
                  </div>
                  <div className="space-y-3">
                    {(isDemoMode
                      ? demoOverview.recentActivity.map((text) => ({
                          text,
                          timestamp: null,
                        }))
                      : liveRecentActivity
                    ).map((item) => (
                      <div
                        key={`${item.text}-${item.timestamp || "activity"}`}
                        className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300"
                      >
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        <span>
                          {item.text}
                          {item.timestamp && (
                            <span className="ml-2 text-xs text-slate-500">
                              {formatDate(item.timestamp)}
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                    {!isDemoMode && liveRecentActivity.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                        No live engineering activity has been recorded for this
                        project.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                      AI summary
                    </h2>
                    {isDemoMode && (
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                        High confidence
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-7 text-slate-300">
                    {isDemoMode
                      ? "The latest auth flow regression is the strongest signal in the system. Evidence points to a middleware ordering change just before the first failed integration workflow, with one prior incident showing similar request-context loss."
                      : "No generated summary is available. Ask the project assistant for an evidence-based analysis."}
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
              {!isDemoMode && (
                <div className="mb-4 grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="Project name"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                  />
                  <input
                    value={projectRepository}
                    onChange={(event) =>
                      setProjectRepository(event.target.value)
                    }
                    placeholder="owner/repository"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
                  />
                  <button
                    onClick={handleCreateProject}
                    className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950"
                  >
                    Create project
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {visibleProjects.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-sm text-slate-400">
                    No authorised projects yet. Create one above to start
                    collecting project-specific intelligence.
                  </div>
                ) : (
                  visibleProjects.map((project) => (
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
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${statusClasses[project.status] || "bg-slate-700 text-slate-200"}`}
                        >
                          {project.status}
                        </span>
                        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                          Members: {project.members.length}
                        </span>
                        {!isDemoMode && (
                          <>
                            <button
                              onClick={() => handleSelectProject(project.id)}
                              className={`rounded-lg px-2.5 py-1 text-xs ${
                                selectedProjectId === project.id
                                  ? "border border-cyan-400/60 bg-cyan-500/10 text-cyan-200"
                                  : "border border-slate-700 text-slate-300"
                              }`}
                            >
                              {selectedProjectId === project.id
                                ? "Selected"
                                : "Select"}
                            </button>
                            <button
                              onClick={() => handleConnectGitHub(project.id)}
                              className="rounded-lg border border-cyan-400/40 px-2.5 py-1 text-xs text-cyan-300"
                            >
                              Connect GitHub
                            </button>
                            <button
                              onClick={() => handleSyncRepository(project.id)}
                              className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                            >
                              Sync repository
                            </button>
                            {project.ownerId === currentUser.uid && (
                              <button
                                onClick={() =>
                                  void handleDeleteProject(project)
                                }
                                className="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-300"
                              >
                                Delete project
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "incidents" && (
            <div className="space-y-4">
              {incidentItems.map((incident) => (
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
                        {incident.relatedPullRequests?.length ||
                        incident.relatedCommits?.length ? (
                          [
                            ...(incident.relatedPullRequests || []).map(
                              (pullRequest) => `PR ${pullRequest}`,
                            ),
                            ...(incident.relatedCommits || []).map(
                              (commit) => `Commit ${commit}`,
                            ),
                          ].join(" • ")
                        ) : (
                          "No related changes linked."
                        )}
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
                {workflowItems.map((run) => (
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
                {!isDemoMode && workflowItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                    No GitHub Actions workflow runs found.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4">
              {securityItems.map((finding) => (
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
              {!isDemoMode && securityItems.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-sm text-slate-400">
                  No security findings synced.
                </div>
              )}
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
                  {isDemoMode
                    ? "Likely root cause: authentication middleware introduced in commit d1c9f2a changed the expected request context. Three integration tests were skipped in PR #418. The first failing workflow occurred 11 minutes after the merge."
                    : assistantAnswer ||
                      "Ask about this authorised project's incidents, workflow evidence, or engineering memory."}
                </div>
                {!isDemoMode && (
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleAskAssistant(assistantQuestion);
                    }}
                  >
                    <input
                      value={assistantQuestion}
                      onChange={(event) =>
                        setAssistantQuestion(event.target.value)
                      }
                      placeholder="Ask about this project..."
                      className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={assistantLoading}
                      className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
                    >
                      {assistantLoading ? "Asking..." : "Ask"}
                    </button>
                  </form>
                )}
                {isDemoMode && (
                  <div className="mt-4 space-y-2">
                    {demoAssistantPromptSuggestions.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setAssistantQuestion(prompt);
                          void handleAskAssistant(prompt);
                        }}
                        className="block w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left text-sm text-slate-200 hover:border-cyan-400/40 hover:bg-slate-900"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="text-lg font-semibold text-white">
                  Project facts
                </h2>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="flex items-center gap-3">
                    <GitCommitHorizontal className="h-4 w-4 text-cyan-300" />{" "}
                    Recent commit: {isDemoMode
                      ? workflowItems[0]?.commit || "Unavailable"
                      : liveWorkflowRuns[0]?.commitSha.slice(0, 8) ||
                        "Unavailable"}
                  </div>
                  <div className="flex items-center gap-3">
                    <Workflow className="h-4 w-4 text-cyan-300" /> Last failed
                    workflow: {isDemoMode
                      ? workflowItems[0]?.workflow || "Unavailable"
                      : liveWorkflowRuns.find((run) =>
                          failedRuns.includes(run),
                        )?.name || "Unavailable"}
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-cyan-300" />{" "}
                    Severity: {isDemoMode
                      ? "High"
                      : liveIncidents[0]?.severity || "Unavailable"}
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-cyan-300" /> Security
                    posture: {isDemoMode
                      ? "review recommended"
                      : "Unavailable"}
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
                  <span>{isDemoMode ? demoSettings.mode : "Live project"}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <span>Data source</span>
                  <span>
                    {isDemoMode
                      ? demoSettings.dataSource
                      : "Firestore and connected integrations"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <span>Retention</span>
                  <span>
                    {isDemoMode
                      ? demoSettings.retention
                      : "Configured by deployment"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <span>Webhook status</span>
                  <span>
                    {isDemoMode
                      ? demoSettings.webhookStatus
                      : "Server-side status"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
