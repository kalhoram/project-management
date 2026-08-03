import { apiRequest } from "@/lib/api/client"
import type { AdminDashboard } from "@/lib/api/types"
import type { Payment, Plan, Project, User, Workspace } from "@/lib/types"
import type { Activity, SystemLog } from "@/lib/types"

export async function getAdminDashboard(): Promise<AdminDashboard> {
  return apiRequest<AdminDashboard>("/admin/dashboard")
}

export async function getAdminUsers(): Promise<User[]> {
  return apiRequest<User[]>("/admin/users")
}

export async function getAdminUser(userId: string): Promise<{
  user: User
  workspaces: Workspace[]
  projects: Project[]
}> {
  return apiRequest(`/admin/users/${userId}`)
}

export async function getAdminWorkspaces(): Promise<Workspace[]> {
  return apiRequest<Workspace[]>("/admin/workspaces")
}

export async function getAdminWorkspace(workspaceId: string): Promise<{
  workspace: Workspace
  projects: Project[]
  members: User[]
}> {
  return apiRequest(`/admin/workspaces/${workspaceId}`)
}

export async function getAdminProjects(): Promise<Project[]> {
  return apiRequest<Project[]>("/admin/projects")
}

export async function getAdminPlans(): Promise<Plan[]> {
  return apiRequest<Plan[]>("/admin/plans")
}

export async function getAdminPayments(): Promise<Payment[]> {
  return apiRequest<Payment[]>("/admin/payments")
}

export async function getAdminLogs(): Promise<SystemLog[]> {
  return apiRequest<SystemLog[]>("/admin/logs")
}

export async function getAdminReports(): Promise<{
  activeUsers: Array<{ month: string; count: number }>
  workspaceGrowth: Array<{ month: string; count: number }>
  errors: Array<{ day: string; count: number }>
}> {
  return apiRequest("/admin/reports")
}
