"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  FolderKanban,
  ListTodo,
  Plus,
  Users,
} from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { StatusBadge } from "@/components/common/status-badge"
import { PriorityBadge } from "@/components/common/priority-badge"
import { ProjectCard } from "@/components/features/projects/project-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  useActivities,
  useCurrentUser,
  useDashboardMetrics,
  useMemberPerformance,
  useProjects,
  useWorkspace,
  useWorkspaceTasks,
} from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"
import { formatDate } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { faIR } from "date-fns/locale"

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function WorkspaceDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string

  const workspace = useWorkspace(workspaceId)
  const metrics = useDashboardMetrics(workspaceId)
  const projects = useProjects(workspaceId)
  const tasks = useWorkspaceTasks(workspaceId)
  const activities = useActivities(workspaceId)
  const performance = useMemberPerformance(workspaceId)
  const currentUser = useCurrentUser()

  const isLoading =
    workspace.isLoading ||
    metrics.isLoading ||
    projects.isLoading ||
    tasks.isLoading

  const isError = workspace.isError || metrics.isError

  const myTasks = useMemo(() => {
    const userId = currentUser.data?.id
    if (!userId) return []
    return (tasks.data ?? [])
      .filter((t) => t.assigneeId === userId && t.status !== "done" && t.status !== "cancelled")
      .slice(0, 5)
  }, [tasks.data, currentUser.data?.id])

  const activeProjects = useMemo(
    () => (projects.data ?? []).filter((p) => p.status === "active").slice(0, 4),
    [projects.data]
  )

  const upcomingDeadlines = useMemo(() => {
    const now = new Date()
    return (tasks.data ?? [])
      .filter((t) => t.dueDate && new Date(t.dueDate) >= now && t.status !== "done")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5)
  }, [tasks.data])

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (isError) {
    return (
      <DashboardShell>
        <ErrorState
          message="بارگذاری داشبورد فضای کاری ممکن نشد."
          onRetry={() => {
            workspace.refetch()
            metrics.refetch()
          }}
        />
      </DashboardShell>
    )
  }

  const ws = workspace.data!
  const m = metrics.data!

  return (
    <DashboardShell>
      <PageHeader
        title={ws.name}
        description={ws.description ?? "پروژه‌ها، وظایف و وضعیت تیم"}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: ws.name },
        ]}
        actions={
          <Button asChild>
            <Link href={`/workspaces/${workspaceId}/projects/new`}>
              <Plus className="h-4 w-4" />
              پروژه جدید
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "پروژه‌های فعال", value: m.totalProjects, icon: FolderKanban },
          { label: "وظایف باز", value: m.openTasks, icon: ListTodo },
          { label: "وظایف سررسید گذشته", value: m.overdueTasks, icon: AlertTriangle, warn: true },
          { label: "تکمیل‌شده", value: m.completedTasks, icon: CheckCircle2 },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-sm ${
                  item.warn ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}
              >
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
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold">پروژه‌های فعال</h4>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/workspaces/${workspaceId}/projects`}>
                  مشاهده همه
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {activeProjects.length === 0 ? (
              <EmptyState
                title="پروژه فعالی وجود ندارد"
                description="یک پروژه بسازید تا شروع کنید."
                actionLabel="ایجاد پروژه"
                onAction={() => router.push(`/workspaces/${workspaceId}/projects/new`)}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {activeProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} workspaceId={workspaceId} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold">وظایف من</h4>
            </div>
            <Card>
              {myTasks.length === 0 ? (
                <CardContent className="p-6">
                  <EmptyState title="وظیفه‌ای محول نشده" description="همه کارها انجام شده!" />
                </CardContent>
              ) : (
                <div className="divide-y divide-border">
                  {myTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/workspaces/${workspaceId}/projects/${task.projectId}/tasks/${task.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.key}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <PriorityBadge priority={task.priority} showLabel={false} />
                        <StatusBadge status={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </section>

          <section>
            <h4 className="mb-3 text-lg font-semibold">فعالیت‌های اخیر</h4>
            <Card>
              {(activities.data ?? []).length === 0 ? (
                <CardContent className="p-6">
                  <EmptyState title="هنوز فعالیتی نیست" description="فعالیت‌ها اینجا نمایش داده می‌شوند." />
                </CardContent>
              ) : (
                <div className="divide-y divide-border">
                  {(activities.data ?? []).slice(0, 6).map((act) => {
                    const actor = lookupUser(act.actorId)
                    return (
                      <div key={act.id} className="flex items-start gap-3 px-4 py-3">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">
                            {actor ? initials(actor.name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{actor?.name ?? "کسی"}</span>{" "}
                            {act.action}{" "}
                            <span className="font-medium">{act.entityName}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true, locale: faIR })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">اقدامات سریع</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/workspaces/${workspaceId}/projects/new`}>
                  <Plus className="h-4 w-4" />
                  پروژه جدید
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/workspaces/${workspaceId}/members`}>
                  <Users className="h-4 w-4" />
                  دعوت اعضا
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/workspaces/${workspaceId}/projects`}>
                  <FolderKanban className="h-4 w-4" />
                  مرور پروژه‌ها
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">بار کاری تیم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(performance.data ?? []).slice(0, 5).map((member) => {
                const total = member.open + member.completed
                const pct = total > 0 ? Math.round((member.open / total) * 100) : 0
                return (
                  <div key={member.userId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{member.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {member.open} باز · {member.overdue} سررسید گذشته
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">سررسیدهای پیش‌رو</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">سررسید پیش‌رویی وجود ندارد.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((task) => (
                    <Link
                      key={task.id}
                      href={`/workspaces/${workspaceId}/projects/${task.projectId}/tasks/${task.id}`}
                      className="flex items-center justify-between gap-2 text-sm hover:text-primary"
                    >
                      <span className="truncate">{task.title}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(task.dueDate!)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
