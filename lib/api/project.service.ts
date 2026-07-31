import { delay } from "@/lib/utils"
import { mockProjects, mockCategories, mockColumns } from "@/lib/mock/data"
import type { Project, ProjectCategory, KanbanColumn } from "@/lib/types"

const LATENCY = 300

export async function getProjects(workspaceId: string): Promise<Project[]> {
  await delay(LATENCY)
  return mockProjects.filter(
    (p) => p.workspaceId === workspaceId && p.status !== "archived" && p.status !== "deleted"
  )
}

export async function getArchivedProjects(workspaceId: string): Promise<Project[]> {
  await delay(LATENCY)
  return mockProjects.filter((p) => p.workspaceId === workspaceId && p.status === "archived")
}

export async function getDeletedProjects(workspaceId: string): Promise<Project[]> {
  await delay(LATENCY)
  return mockProjects.filter((p) => p.workspaceId === workspaceId && p.status === "deleted")
}

export async function getProject(projectId: string): Promise<Project> {
  await delay(LATENCY)
  const project = mockProjects.find((p) => p.id === projectId)
  if (!project) throw new Error("Project not found")
  return project
}

export async function getProjectCategories(workspaceId: string): Promise<ProjectCategory[]> {
  await delay(LATENCY)
  return mockCategories.filter((c) => c.workspaceId === workspaceId)
}

export async function getKanbanColumns(projectId: string): Promise<KanbanColumn[]> {
  await delay(LATENCY)
  return mockColumns
    .filter((c) => c.projectId === projectId)
    .sort((a, b) => a.order - b.order)
}

export async function createProject(
  workspaceId: string,
  data: Partial<Project>
): Promise<Project> {
  await delay(LATENCY)
  return {
    id: `proj-${Date.now()}`,
    workspaceId,
    name: data.name ?? "Untitled",
    key: data.key ?? "NEW",
    status: "active",
    visibility: data.visibility ?? "team",
    ownerId: data.ownerId ?? "user-1",
    memberIds: data.memberIds ?? ["user-1"],
    progress: 0,
    taskCount: 0,
    completedTaskCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  } as Project
}

export async function updateProject(
  projectId: string,
  data: Partial<Project>
): Promise<Project> {
  await delay(LATENCY)
  const project = await getProject(projectId)
  return { ...project, ...data, updatedAt: new Date().toISOString() }
}
