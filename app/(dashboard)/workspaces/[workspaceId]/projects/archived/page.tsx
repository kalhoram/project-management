"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Archive, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { CardGridSkeleton } from "@/components/common/loading-skeleton"
import { ProjectCard } from "@/components/features/projects/project-card"
import { Button } from "@/components/ui/button"
import { useArchivedProjects, useWorkspace } from "@/hooks/queries"

export default function ArchivedProjectsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const projects = useArchivedProjects(workspaceId)

  if (projects.isLoading) {
    return (
      <DashboardShell>
        <PageHeader title="پروژه‌های بایگانی‌شده" />
        <CardGridSkeleton count={3} />
      </DashboardShell>
    )
  }

  if (projects.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری پروژه‌های بایگانی ممکن نشد." onRetry={() => projects.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="پروژه‌های بایگانی‌شده"
        description="پروژه‌هایی که بایگانی شده‌اند"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          { label: "بایگانی" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/workspaces/${workspaceId}/projects`}>بازگشت به پروژه‌ها</Link>
          </Button>
        }
      />

      {(projects.data ?? []).length === 0 ? (
        <EmptyState
          icon={Archive}
          title="پروژه بایگانی‌شده‌ای نیست"
          description="وقتی پروژه‌ای را بایگانی کنید، اینجا نمایش داده می‌شود."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(projects.data ?? []).map((project) => (
            <div key={project.id} className="relative">
              <ProjectCard project={project} workspaceId={workspaceId} />
              <Button
                variant="outline"
                size="sm"
                className="absolute right-3 top-3"
                onClick={() => toast.success(`«${project.name}» بازیابی شد`)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                بازیابی
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
