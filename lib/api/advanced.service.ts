import { apiRequest } from "@/lib/api/client"
import {
  mapCapacityRow,
  mapEstimationRow,
  type CapacityApiRow,
  type EstimationApiRow,
} from "@/lib/api/mappers"
import * as workspaceService from "@/lib/api/workspace.service"
import type {
  Sprint,
  RoadmapItem,
  OKR,
  TimeEntry,
  ApprovalRequest,
  Comment,
  Task,
} from "@/lib/types"

export async function getSprints(workspaceId: string): Promise<Sprint[]> {
  return apiRequest<Sprint[]>(`/workspaces/${workspaceId}/sprints`)
}

export async function getRoadmap(workspaceId: string): Promise<RoadmapItem[]> {
  return apiRequest<RoadmapItem[]>(`/workspaces/${workspaceId}/roadmap`)
}

export async function getOKRs(workspaceId: string): Promise<OKR[]> {
  return apiRequest<OKR[]>(`/workspaces/${workspaceId}/okrs`)
}

export async function getTimeEntries(workspaceId: string): Promise<TimeEntry[]> {
  return apiRequest<TimeEntry[]>(`/workspaces/${workspaceId}/time-entries`)
}

export async function getApprovals(workspaceId: string): Promise<ApprovalRequest[]> {
  return apiRequest<ApprovalRequest[]>(`/workspaces/${workspaceId}/approvals`)
}

export interface CapacityMember {
  userId: string
  name: string
  allocatedHours: number
  availableHours: number
  utilization: number
  capacityHours?: number
}

export async function getCapacity(workspaceId: string): Promise<CapacityMember[]> {
  const [rows, members] = await Promise.all([
    apiRequest<CapacityApiRow[]>(`/workspaces/${workspaceId}/capacity`),
    workspaceService.getWorkspaceMembers(workspaceId).catch(() => []),
  ])
  const nameById = new Map(members.map((member) => [member.id, member.name]))
  return rows.map((row) => mapCapacityRow(row, nameById.get(row.userId)))
}

export interface EstimationItem {
  taskId: string
  key: string
  title: string
  estimateHours: number
  actualHours: number
  storyPoints: number
  variance: number
  confidence?: number
}

export async function getEstimation(workspaceId: string): Promise<EstimationItem[]> {
  const rows = await apiRequest<EstimationApiRow[]>(`/workspaces/${workspaceId}/estimation`)
  return rows.map(mapEstimationRow)
}

export async function getComments(workspaceId: string): Promise<Comment[]> {
  return apiRequest<Comment[]>(`/workspaces/${workspaceId}/comments`)
}

export async function getMentions(workspaceId: string, _userId: string): Promise<Comment[]> {
  return apiRequest<Comment[]>(`/workspaces/${workspaceId}/mentions`)
}

export async function getMyTasks(userId: string, workspaceId?: string): Promise<Task[]> {
  return apiRequest<Task[]>("/tasks/my", {
    query: { workspaceId },
  })
}

export async function getOverdueTasks(userId?: string, workspaceId?: string): Promise<Task[]> {
  return apiRequest<Task[]>("/tasks/overdue", {
    query: { mineOnly: userId ? true : undefined, workspaceId },
  })
}

export async function getUpcomingDeadlines(
  userId?: string,
  days = 14,
  workspaceId?: string
): Promise<Task[]> {
  return apiRequest<Task[]>("/tasks/upcoming-deadlines", {
    query: { days, mineOnly: userId ? true : undefined, workspaceId },
  })
}

export async function getAdminSettings(): Promise<{
  maintenanceMode: boolean
  featureFlags: Record<string, boolean>
  supportEmail: string
  maxUploadMb: number
}> {
  return apiRequest("/admin/settings")
}
