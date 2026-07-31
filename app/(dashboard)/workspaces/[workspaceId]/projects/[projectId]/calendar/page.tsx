"use client"

import { useParams } from "next/navigation"
import { CalendarView } from "@/components/features/calendar/calendar-view"
import { ProjectViewShell } from "@/components/features/projects/project-view-shell"
import { CalendarSkeleton } from "@/components/common/loading-skeleton"
import { useTasks, useProject } from "@/hooks/queries"

export default function CalendarPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string

  const project = useProject(projectId)
  const tasks = useTasks(projectId)

  const isLoading = tasks.isLoading || project.isLoading
  const isError = tasks.isError || project.isError
  const tasksWithDates = (tasks.data ?? []).filter((t) => t.dueDate)

  if (isLoading) {
    return (
      <ProjectViewShell
        workspaceId={workspaceId}
        projectId={projectId}
        title="تقویم"
        description="مهلت‌ها و برنامه"
        isLoading
        fullWidth
      >
        <CalendarSkeleton />
      </ProjectViewShell>
    )
  }

  return (
    <ProjectViewShell
      workspaceId={workspaceId}
      projectId={projectId}
      title="تقویم"
      description="مهلت‌ها و برنامه"
      isError={isError}
      isEmpty={tasksWithDates.length === 0}
      emptyTitle="وظیفه زمان‌بندی‌شده‌ای نیست"
      emptyDescription="وظایف دارای مهلت در تقویم نمایش داده می‌شوند."
      onRetry={() => {
        tasks.refetch()
        project.refetch()
      }}
      fullWidth
    >
      <CalendarView tasks={tasks.data ?? []} memberIds={project.data?.memberIds} />
    </ProjectViewShell>
  )
}
