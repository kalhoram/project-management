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
  useLabels,
  useProject,
  useTask,
  useUpdateTask,
  useWorkspace,
} from "@/hooks/queries"

export default function EditTaskPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const taskId = params.taskId as string

  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const task = useTask(taskId)
  const labels = useLabels(workspaceId)
  const updateTask = useUpdateTask()

  const isLoading =
    workspace.isLoading || project.isLoading || task.isLoading || labels.isLoading

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (task.isError || project.isError || !task.data || !project.data) {
    return (
      <DashboardShell>
        <ErrorState
          message="بارگذاری وظیفه ممکن نشد."
          onRetry={() => {
            task.refetch()
            project.refetch()
          }}
        />
      </DashboardShell>
    )
  }

  const t = task.data

  async function handleSubmit(values: TaskFormValues) {
    try {
      await updateTask.mutateAsync({
        taskId,
        data: {
          ...values,
          assigneeId: values.assigneeId || undefined,
          labelIds: values.labelIds ?? [],
        },
      })
      toast.success("وظیفه به‌روزرسانی شد")
      router.push(
        `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`
      )
    } catch {
      toast.error("به‌روزرسانی وظیفه ناموفق بود")
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="ویرایش وظیفه"
        description={t.key}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          {
            label: project.data.name,
            href: `/workspaces/${workspaceId}/projects/${projectId}`,
          },
          {
            label: t.key,
            href: `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
          },
          { label: "ویرایش" },
        ]}
      />

      <Card>
        <CardContent className="pt-6">
          <TaskForm
            defaultValues={{
              title: t.title,
              description: t.description ?? "",
              status: t.status,
              priority: t.priority,
              assigneeId: t.assigneeId ?? "",
              startDate: t.startDate ?? "",
              dueDate: t.dueDate ?? "",
              estimateHours: t.estimateHours,
              storyPoints: t.storyPoints,
              labelIds: t.labelIds,
            }}
            labels={labels.data ?? []}
            memberIds={project.data.memberIds}
            submitLabel="ذخیره تغییرات"
            loading={updateTask.isPending}
            onSubmit={handleSubmit}
            onCancel={() =>
              router.push(
                `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`
              )
            }
          />
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
