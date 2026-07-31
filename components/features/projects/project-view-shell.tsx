"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import type { ReactNode } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState } from "@/components/common/error-state"
import { EmptyState } from "@/components/common/empty-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { ProjectTabs } from "@/components/features/projects/project-tabs"
import { TaskDrawer } from "@/components/features/tasks/task-drawer"
import { Button } from "@/components/ui/button"
import { useProject, useWorkspace } from "@/hooks/queries"

interface ProjectViewShellProps {
  workspaceId: string
  projectId: string
  title: string
  description?: string
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onRetry?: () => void
  showTabs?: boolean
  showTaskDrawer?: boolean
  fullWidth?: boolean
  actions?: ReactNode
  children?: ReactNode
}

export function ProjectViewShell({
  workspaceId,
  projectId,
  title,
  description,
  isLoading,
  isError,
  isEmpty,
  emptyTitle = "هنوز وظیفه‌ای نیست",
  emptyDescription = "یک وظیفه بسازید تا روی این پروژه کار را شروع کنید.",
  onRetry,
  showTabs = true,
  showTaskDrawer = true,
  fullWidth = false,
  actions,
  children,
}: ProjectViewShellProps) {
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)

  if (isLoading || project.isLoading || workspace.isLoading) {
    return (
      <DashboardShell fullWidth={fullWidth}>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (isError || project.isError || !project.data) {
    return (
      <DashboardShell fullWidth={fullWidth}>
        <ErrorState
          message="بارگذاری این نمای پروژه ممکن نشد."
          onRetry={
            onRetry ??
            (() => {
              project.refetch()
              workspace.refetch()
            })
          }
        />
      </DashboardShell>
    )
  }

  const defaultActions = (
    <Button asChild>
      <Link href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/new`}>
        <Plus className="h-4 w-4" />
        وظیفه جدید
      </Link>
    </Button>
  )

  return (
    <DashboardShell fullWidth={fullWidth}>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          {
            label: project.data.name,
            href: `/workspaces/${workspaceId}/projects/${projectId}`,
          },
          { label: title },
        ]}
        actions={actions ?? defaultActions}
      />

      {showTabs ? <ProjectTabs workspaceId={workspaceId} projectId={projectId} /> : null}

      {isEmpty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel="ایجاد وظیفه"
          onAction={() => {
            window.location.href = `/workspaces/${workspaceId}/projects/${projectId}/tasks/new`
          }}
        />
      ) : (
        children
      )}

      {showTaskDrawer ? (
        <TaskDrawer workspaceId={workspaceId} projectId={projectId} />
      ) : null}
    </DashboardShell>
  )
}
