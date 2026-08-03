"use client"

import { useParams } from "next/navigation"
import { KanbanBoard } from "@/components/features/kanban/kanban-board"
import { ProjectViewShell } from "@/components/features/projects/project-view-shell"
import { KanbanSkeleton } from "@/components/common/loading-skeleton"
import { useKanbanColumns, useTasks, useLabels } from "@/hooks/queries"

export default function KanbanPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string

  const columns = useKanbanColumns(projectId)
  const tasks = useTasks(projectId)
  const labels = useLabels(workspaceId)

  const isLoading = columns.isLoading || tasks.isLoading || labels.isLoading
  const isError = columns.isError || tasks.isError

  if (isLoading) {
    return (
      <ProjectViewShell
        workspaceId={workspaceId}
        projectId={projectId}
        title="برد کانبان"
        description="گردش کار با کشیدن و رها کردن"
        isLoading
        fullWidth
      >
        <KanbanSkeleton />
      </ProjectViewShell>
    )
  }

  return (
    <ProjectViewShell
      workspaceId={workspaceId}
      projectId={projectId}
      title="برد کانبان"
      description="گردش کار با کشیدن و رها کردن"
      isError={isError}
      isEmpty={(tasks.data ?? []).length === 0}
      emptyTitle="برد خالی است"
      emptyDescription="اولین وظیفه را اضافه کنید تا برد کانبان پر شود."
      onRetry={() => {
        columns.refetch()
        tasks.refetch()
      }}
      fullWidth
    >
      <KanbanBoard
        projectId={projectId}
        workspaceId={workspaceId}
        columns={columns.data ?? []}
        tasks={tasks.data ?? []}
        labels={labels.data ?? []}
      />
    </ProjectViewShell>
  )
}
