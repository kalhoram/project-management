"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { CardGridSkeleton } from "@/components/common/loading-skeleton"
import { ProjectCard } from "@/components/features/projects/project-card"
import { Button } from "@/components/ui/button"
import { useDeletedProjects, useWorkspace } from "@/hooks/queries"
import { useState } from "react"

export default function DeletedProjectsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const projects = useDeletedProjects(workspaceId)
  const [purgeId, setPurgeId] = useState<string | null>(null)

  if (projects.isLoading) {
    return (
      <DashboardShell>
        <PageHeader title="پروژه‌های حذف‌شده" />
        <CardGridSkeleton count={3} />
      </DashboardShell>
    )
  }

  if (projects.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری پروژه‌های حذف‌شده ممکن نشد." onRetry={() => projects.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="پروژه‌های حذف‌شده"
        description="پروژه‌ها در سطل زباله — پس از ۳۰ روز برای همیشه حذف می‌شوند"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          { label: "حذف‌شده" },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/workspaces/${workspaceId}/projects`}>بازگشت به پروژه‌ها</Link>
          </Button>
        }
      />

      {(projects.data ?? []).length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="سطل زباله خالی است"
          description="پروژه‌های حذف‌شده تا ۳۰ روز اینجا نمایش داده می‌شوند."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(projects.data ?? []).map((project) => (
            <div key={project.id} className="relative">
              <ProjectCard project={project} workspaceId={workspaceId} />
              <div className="absolute right-3 top-3 flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success(`«${project.name}» بازیابی شد`)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  بازیابی
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setPurgeId(project.id)}
                >
                  حذف دائم
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!purgeId}
        onOpenChange={(open) => !open && setPurgeId(null)}
        title="حذف دائمی پروژه"
        description="این عمل قابل بازگشت نیست. همه وظایف و فایل‌ها از بین می‌روند."
        confirmLabel="حذف برای همیشه"
        variant="destructive"
        onConfirm={() => {
          toast.success("پروژه برای همیشه حذف شد")
          setPurgeId(null)
        }}
      />
    </DashboardShell>
  )
}
