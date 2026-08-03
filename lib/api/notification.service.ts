import { apiRequest } from "@/lib/api/client"
import type { Notification, Activity } from "@/lib/types"

export async function getNotifications(_userId: string): Promise<Notification[]> {
  return apiRequest<Notification[]>("/notifications")
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest<Notification>(`/notifications/${id}/read`, { method: "POST" })
}

export async function getActivities(workspaceId?: string): Promise<Activity[]> {
  if (workspaceId) {
    return apiRequest<Activity[]>(`/workspaces/${workspaceId}/activities`)
  }
  return apiRequest<Activity[]>("/activities")
}

export async function getProjectActivities(
  _workspaceId: string,
  projectId: string
): Promise<Activity[]> {
  return apiRequest<Activity[]>(`/projects/${projectId}/activities`)
}

export async function markAllNotificationsRead(_userId: string): Promise<{ success: boolean }> {
  await apiRequest("/notifications/read-all", { method: "POST" })
  return { success: true }
}
