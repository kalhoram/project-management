import { delay } from "@/lib/utils"
import { mockTasks, mockUsers, mockTimeEntries, mockProjects } from "@/lib/mock/data"

const LATENCY = 350

export async function getDashboardMetrics(workspaceId?: string) {
  await delay(LATENCY)
  const tasks = workspaceId
    ? mockTasks.filter((t) => t.workspaceId === workspaceId)
    : mockTasks
  const projects = workspaceId
    ? mockProjects.filter((p) => p.workspaceId === workspaceId && p.status === "active")
    : mockProjects.filter((p) => p.status === "active")

  const now = new Date()
  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "done"
  )

  return {
    totalWorkspaces: workspaceId ? 1 : 3,
    totalProjects: projects.length,
    openTasks: tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
    overdueTasks: overdue.length,
    completedTasks: tasks.filter((t) => t.status === "done").length,
    members: mockUsers.length,
  }
}

export async function getTaskStatusReport(projectId: string) {
  await delay(LATENCY)
  const tasks = mockTasks.filter((t) => t.projectId === projectId)
  const statuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked"] as const
  return statuses.map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }))
}

export async function getMemberPerformance(workspaceId: string) {
  await delay(LATENCY)
  void workspaceId
  return mockUsers.map((user) => {
    const assigned = mockTasks.filter((t) => t.assigneeId === user.id)
    return {
      userId: user.id,
      name: user.name,
      completed: assigned.filter((t) => t.status === "done").length,
      overdue: assigned.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
      ).length,
      open: assigned.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
      avgHours:
        assigned.reduce((sum, t) => sum + (t.actualHours ?? 0), 0) /
          Math.max(assigned.length, 1) || 0,
    }
  })
}

export async function getTimeTrackingReport(workspaceId: string) {
  await delay(LATENCY)
  const entries = mockTimeEntries.filter((e) => e.workspaceId === workspaceId)
  return {
    totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
    billableHours: entries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours, 0),
    entries,
  }
}

export async function getProgressTrend(projectId: string) {
  await delay(LATENCY)
  void projectId
  return [
    { week: "W1", progress: 20 },
    { week: "W2", progress: 32 },
    { week: "W3", progress: 41 },
    { week: "W4", progress: 48 },
    { week: "W5", progress: 55 },
    { week: "W6", progress: 62 },
  ]
}
