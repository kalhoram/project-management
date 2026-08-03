import { apiDownload, apiRequest, apiUpload } from "@/lib/api/client"
import type { Attachment, FileFolder } from "@/lib/types"

export async function getWorkspaceFiles(workspaceId: string): Promise<Attachment[]> {
  return apiRequest<Attachment[]>(`/workspaces/${workspaceId}/files`)
}

export async function getProjectFiles(projectId: string): Promise<Attachment[]> {
  return apiRequest<Attachment[]>(`/projects/${projectId}/files`)
}

export async function getTaskFiles(taskId: string): Promise<Attachment[]> {
  return apiRequest<Attachment[]>(`/tasks/${taskId}/files`)
}

export async function getDeletedFiles(workspaceId: string): Promise<Attachment[]> {
  return apiRequest<Attachment[]>(`/workspaces/${workspaceId}/files/deleted`)
}

export async function getFolders(workspaceId: string, projectId?: string): Promise<FileFolder[]> {
  return apiRequest<FileFolder[]>(`/workspaces/${workspaceId}/folders`, {
    query: projectId ? { projectId } : undefined,
  })
}

export async function getFile(fileId: string): Promise<Attachment> {
  return apiRequest<Attachment>(`/files/${fileId}`)
}

export interface UploadFileParams {
  workspaceId: string
  file: File
  projectId?: string
  taskId?: string
  folderId?: string
}

export async function uploadFile(params: UploadFileParams): Promise<Attachment> {
  const formData = new FormData()
  formData.append("workspace_id", params.workspaceId)
  formData.append("file", params.file)
  if (params.projectId) formData.append("project_id", params.projectId)
  if (params.taskId) formData.append("task_id", params.taskId)
  if (params.folderId) formData.append("folder_id", params.folderId)
  return apiUpload<Attachment>("/files/upload", formData)
}

export async function downloadFile(fileId: string, filename: string): Promise<void> {
  await apiDownload(`/files/${fileId}/download`, filename)
}
