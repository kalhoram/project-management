"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Calendar, Edit, FolderKanban, Users } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { StatusBadge } from "@/components/common/status-badge"
import { MemberAvatarGroup } from "@/components/common/member-avatar-group"
import { ProjectTabs } from "@/components/features/projects/project-tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useProject, useProjectCategories, useTasks, useWorkspace } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"
import { VISIBILITY_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

export default function ProjectDetailsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const tasks = useTasks(projectId)
  const categories = useProjectCategories(workspaceId)

  const isLoading = workspace.isLoading || project.isLoading || tasks.isLoading
  const isError = project.isError || workspace.isError

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (isError || !project.data) {
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

  const p = project.data
  const category = (categories.data ?? []).find((c) => c.id === p.categoryId)
  const owner = lookupUser(p.ownerId)
  const openTasks = (tasks.data ?? []).filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ).length
  const blockedTasks = (tasks.data ?? []).filter((t) => t.status === "blocked").length

  return (
    <DashboardShell>
      <PageHeader
        title={p.name}
        description={p.description ?? "نمای کلی پروژه"}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          { label: p.key },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/workspaces/${workspaceId}/projects/${projectId}/members`}>
                <Users className="h-4 w-4" />
                اعضا
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/workspaces/${workspaceId}/projects/${projectId}/edit`}>
                <Edit className="h-4 w-4" />
                ویرایش
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/workspaces/${workspaceId}/projects/${projectId}/kanban`}>
                باز کردن برد
              </Link>
            </Button>
          </div>
        }
      />

      <ProjectTabs workspaceId={workspaceId} projectId={projectId} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge status={p.status} />
        <Badge variant="outline">{VISIBILITY_LABELS[p.visibility] ?? p.visibility}</Badge>
        {category ? (
          <Badge variant="secondary" style={{ borderColor: category.color }}>
            {category.name}
          </Badge>
        ) : null}
        <span className="text-sm text-muted-foreground">کلید: {p.key}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: "پیشرفت", value: `${p.progress}%`, icon: FolderKanban },
          { label: "وظایف باز", value: openTasks, icon: FolderKanban },
          { label: "مسدود", value: blockedTasks, icon: FolderKanban },
          { label: "اعضا", value: p.memberIds.length, icon: Users },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نمای کلی پیشرفت</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {p.completedTaskCount} از {p.taskCount} وظیفه تکمیل شده
                </span>
                <span className="font-medium">{p.progress}%</span>
              </div>
              <Progress value={p.progress} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">وظایف اخیر</CardTitle>
            </CardHeader>
            <CardContent>
              {(tasks.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">هنوز وظیفه‌ای نیست.</p>
              ) : (
                <div className="divide-y divide-border">
                  {(tasks.data ?? []).slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/${task.id}`}
                      className="flex items-center justify-between py-2 text-sm hover:text-primary"
                    >
                      <span className="truncate">
                        <span className="text-muted-foreground">{task.key}</span> {task.title}
                      </span>
                      <StatusBadge status={task.status} />
                    </Link>
                  ))}
                </div>
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
              {owner ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مالک</span>
                  <span>{owner.name}</span>
                </div>
              ) : null}
              {p.startDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاریخ شروع</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(p.startDate)}
                  </span>
                </div>
              ) : null}
              {p.dueDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مهلت</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(p.dueDate)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">ایجاد</span>
                <span>{formatDate(p.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">تیم</span>
                <div className="mt-2">
                  <MemberAvatarGroup userIds={p.memberIds} max={6} size="md" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
