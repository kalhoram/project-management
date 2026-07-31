"use client"

import { PageHeader } from "@/components/common/page-header"
import { ActivityFeed } from "@/components/common/activity-feed"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { MetricCard } from "@/components/features/reports/report-chart-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAdminDashboard } from "@/hooks/queries"
import { LOG_SEVERITY_LABELS } from "@/lib/constants"

export default function AdminDashboardPage() {
  const dashboard = useAdminDashboard()

  if (dashboard.isLoading) return <PageSkeleton />
  if (dashboard.isError || !dashboard.data) {
    return <ErrorState onRetry={() => dashboard.refetch()} />
  }

  const d = dashboard.data

  return (
    <>
      <PageHeader title="داشبورد مدیریت" description="معیارهای سیستم و هشدارها" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="کاربران" value={d.users} />
        <MetricCard label="فضاهای کاری" value={d.workspaces} />
        <MetricCard label="پروژه‌ها" value={d.projects} />
        <MetricCard label="درآمد" value={`$${d.revenue.toLocaleString()}`} trend="up" change="+۸٪ نسبت به ماه قبل" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">هشدارهای سیستم</CardTitle>
          </CardHeader>
          <CardContent>
            {d.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">هشدار بحرانی وجود ندارد</p>
            ) : (
              <ul className="space-y-2">
                {d.alerts.map((alert) => (
                  <li key={alert.id} className="flex items-start gap-2 rounded-sm border border-border p-3 text-sm">
                    <Badge variant={alert.severity === "critical" ? "destructive" : "warning"}>
                      {LOG_SEVERITY_LABELS[alert.severity] ?? alert.severity}
                    </Badge>
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">{alert.source}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">فعالیت‌های اخیر</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={d.recentActivity} compact />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
