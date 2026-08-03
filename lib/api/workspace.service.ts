import { apiRequest } from "@/lib/api/client"
import { mapWorkspaceMember, type WorkspaceMemberApiRow, type WorkspaceMemberView } from "@/lib/api/mappers"
import type { Workspace, Team, Role, Permission, User } from "@/lib/types"

export async function getWorkspaces(): Promise<Workspace[]> {
  return apiRequest<Workspace[]>("/workspaces")
}

export async function createWorkspace(data: {
  name: string
  slug?: string
  description?: string
}): Promise<Workspace> {
  return apiRequest<Workspace>("/workspaces", {
    method: "POST",
    body: data,
  })
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  return apiRequest<Workspace>(`/workspaces/${workspaceId}`)
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberView[]> {
  const rows = await apiRequest<WorkspaceMemberApiRow[]>(`/workspaces/${workspaceId}/members`)
  return rows.map(mapWorkspaceMember)
}

export async function getWorkspaceTeams(workspaceId: string): Promise<Team[]> {
  return apiRequest<Team[]>(`/workspaces/${workspaceId}/teams`)
}

export async function getWorkspaceRoles(workspaceId: string): Promise<Role[]> {
  return apiRequest<Role[]>(`/workspaces/${workspaceId}/roles`)
}

export async function getPermissions(): Promise<Permission[]> {
  return apiRequest<Permission[]>("/permissions")
}

export async function updateWorkspace(
  workspaceId: string,
  data: Partial<Workspace>
): Promise<Workspace> {
  return apiRequest<Workspace>(`/workspaces/${workspaceId}`, {
    method: "PATCH",
    body: {
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl,
      description: data.description,
      industry: data.industry,
      companySize: data.companySize,
      timezone: data.timezone,
      defaultVisibility: data.defaultVisibility,
    },
  })
}
