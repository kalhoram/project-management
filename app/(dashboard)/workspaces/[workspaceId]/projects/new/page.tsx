"use client"

import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import {
  ProjectForm,
  type ProjectFormValues,
} from "@/components/features/projects/project-form"
import {
  useCreateProject,
  useProjectCategories,
  useWorkspace,
} from "@/hooks/queries"
import { AccessDeniedCard, RequirePermission } from "@/components/common/require-permission"

export default function NewProjectPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const categories = useProjectCategories(workspaceId)
  const createProject = useCreateProject()

  async function handleSubmit(values: ProjectFormValues) {
    try {
      const project = await createProject.mutateAsync({
        workspaceId,
        data: {
          name: values.name,
          key: values.key,
          description: values.description,
          visibility: values.visibility,
          categoryId: values.categoryId,
          templateId: values.templateId,
          startDate: values.startDate || undefined,
          dueDate: values.dueDate || undefined,
          ownerId: "user-1",
          memberIds: ["user-1"],
        },
      })
      toast.success("پروژه ایجاد شد")
      router.push(`/workspaces/${workspaceId}/projects/${project.id}`)
    } catch {
      toast.error("ایجاد پروژه ناموفق بود")
    }
  }

  if (workspace.isLoading || categories.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (workspace.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری فضای کاری ممکن نشد." onRetry={() => workspace.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <RequirePermission
        permission="projects.create"
        fallback={
          <AccessDeniedCard
            title="ایجاد پروژه مجاز نیست"
            description="نقش شما اجازه ساخت پروژه جدید را ندارد."
          />
        }
      >
      <PageHeader
        title="پروژه جدید"
        description="ایجاد پروژه جدید در این فضای کاری"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          { label: "جدید" },
        ]}
      />

      <ProjectForm
        categories={categories.data ?? []}
        loading={createProject.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/workspaces/${workspaceId}/projects`)}
      />
      </RequirePermission>
    </DashboardShell>
  )
}
