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
  projectToFormValues,
  type ProjectFormValues,
} from "@/components/features/projects/project-form"
import {
  useProject,
  useProjectCategories,
  useUpdateProject,
  useWorkspace,
} from "@/hooks/queries"

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const categories = useProjectCategories(workspaceId)
  const updateProject = useUpdateProject()

  async function handleSubmit(values: ProjectFormValues) {
    try {
      await updateProject.mutateAsync({
        projectId,
        data: {
          name: values.name,
          key: values.key,
          description: values.description,
          visibility: values.visibility,
          categoryId: values.categoryId,
          templateId: values.templateId,
          startDate: values.startDate || undefined,
          dueDate: values.dueDate || undefined,
        },
      })
      toast.success("پروژه به‌روزرسانی شد")
      router.push(`/workspaces/${workspaceId}/projects/${projectId}`)
    } catch {
      toast.error("به‌روزرسانی پروژه ناموفق بود")
    }
  }

  if (workspace.isLoading || project.isLoading || categories.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (project.isError || workspace.isError) {
    return (
      <DashboardShell>
        <ErrorState
          message="بارگذاری پروژه ممکن نشد."
          onRetry={() => {
            project.refetch()
            workspace.refetch()
          }}
        />
      </DashboardShell>
    )
  }

  const p = project.data!

  return (
    <DashboardShell>
      <PageHeader
        title="ویرایش پروژه"
        description={`به‌روزرسانی تنظیمات ${p.name}`}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          { label: p.name, href: `/workspaces/${workspaceId}/projects/${projectId}` },
          { label: "ویرایش" },
        ]}
      />

      <ProjectForm
        defaultValues={projectToFormValues(p)}
        categories={categories.data ?? []}
        submitLabel="ذخیره تغییرات"
        loading={updateProject.isPending}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/workspaces/${workspaceId}/projects/${projectId}`)}
      />
    </DashboardShell>
  )
}
