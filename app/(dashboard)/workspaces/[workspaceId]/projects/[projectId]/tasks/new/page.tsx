"use client"

import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { TaskForm, type TaskFormValues } from "@/components/features/tasks/task-form"
import { Card, CardContent } from "@/components/ui/card"
import {
  useCreateTask,
  useLabels,
  useProject,
  useWorkspace,
} from "@/hooks/queries"

export default function NewTaskPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string

  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const labels = useLabels()
  const createTask = useCreateTask()

  const isLoading = workspace.isLoading || project.isLoading || labels.isLoading

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (project.isError || !project.data) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری پروژه ممکن نشد." onRetry={() => project.refetch()} />
      </DashboardShell>
    )
  }

  async function handleSubmit(values: TaskFormValues) {
    try {
      const task = await createTask.mutateAsync({
        projectId,
        data: {
          ...values,
          workspaceId,
          reporterId: "user-1",
          labelIds: values.labelIds ?? [],
          assigneeId: values.assigneeId || undefined,
        },
      })
      toast.success("وظیفه ایجاد شد")
      router.push(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}`
      )
    } catch {
      toast.error("ایجاد وظیفه ناموفق بود")
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="ایجاد وظیفه"
        description="افزودن وظیفه به این پروژه"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          {
            label: project.data.name,
            href: `/workspaces/${workspaceId}/projects/${projectId}`,
          },
          { label: "وظیفه جدید" },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          <TaskForm
            labels={labels.data ?? []}
            memberIds={project.data.memberIds}
            submitLabel="ایجاد وظیفه"
            loading={createTask.isPending}
            onSubmit={handleSubmit}
            onCancel={() =>
              router.push(`/workspaces/${workspaceId}/projects/${projectId}`)
            }
          />
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
