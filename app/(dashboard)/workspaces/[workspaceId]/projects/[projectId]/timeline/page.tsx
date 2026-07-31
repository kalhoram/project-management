"use client"

import { useParams } from "next/navigation"
import { TimelineView } from "@/components/features/timeline/timeline-view"
import { ProjectViewShell } from "@/components/features/projects/project-view-shell"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { useTasks, useProject } from "@/hooks/queries"

export default function TimelinePage() {
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
        title="خط زمانی"
        description="نمای افقی برنامه"
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
      title="خط زمانی"
      description="نوارهای افقی، نقاط عطف و تأخیرها"
      isError={isError}
      isEmpty={schedulable.length === 0}
      emptyTitle="داده خط زمانی نیست"
      emptyDescription="تاریخ شروع و مهلت به وظایف اضافه کنید تا در خط زمانی نمایش داده شوند."
      onRetry={() => {
        tasks.refetch()
        project.refetch()
      }}
      fullWidth
    >
      <TimelineView tasks={tasks.data ?? []} memberIds={project.data?.memberIds} />
    </ProjectViewShell>
  )
}
