"use client"

import { useParams } from "next/navigation"
import { Calculator } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { BarChartCard, MetricCard } from "@/components/features/reports/report-chart-card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useEstimation, useWorkspace } from "@/hooks/queries"

export default function EstimationPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const estimation = useEstimation(workspaceId)

  if (workspace.isLoading || estimation.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (estimation.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => estimation.refetch()} />
      </DashboardShell>
    )
  }

  const items = estimation.data ?? []
  const avgVariance = items.length
    ? items.reduce((sum, i) => sum + i.variance, 0) / items.length
    : 0
  const chartData = items.slice(0, 6).map((i) => ({
    name: i.key,
    value: Math.abs(i.variance),
    fill: i.variance > 0 ? "#DE350B" : "#00875A",
  }))

  return (
    <DashboardShell>
      <PageHeader title="برآورد" description="مقایسه برآورد با واقعیت" actions={<ExportMenu entityName="برآوردها" />} />

      {items.length === 0 ? (
        <EmptyState icon={Calculator} title="داده برآوردی وجود ندارد" description="برای پیگیری دقت، برآورد به وظایف اضافه کنید." />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <MetricCard label="وظایف پیگیری‌شده" value={items.length} />
            <MetricCard label="میانگین انحراف" value={`${avgVariance.toFixed(1)}س`} trend={avgVariance > 0 ? "down" : "up"} />
            <MetricCard label="مجموع امتیاز داستان" value={items.reduce((s, i) => s + i.storyPoints, 0)} />
          </div>

          <div className="mb-4">
            <BarChartCard title="انحراف بر اساس وظیفه" description="ساعات مطلق بیش/کم از برآورد" data={chartData} />
          </div>

          <div className="rounded-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>وظیفه</TableHead>
                  <TableHead>برآورد</TableHead>
                  <TableHead>واقعی</TableHead>
                  <TableHead>امتیاز داستان</TableHead>
                  <TableHead>انحراف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.taskId}>
                    <TableCell>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.key}</p>
                    </TableCell>
                    <TableCell>{item.estimateHours}س</TableCell>
                    <TableCell>{item.actualHours}س</TableCell>
                    <TableCell>{item.storyPoints}</TableCell>
                    <TableCell>
                      <Badge variant={item.variance > 0 ? "destructive" : item.variance < 0 ? "success" : "secondary"}>
                        {item.variance > 0 ? "+" : ""}{item.variance}س
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </DashboardShell>
  )
}
