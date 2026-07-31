"use client"

import { useParams } from "next/navigation"
import { GanttView } from "@/components/features/gantt/gantt-view"
import { ProjectViewShell } from "@/components/features/projects/project-view-shell"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { useTasks, useProject } from "@/hooks/queries"

export default function GanttPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string

  const project = useProject(projectId)
  const tasks = useTasks(projectId)

  const isLoading = tasks.isLoading || project.isLoading
  const isError = tasks.isError || project.isError
  const schedulable = (tasks.data ?? []).filter((t) => t.startDate || t.dueDate)

  if (isLoading) {
    return (
      <ProjectViewShell
        workspaceId={workspaceId}
        projectId={projectId}
        title="نمودار گانت"
        description="وابستگی وظایف و مسیر بحرانی"
        isLoading
        fullWidth
      >
        <PageSkeleton />
      </ProjectViewShell>
    )
  }

  return (
    <ProjectViewShell
      workspaceId={workspaceId}
      projectId={projectId}
      title="نمودار گانت"
      description="ردیف وظایف، نوارها، وابستگی‌ها و مسیر بحرانی"
      isError={isError}
      isEmpty={schedulable.length === 0}
      emptyTitle="داده گانت نیست"
      emptyDescription="تاریخ و وابستگی اضافه کنید تا نمودار گانت نمایش داده شود."
      onRetry={() => {
        tasks.refetch()
        project.refetch()
      }}
      fullWidth
    >
      <GanttView tasks={tasks.data ?? []} memberIds={project.data?.memberIds} />
    </ProjectViewShell>
  )
}
