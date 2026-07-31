"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { ActivityFeed } from "@/components/common/activity-feed"
import { StatusBadge } from "@/components/common/status-badge"
import { PriorityBadge } from "@/components/common/priority-badge"
import {
  BarChartCard,
  LineChartCard,
  MetricCard,
  PieChartCard,
} from "@/components/features/reports/report-chart-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  useActivities,
  useCurrentUser,
  useDashboardMetrics,
  useMyTasks,
  useOverdueTasks,
  useUpcomingDeadlines,
} from "@/hooks/queries"
import { Badge } from "@/components/ui/badge"
import { STATUS_COLORS, TASK_STATUS_LABELS } from "@/lib/constants"
import { getRoleLabel, listUserPermissions } from "@/lib/permissions"
import { formatDate } from "@/lib/utils"

const statusChartData = [
  { name: TASK_STATUS_LABELS.todo, value: 12 },
  { name: TASK_STATUS_LABELS.in_progress, value: 8 },
  { name: TASK_STATUS_LABELS.in_review, value: 5 },
  { name: TASK_STATUS_LABELS.done, value: 24 },
  { name: TASK_STATUS_LABELS.blocked, value: 2 },
]

const progressTrend = [
  { week: "ه۱", completed: 4, created: 8 },
  { week: "ه۲", completed: 6, created: 5 },
  { week: "ه۳", completed: 9, created: 7 },
  { week: "ه۴", completed: 7, created: 6 },
  { week: "ه۵", completed: 11, created: 4 },
  { week: "ه۶", completed: 8, created: 5 },
]

export default function DashboardPage() {
  const user = useCurrentUser()
  const metrics = useDashboardMetrics()
  const activities = useActivities()
  const myTasks = useMyTasks(user.data?.id ?? "")
  const overdue = useOverdueTasks(user.data?.id)
  const deadlines = useUpcomingDeadlines(user.data?.id)

  const isLoading =
    user.isLoading || metrics.isLoading || activities.isLoading || myTasks.isLoading

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (metrics.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => metrics.refetch()} />
      </DashboardShell>
    )
  }

  const m = metrics.data!

  return (
    <DashboardShell>
      <PageHeader
        title="داشبورد"
        description={`خوش آمدید، ${user.data?.name?.split(" ")[0] ?? "دوست عزیز"}`}
        actions={<ExportMenu entityName="داشبورد" />}
      />

      <Card className="mb-6 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold">نقش و دسترسی شما</CardTitle>
            {user.data?.role ? (
              <Badge variant="default">{getRoleLabel(user.data.role)}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {user.data?.email} — منوی کناری و دکمه‌ها بر اساس این نقش فیلتر می‌شوند. برای مقایسه، از صفحه
            ورود اکانت دیگری را انتخاب کنید.
          </p>
        </CardHeader>
        <CardContent>
          {listUserPermissions(user.data).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              این نقش مجوز عملیاتی ندارد (فقط داشبورد و بخش‌های عمومی).
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {listUserPermissions(user.data).map((perm) => (
                <Badge key={perm.key} variant="secondary">
                  {perm.label}
                </Badge>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="وظایف باز" value={m.openTasks} change="۳+ این هفته" trend="up" />
        <MetricCard label="سررسید گذشته" value={m.overdueTasks} change="نیاز به توجه" trend="down" />
        <MetricCard label="پروژه‌های فعال" value={m.totalProjects} change="۲ مورد به‌زودی تحویل" trend="neutral" />
        <MetricCard label="تکمیل‌شده" value={m.completedTasks} change="۱۲٪+ نسبت به ماه قبل" trend="up" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <PieChartCard title="وظایف بر اساس وضعیت" description="در همه فضاهای کاری" data={statusChartData} />
        <LineChartCard
          title="توان عملیاتی هفتگی"
          description="وظایف ایجادشده در برابر تکمیل‌شده"
          data={progressTrend}
          xKey="week"
          lines={[
            { dataKey: "completed", name: "تکمیل‌شده", color: "#00875A" },
            { dataKey: "created", name: "ایجادشده", color: "#0052CC" },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">وظایف من</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workspaces/ws-1/projects/proj-1/list">
                مشاهده همه
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(myTasks.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">هیچ وظیفه‌ای به شما محول نشده</p>
            ) : (
              <ul className="divide-y divide-border">
                {(myTasks.data ?? []).slice(0, 6).map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.key}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={task.priority} showLabel={false} />
                      <StatusBadge status={task.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base font-semibold">سررسید گذشته</CardTitle>
          </CardHeader>
          <CardContent>
            {(overdue.data ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">مورد سررسید گذشته‌ای نیست</p>
            ) : (
              <ul className="space-y-3">
                {(overdue.data ?? []).slice(0, 5).map((task) => (
                  <li key={task.id} className="text-sm">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-destructive">سررسید: {formatDate(task.dueDate!)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">سررسیدهای پیش‌رو</CardTitle>
          </CardHeader>
          <CardContent>
            {(deadlines.data ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">سررسیدی در ۱۴ روز آینده نیست</p>
            ) : (
              <ul className="divide-y divide-border">
                {(deadlines.data ?? []).slice(0, 5).map((task) => (
                  <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="truncate font-medium">{task.title}</span>
                    <span className="shrink-0 text-muted-foreground">{formatDate(task.dueDate!)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">فعالیت‌های اخیر</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/activity">مشاهده همه</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={(activities.data ?? []).slice(0, 6)} compact />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <BarChartCard
          title="تفکیک وضعیت"
          description="توزیع وظایف"
          data={statusChartData.map((d, i) => ({
            name: d.name,
            value: d.value,
            fill: Object.values(STATUS_COLORS)[i % Object.values(STATUS_COLORS).length],
          }))}
        />
      </div>
    </DashboardShell>
  )
}
