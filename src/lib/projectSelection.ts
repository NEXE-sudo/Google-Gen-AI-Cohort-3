export const SELECTED_PROJECT_STORAGE_KEY = "trace:selectedProjectId";

export function resolveSelectedProjectId(
  projects: Array<{ id: string }>,
  currentSelection: string | null,
): string | null {
  if (!projects.length) {
    return null;
  }

  if (
    currentSelection &&
    projects.some((project) => project.id === currentSelection)
  ) {
    return currentSelection;
  }

  return null;
}

export function readSelectedProjectId(
  storage: Storage | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): string | null {
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(SELECTED_PROJECT_STORAGE_KEY);
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function writeSelectedProjectId(
  projectId: string | null,
  storage: Storage | null = typeof window === "undefined"
    ? null
    : window.localStorage,
) {
  if (!storage) {
    return;
  }

  try {
    if (!projectId) {
      storage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
      return;
    }

    storage.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId);
  } catch {
    // Ignore storage failures to preserve the live app experience.
  }
}
