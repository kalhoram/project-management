import type { Workspace } from "@/lib/types"

/**
 * Select workspace using deterministic policy:
 * 1. Persisted ID if still accessible
 * 2. Owner's default workspace (first owned)
 * 3. First accessible workspace
 */
export function selectWorkspace(
  workspaces: Workspace[],
  persistedId: string | null
): string | null {
  if (workspaces.length === 0) return null
  if (persistedId && workspaces.some((w) => w.id === persistedId)) {
    return persistedId
  }
  return workspaces[0]?.id ?? null
}

/**
 * Select project from accessible list:
 * 1. Persisted ID if still in workspace
 * 2. First active project
 */
export function selectProject(
  projects: Array<{ id: string }>,
  persistedId: string | null
): string | null {
  if (projects.length === 0) return null
  if (persistedId && projects.some((p) => p.id === persistedId)) {
    return persistedId
  }
  return projects[0]?.id ?? null
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}
