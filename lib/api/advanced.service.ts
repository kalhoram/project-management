import { delay } from "@/lib/utils"
import {
  mockSprints,
  mockRoadmap,
  mockOkrs,
  mockTimeEntries,
  mockApprovals,
  mockTasks,
  mockUsers,
  mockComments,
  currentUser,
} from "@/lib/mock/data"
import type {
  Sprint,
  RoadmapItem,
  OKR,
  TimeEntry,
  ApprovalRequest,
  Comment,
  Task,
} from "@/lib/types"

const LATENCY = 300

export async function getSprints(workspaceId: string): Promise<Sprint[]> {
  await delay(LATENCY)
  return mockSprints.filter((s) => s.workspaceId === workspaceId)
}

export async function getRoadmap(workspaceId: string): Promise<RoadmapItem[]> {
  await delay(LATENCY)
  return mockRoadmap.filter((r) => r.workspaceId === workspaceId)
}

export async function getOKRs(workspaceId: string): Promise<OKR[]> {
  await delay(LATENCY)
  return mockOkrs.filter((o) => o.workspaceId === workspaceId)
}

export async function getTimeEntries(workspaceId: string): Promise<TimeEntry[]> {
  await delay(LATENCY)
  return mockTimeEntries.filter((e) => e.workspaceId === workspaceId)
}

export async function getApprovals(workspaceId: string): Promise<ApprovalRequest[]> {
  await delay(LATENCY)
  return mockApprovals.filter((a) => a.workspaceId === workspaceId)
}

export interface CapacityMember {
  userId: string
  name: string
  allocatedHours: number
  availableHours: number
  utilization: number
}

export async function getCapacity(workspaceId: string): Promise<CapacityMember[]> {
  await delay(LATENCY)
  void workspaceId
  return mockUsers
    .filter((u) => u.status === "active")
    .map((user) => {
      const entries = mockTimeEntries.filter((e) => e.userId === user.id)
      const allocated = entries.reduce((sum, e) => sum + e.hours, 0)
      const available = 40
      return {
        userId: user.id,
        name: user.name,
        allocatedHours: allocated,
        availableHours: available,
        utilization: Math.round((allocated / available) * 100),
      }
    })
}

export interface EstimationItem {
  taskId: string
  key: string
  title: string
  estimateHours: number
  actualHours: number
  storyPoints: number
  variance: number
}

export async function getEstimation(workspaceId: string): Promise<EstimationItem[]> {
  await delay(LATENCY)
  return mockTasks
    .filter((t) => t.workspaceId === workspaceId && t.estimateHours)
    .map((t) => ({
      taskId: t.id,
      key: t.key,
      title: t.title,
      estimateHours: t.estimateHours ?? 0,
      actualHours: t.actualHours ?? 0,
      storyPoints: t.storyPoints ?? 0,
      variance: (t.actualHours ?? 0) - (t.estimateHours ?? 0),
    }))
}

export async function getComments(): Promise<Comment[]> {
  await delay(LATENCY)
  return mockComments
}

export async function getMentions(userId: string): Promise<Comment[]> {
  await delay(LATENCY)
  return mockComments.filter((c) => c.mentions.includes(userId))
}

export async function getMyTasks(userId: string): Promise<Task[]> {
  await delay(LATENCY)
  return mockTasks.filter((t) => t.assigneeId === userId)
}

export async function getOverdueTasks(userId?: string): Promise<Task[]> {
  await delay(LATENCY)
  const now = new Date()
  let tasks = mockTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "cancelled"
  )
  if (userId) tasks = tasks.filter((t) => t.assigneeId === userId)
  return tasks.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
}

export async function getUpcomingDeadlines(userId?: string, days = 14): Promise<Task[]> {
  await delay(LATENCY)
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 86400000)
  let tasks = mockTasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate) >= now &&
      new Date(t.dueDate) <= cutoff &&
      t.status !== "done" &&
      t.status !== "cancelled"
  )
  if (userId) tasks = tasks.filter((t) => t.assigneeId === userId)
  return tasks.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
}

export async function getAdminSettings() {
  await delay(LATENCY)
  return {
    maintenanceMode: false,
    featureFlags: {
      aiAssist: false,
      advancedReports: true,
      sso: false,
      betaKanban: true,
      exportPdf: true,
    },
    supportEmail: "support@teamblue.app",
    maxUploadMb: 50,
  }
}

export { currentUser }
