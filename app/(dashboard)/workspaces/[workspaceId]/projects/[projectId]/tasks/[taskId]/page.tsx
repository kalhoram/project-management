"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Calendar,
  Edit,
  GitBranch,
  History,
  Paperclip,
  RefreshCw,
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { StatusBadge } from "@/components/common/status-badge"
import { PriorityBadge } from "@/components/common/priority-badge"
import { CommentThread } from "@/components/features/tasks/comment-thread"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useTask, useTaskComments, useLabels, useProject, useWorkspace, useTasks, useProjectActivities, useCurrentUser } from "@/hooks/queries"
import * as fileService from "@/lib/api/file.service"
import { useQuery } from "@tanstack/react-query"
import {
  formatFileSize,
  getChecklistProgress,
  getUserById,
  isTaskOverdue,
} from "@/lib/task-utils"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function TaskDetailsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const taskId = params.taskId as string

  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const task = useTask(taskId)
  const comments = useTaskComments(taskId)
  const labelsQuery = useLabels(workspaceId)
  const projectTasks = useTasks(projectId)
  const activitiesQuery = useProjectActivities(workspaceId, projectId)
  const currentUser = useCurrentUser()
  const filesQuery = useQuery({
    queryKey: ["task-files", taskId],
    queryFn: () => fileService.getTaskFiles(taskId),
    enabled: !!taskId,
  })

  const isLoading =
    workspace.isLoading || project.isLoading || task.isLoading || comments.isLoading
  const isError = task.isError || project.isError

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (isError || !task.data || !project.data) {
    return (
      <DashboardShell>
        <ErrorState
          message="بارگذاری جزئیات وظیفه ممکن نشد."
          onRetry={() => {
            task.refetch()
            project.refetch()
          }}
        />
      </DashboardShell>
    )
  }

  const t = task.data
  const assignee = t.assigneeId ? getUserById(t.assigneeId) : undefined
  const reporter = getUserById(t.reporterId)
  const taskLabels = (labelsQuery.data ?? []).filter((l) => t.labelIds.includes(l.id))
  const checklist = getChecklistProgress(t)
  const attachments = filesQuery.data ?? []
  const activities = (activitiesQuery.data ?? []).filter(
    (a) => a.entityType === "task" && a.entityId === t.id
  )
  const projectTaskList = projectTasks.data ?? []
  const blockedBy = t.blockedByIds
    .map((id) => projectTaskList.find((task) => task.id === id))
    .filter(Boolean)
  const blocking = t.blockingIds
    .map((id) => projectTaskList.find((task) => task.id === id))
    .filter(Boolean)

  return (
    <DashboardShell>
      <PageHeader
        title={t.title}
        description={t.key}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          {
            label: project.data.name,
            href: `/workspaces/${workspaceId}/projects/${projectId}`,
          },
          { label: t.key },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/edit`}>
              <Edit className="h-4 w-4" />
              ویرایش وظیفه
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={t.status} />
        <PriorityBadge priority={t.priority} />
        {t.isRecurring ? (
          <Badge variant="info" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            تکرارشونده
          </Badge>
        ) : null}
        {isTaskOverdue(t) ? <Badge variant="destructive">سررسید گذشته</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">توضیحات</CardTitle>
            </CardHeader>
            <CardContent>
              {t.description ? (
                <p className="text-sm whitespace-pre-wrap">{t.description}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">توضیحی ثبت نشده.</p>
              )}
            </CardContent>
          </Card>

          {t.checklist.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  چک‌لیست
                  <span className="text-sm font-normal text-muted-foreground">
                    {checklist.completed}/{checklist.total}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={(checklist.completed / checklist.total) * 100} className="h-2" />
                <ul className="space-y-2">
                  {t.checklist.map((item) => {
                    const itemAssignee = item.assigneeId
                      ? getUserById(item.assigneeId)
                      : undefined
                    return (
                      <li key={item.id} className="flex items-start gap-3">
                        <Checkbox checked={item.completed} disabled className="mt-0.5" />
                        <div className="flex-1">
                          <span
                            className={cn(
                              "text-sm",
                              item.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {item.title}
                          </span>
                          {itemAssignee ? (
                            <p className="text-xs text-muted-foreground">{itemAssignee.name}</p>
                          ) : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">نظرات</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentThread
                comments={comments.data ?? []}
                currentUserId={currentUser.data?.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4" />
                پیوست‌ها ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">پیوستی نیست.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {attachments.map((file) => {
                    const uploader = getUserById(file.uploadedById)
                    return (
                      <li
                        key={file.id}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {uploader?.name} · v{file.version}
                          </p>
                        </div>
                        <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">جزئیات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">مسئول</span>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      {assignee.avatarUrl ? (
                        <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {initials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    {assignee.name}
                  </div>
                ) : (
                  <span>بدون مسئول</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">گزارش‌دهنده</span>
                <span>{reporter?.name ?? "—"}</span>
              </div>
              {t.startDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">شروع</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(t.startDate)}
                  </span>
                </div>
              ) : null}
              {t.dueDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مهلت</span>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      isTaskOverdue(t) && "font-medium text-destructive"
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(t.dueDate)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">پیشرفت</span>
                <span>{t.progress}%</span>
              </div>
              {t.storyPoints !== undefined ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">امتیاز داستان</span>
                  <span>{t.storyPoints}</span>
                </div>
              ) : null}
              {taskLabels.length > 0 ? (
                <div>
                  <span className="text-muted-foreground">برچسب‌ها</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {taskLabels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="outline"
                        style={{
                          borderColor: label.color,
                          color: label.color,
                          backgroundColor: `${label.color}15`,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {(blockedBy.length > 0 || blocking.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-4 w-4" />
                  وابستگی‌ها
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {blockedBy.length > 0 ? (
                  <div>
                    <p className="mb-2 text-muted-foreground">مسدود شده توسط</p>
                    <ul className="space-y-1">
                      {blockedBy.map(
                        (dep) =>
                          dep && (
                            <li key={dep.id}>
                              <Link
                                href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/${dep.id}`}
                                className="hover:text-primary"
                              >
                                {dep.key} {dep.title}
                              </Link>
                            </li>
                          )
                      )}
                    </ul>
                  </div>
                ) : null}
                {blocking.length > 0 ? (
                  <div>
                    <p className="mb-2 text-muted-foreground">مسدودکننده</p>
                    <ul className="space-y-1">
                      {blocking.map(
                        (dep) =>
                          dep && (
                            <li key={dep.id}>
                              <Link
                                href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/${dep.id}`}
                                className="hover:text-primary"
                              >
                                {dep.key} {dep.title}
                              </Link>
                            </li>
                          )
                      )}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {t.isRecurring ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-4 w-4" />
                  تکرارشونده
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>این وظیفه طبق برنامه تکرار می‌شود. قوانین تکرار را در تنظیمات وظیفه ویرایش کنید.</p>
                <Button variant="outline" size="sm" className="mt-3" disabled>
                  پیکربندی برنامه
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                تاریخچه
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">فعالیتی ثبت نشده.</p>
              ) : (
                <ul className="space-y-3">
                  {activities.map((act) => {
                    const actor = getUserById(act.actorId)
                    return (
                      <li key={act.id} className="text-sm">
                        <p>
                          <span className="font-medium">{actor?.name ?? "کسی"}</span>{" "}
                          <span className="text-muted-foreground">{act.action}</span>{" "}
                          {act.entityName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(act.createdAt, "MMM d, yyyy h:mm a")}
                        </p>
                        {act.metadata ? (
                          <p className="text-xs text-muted-foreground">
                            {Object.entries(act.metadata)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                        <Separator className="mt-3" />
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
