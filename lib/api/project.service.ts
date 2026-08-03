import { apiRequest } from "@/lib/api/client"
import type { Project, ProjectCategory, KanbanColumn } from "@/lib/types"

type ProjectScope = "active" | "archived" | "deleted"

async function listProjectsByScope(
  workspaceId: string,
  scope: ProjectScope
): Promise<Project[]> {
  return apiRequest<Project[]>(`/workspaces/${workspaceId}/projects`, {
    query: { scope },
  })
}

export async function getProjects(workspaceId: string): Promise<Project[]> {
  return listProjectsByScope(workspaceId, "active")
}

export async function getArchivedProjects(workspaceId: string): Promise<Project[]> {
  return listProjectsByScope(workspaceId, "archived")
}

export async function getDeletedProjects(workspaceId: string): Promise<Project[]> {
  return listProjectsByScope(workspaceId, "deleted")
}

export async function getProject(projectId: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${projectId}`)
}

export async function getProjectCategories(workspaceId: string): Promise<ProjectCategory[]> {
  return apiRequest<ProjectCategory[]>(`/workspaces/${workspaceId}/project-categories`)
}

export async function getKanbanColumns(projectId: string): Promise<KanbanColumn[]> {
  return apiRequest<KanbanColumn[]>(`/projects/${projectId}/kanban/columns`)
}

export async function createProject(
  workspaceId: string,
  data: Partial<Project>
): Promise<Project> {
  return apiRequest<Project>(`/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: {
      name: data.name,
      description: data.description,
      key: data.key,
      visibility: data.visibility,
      categoryId: data.categoryId,
      memberIds: data.memberIds,
      startDate: data.startDate,
      dueDate: data.dueDate,
      templateId: data.templateId,
    },
  })
}

export async function updateProject(
  projectId: string,
  data: Partial<Project>
): Promise<Project> {
  return apiRequest<Project>(`/projects/${projectId}`, {
    method: "PATCH",
    body: {
      name: data.name,
      description: data.description,
      status: data.status,
      visibility: data.visibility,
      categoryId: data.categoryId,
      ownerId: data.ownerId,
      memberIds: data.memberIds,
      startDate: data.startDate,
      dueDate: data.dueDate,
    },
  })
}
