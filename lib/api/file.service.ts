import { delay } from "@/lib/utils"
import { mockAttachments, mockFolders } from "@/lib/mock/data"
import type { Attachment, FileFolder } from "@/lib/types"

const LATENCY = 300

export async function getWorkspaceFiles(workspaceId: string): Promise<Attachment[]> {
  await delay(LATENCY)
  return mockAttachments.filter((f) => f.workspaceId === workspaceId && !f.deletedAt)
}

export async function getProjectFiles(projectId: string): Promise<Attachment[]> {
  await delay(LATENCY)
  return mockAttachments.filter((f) => f.projectId === projectId && !f.deletedAt)
}

export async function getTaskFiles(taskId: string): Promise<Attachment[]> {
  await delay(LATENCY)
  return mockAttachments.filter((f) => f.taskId === taskId && !f.deletedAt)
}

export async function getDeletedFiles(workspaceId: string): Promise<Attachment[]> {
  await delay(LATENCY)
  return mockAttachments.filter((f) => f.workspaceId === workspaceId && !!f.deletedAt)
}

export async function getFolders(workspaceId: string, projectId?: string): Promise<FileFolder[]> {
  await delay(LATENCY)
  return mockFolders.filter(
    (f) => f.workspaceId === workspaceId && (projectId ? f.projectId === projectId : !f.projectId || true)
  )
}

export async function getFile(fileId: string): Promise<Attachment> {
  await delay(LATENCY)
  const file = mockAttachments.find((f) => f.id === fileId)
  if (!file) throw new Error("File not found")
  return file
}
