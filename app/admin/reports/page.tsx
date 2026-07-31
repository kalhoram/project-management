"use client"

import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import {
  BarChartCard,
  LineChartCard,
} from "@/components/features/reports/report-chart-card"
import { useAdminReports } from "@/hooks/queries"

export default function AdminReportsPage() {
  const reports = useAdminReports()

  if (reports.isLoading) return <PageSkeleton />
  if (reports.isError || !reports.data) return <ErrorState onRetry={() => reports.refetch()} />

  const d = reports.data

  return (
    <>
      <PageHeader title="گزارش‌ها" description="تحلیل‌های پلتفرم" actions={<ExportMenu entityName="گزارش‌های مدیریت" />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard
          title="کاربران فعال"
          description="کاربران فعال ماهانه"
          data={d.activeUsers}
          xKey="month"
          lines={[{ dataKey: "count", name: "کاربران", color: "#0052CC" }]}
        />
        <LineChartCard
          title="رشد فضاهای کاری"
          description="فضاهای کاری جدید در هر ماه"
          data={d.workspaceGrowth}
          xKey="month"
          lines={[{ dataKey: "count", name: "فضاهای کاری", color: "#00B8D9" }]}
        />
      </div>
      <div className="mt-4">
        <BarChartCard
          title="نرخ خطا"
          description="خطاها در هر روز این هفته"
          data={d.errors.map((e) => ({ name: e.day, value: e.count, fill: e.count > 2 ? "#DE350B" : "#0052CC" }))}
        />
      </div>
    </>
  )
}
