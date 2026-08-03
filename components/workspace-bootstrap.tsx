"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { useWorkspaces, useProjects } from "@/hooks/queries"
import { useWorkspaceStore } from "@/stores/ui-store"
import { useAuth } from "@/components/auth-provider"
import { selectProject, selectWorkspace, isValidUuid } from "@/lib/workspace-bootstrap"

/**
 * Synchronizes persisted workspace/project selection with backend data.
 * Clears stale IDs and prevents cross-account leakage on logout via auth clear.
 */
export function WorkspaceBootstrap() {
  const { status } = useAuth()
  const pathname = usePathname()
  const {
    currentWorkspaceId,
    currentProjectId,
    setCurrentWorkspaceId,
    setCurrentProjectId,
    clearWorkspaceContext,
  } = useWorkspaceStore()

  const routeWorkspaceMatch = pathname.match(/\/workspaces\/([^/]+)/)
  const routeProjectMatch = pathname.match(/\/projects\/([^/]+)/)
  const routeWorkspaceId = routeWorkspaceMatch?.[1]
  const routeProjectId = routeProjectMatch?.[1]

  const { data: workspaces } = useWorkspaces()
  const activeWorkspaceId =
    routeWorkspaceId && isValidUuid(routeWorkspaceId)
      ? routeWorkspaceId
      : currentWorkspaceId && isValidUuid(currentWorkspaceId)
        ? currentWorkspaceId
        : null

  const { data: projects } = useProjects(activeWorkspaceId ?? "")

  const prevAuthStatus = useRef(status)

  useEffect(() => {
    if (prevAuthStatus.current === "authenticated" && status === "unauthenticated") {
      clearWorkspaceContext()
    }
    prevAuthStatus.current = status
  }, [status, clearWorkspaceContext])

  useEffect(() => {
    if (status !== "authenticated" || !workspaces) return

    if (workspaces.length === 0) {
      if (currentWorkspaceId) setCurrentWorkspaceId(null)
      return
    }

    const fromRoute =
      routeWorkspaceId && isValidUuid(routeWorkspaceId) && workspaces.some((w) => w.id === routeWorkspaceId)
        ? routeWorkspaceId
        : null

    const nextWorkspaceId = fromRoute ?? selectWorkspace(workspaces, currentWorkspaceId)

    if (nextWorkspaceId && nextWorkspaceId !== currentWorkspaceId) {
      setCurrentWorkspaceId(nextWorkspaceId)
    } else if (!nextWorkspaceId && currentWorkspaceId) {
      setCurrentWorkspaceId(null)
    }
  }, [
    status,
    workspaces,
    currentWorkspaceId,
    routeWorkspaceId,
    setCurrentWorkspaceId,
  ])

  useEffect(() => {
    if (status !== "authenticated" || !projects || !activeWorkspaceId) return

    const fromRoute =
      routeProjectId && isValidUuid(routeProjectId) && projects.some((p) => p.id === routeProjectId)
        ? routeProjectId
        : null

    const nextProjectId = fromRoute ?? selectProject(projects, currentProjectId)

    if (nextProjectId !== currentProjectId) {
      setCurrentProjectId(nextProjectId)
    }
  }, [
    status,
    projects,
    activeWorkspaceId,
    currentProjectId,
    routeProjectId,
    setCurrentProjectId,
  ])

  return null
}
