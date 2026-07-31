import { delay } from "@/lib/utils"
import {
  mockWorkspaces,
  mockTeams,
  mockRoles,
  mockPermissions,
  mockUsers,
} from "@/lib/mock/data"
import type { Workspace, Team, Role, Permission, User } from "@/lib/types"

const LATENCY = 300

export async function getWorkspaces(): Promise<Workspace[]> {
  await delay(LATENCY)
  return mockWorkspaces
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  await delay(LATENCY)
  const workspace = mockWorkspaces.find((w) => w.id === workspaceId)
  if (!workspace) throw new Error("Workspace not found")
  return workspace
}

export async function getWorkspaceMembers(workspaceId: string): Promise<User[]> {
  await delay(LATENCY)
  void workspaceId
  return mockUsers
}

export async function getWorkspaceTeams(workspaceId: string): Promise<Team[]> {
  await delay(LATENCY)
  return mockTeams.filter((t) => t.workspaceId === workspaceId)
}

export async function getWorkspaceRoles(workspaceId: string): Promise<Role[]> {
  await delay(LATENCY)
  return mockRoles.filter((r) => r.workspaceId === workspaceId)
}

export async function getPermissions(): Promise<Permission[]> {
  await delay(LATENCY)
  return mockPermissions
}

export async function updateWorkspace(
  workspaceId: string,
  data: Partial<Workspace>
): Promise<Workspace> {
  await delay(LATENCY)
  const workspace = await getWorkspace(workspaceId)
  return { ...workspace, ...data }
}
