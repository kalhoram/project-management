import { delay } from "@/lib/utils"
import { mockNotifications, mockActivities } from "@/lib/mock/data"
import type { Notification, Activity } from "@/lib/types"

const LATENCY = 250

export async function getNotifications(userId: string): Promise<Notification[]> {
  await delay(LATENCY)
  return mockNotifications.filter((n) => n.userId === userId)
}

export async function markNotificationRead(id: string): Promise<Notification> {
  await delay(LATENCY)
  const notification = mockNotifications.find((n) => n.id === id)
  if (!notification) throw new Error("Notification not found")
  return { ...notification, read: true }
}

export async function getActivities(workspaceId?: string): Promise<Activity[]> {
  await delay(LATENCY)
  if (!workspaceId) return mockActivities
  return mockActivities.filter((a) => a.workspaceId === workspaceId)
}

export async function getProjectActivities(
  workspaceId: string,
  projectId: string
): Promise<Activity[]> {
  await delay(LATENCY)
  return mockActivities.filter(
    (a) =>
      a.workspaceId === workspaceId &&
      (a.entityType === "project"
        ? a.entityId === projectId
        : a.entityType === "task" || a.entityType === "file")
  )
}

export async function markAllNotificationsRead(userId: string): Promise<{ success: boolean }> {
  await delay(LATENCY)
  void userId
  return { success: true }
}
