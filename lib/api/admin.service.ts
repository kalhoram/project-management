import { delay } from "@/lib/utils"
import {
  mockUsers,
  mockWorkspaces,
  mockProjects,
  mockPayments,
  mockPlans,
  mockSystemLogs,
  mockActivities,
} from "@/lib/mock/data"

const LATENCY = 300

export async function getAdminDashboard() {
  await delay(LATENCY)
  return {
    users: mockUsers.length,
    workspaces: mockWorkspaces.length,
    projects: mockProjects.length,
    revenue: mockPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0),
    alerts: mockSystemLogs.filter((l) => l.severity === "error" || l.severity === "critical"),
    recentActivity: mockActivities.slice(0, 5),
  }
}

export async function getAdminUsers() {
  await delay(LATENCY)
  return mockUsers
}

export async function getAdminUser(userId: string) {
  await delay(LATENCY)
  const user = mockUsers.find((u) => u.id === userId)
  if (!user) throw new Error("User not found")
  return {
    user,
    workspaces: mockWorkspaces.filter((w) => w.ownerId === userId || true).slice(0, 2),
    projects: mockProjects.filter((p) => p.ownerId === userId),
  }
}

export async function getAdminWorkspaces() {
  await delay(LATENCY)
  return mockWorkspaces
}

export async function getAdminWorkspace(workspaceId: string) {
  await delay(LATENCY)
  const workspace = mockWorkspaces.find((w) => w.id === workspaceId)
  if (!workspace) throw new Error("Workspace not found")
  return {
    workspace,
    projects: mockProjects.filter((p) => p.workspaceId === workspaceId),
    members: mockUsers,
  }
}

export async function getAdminProjects() {
  await delay(LATENCY)
  return mockProjects
}

export async function getAdminPlans() {
  await delay(LATENCY)
  return mockPlans
}

export async function getAdminPayments() {
  await delay(LATENCY)
  return mockPayments
}

export async function getAdminLogs() {
  await delay(LATENCY)
  return mockSystemLogs
}

export async function getAdminReports() {
  await delay(LATENCY)
  return {
    activeUsers: [
      { month: "بهمن", count: 120 },
      { month: "اسفند", count: 145 },
      { month: "فروردین", count: 160 },
      { month: "اردیبهشت", count: 190 },
      { month: "خرداد", count: 210 },
      { month: "تیر", count: 240 },
    ],
    workspaceGrowth: [
      { month: "بهمن", count: 20 },
      { month: "اسفند", count: 28 },
      { month: "فروردین", count: 35 },
      { month: "اردیبهشت", count: 42 },
      { month: "خرداد", count: 50 },
      { month: "تیر", count: 58 },
    ],
    errors: [
      { day: "دوشنبه", count: 2 },
      { day: "سه‌شنبه", count: 1 },
      { day: "چهارشنبه", count: 4 },
      { day: "پنج‌شنبه", count: 0 },
      { day: "جمعه", count: 3 },
      { day: "شنبه", count: 1 },
      { day: "یکشنبه", count: 0 },
    ],
  }
}
