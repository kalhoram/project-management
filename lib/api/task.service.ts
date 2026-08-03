import { apiRequest } from "@/lib/api/client"
import type { Task, Comment, Label } from "@/lib/types"

export async function getTasks(projectId: string): Promise<Task[]> {
  return apiRequest<Task[]>(`/projects/${projectId}/tasks`)
}

export async function getWorkspaceTasks(workspaceId: string): Promise<Task[]> {
  return apiRequest<Task[]>(`/workspaces/${workspaceId}/tasks`)
}

export async function getTask(taskId: string): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`)
}

export async function getTaskComments(taskId: string): Promise<Comment[]> {
  return apiRequest<Comment[]>(`/tasks/${taskId}/comments`)
}

export async function getLabels(workspaceId: string): Promise<Label[]> {
  return apiRequest<Label[]>(`/workspaces/${workspaceId}/labels`)
}

export async function createTask(projectId: string, data: Partial<Task>): Promise<Task> {
  return apiRequest<Task>("/tasks", {
    method: "POST",
    body: {
      projectId,
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId || undefined,
      labelIds: data.labelIds ?? [],
      startDate: data.startDate || undefined,
      dueDate: data.dueDate || undefined,
      estimateHours:
        data.estimateHours != null && !Number.isNaN(Number(data.estimateHours))
          ? data.estimateHours
          : undefined,
      storyPoints:
        data.storyPoints != null && !Number.isNaN(Number(data.storyPoints))
          ? data.storyPoints
          : undefined,
      columnId: data.columnId || undefined,
      order: data.order,
      parentId: data.parentId || undefined,
    },
  })
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
  return apiRequest<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId,
      labelIds: data.labelIds,
      startDate: data.startDate,
      dueDate: data.dueDate,
      estimateHours: data.estimateHours,
      actualHours: data.actualHours,
      storyPoints: data.storyPoints,
      progress: data.progress,
      columnId: data.columnId,
      order: data.order,
    },
  })
}
