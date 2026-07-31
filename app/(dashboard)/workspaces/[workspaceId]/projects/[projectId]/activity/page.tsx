"use client"

import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { ActivityFeed } from "@/components/common/activity-feed"
import { ProjectTabs } from "@/components/features/projects/project-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useProject, useProjectActivities, useWorkspace } from "@/hooks/queries"

export default function ProjectActivityPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const activities = useProjectActivities(workspaceId, projectId)

  if (workspace.isLoading || project.isLoading || activities.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (project.isError || !project.data) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => project.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title={project.data.name}
        description="تاریخچه تغییرات پروژه"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: project.data.key, href: `/workspaces/${workspaceId}/projects/${projectId}` },
          { label: "فعالیت" },
        ]}
        actions={<ExportMenu entityName="فعالیت‌ها" />}
      />
      <ProjectTabs workspaceId={workspaceId} projectId={projectId} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">همه فعالیت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activities.data ?? []} />
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
