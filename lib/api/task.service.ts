import { delay } from "@/lib/utils"
import { mockTasks, mockComments, mockLabels } from "@/lib/mock/data"
import type { Task, Comment, Label } from "@/lib/types"

const LATENCY = 300

export async function getTasks(projectId: string): Promise<Task[]> {
  await delay(LATENCY)
  return mockTasks
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => a.order - b.order)
}

export async function getWorkspaceTasks(workspaceId: string): Promise<Task[]> {
  await delay(LATENCY)
  return mockTasks.filter((t) => t.workspaceId === workspaceId)
}

export async function getTask(taskId: string): Promise<Task> {
  await delay(LATENCY)
  const task = mockTasks.find((t) => t.id === taskId)
  if (!task) throw new Error("Task not found")
  return task
}

export async function getTaskComments(taskId: string): Promise<Comment[]> {
  await delay(LATENCY)
  return mockComments.filter((c) => c.entityType === "task" && c.entityId === taskId)
}

export async function getLabels(): Promise<Label[]> {
  await delay(LATENCY)
  return mockLabels
}

export async function createTask(
  projectId: string,
  data: Partial<Task>
): Promise<Task> {
  await delay(LATENCY)
  return {
    id: `task-${Date.now()}`,
    projectId,
    workspaceId: data.workspaceId ?? "ws-1",
    key: data.key ?? "NEW-1",
    title: data.title ?? "Untitled task",
    status: data.status ?? "todo",
    priority: data.priority ?? "medium",
    reporterId: data.reporterId ?? "user-1",
    labelIds: data.labelIds ?? [],
    progress: 0,
    order: 0,
    blockedByIds: [],
    blockingIds: [],
    checklist: [],
    attachmentCount: 0,
    commentCount: 0,
    isRecurring: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  } as Task
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
  await delay(LATENCY)
  const task = await getTask(taskId)
  return { ...task, ...data, updatedAt: new Date().toISOString() }
}
