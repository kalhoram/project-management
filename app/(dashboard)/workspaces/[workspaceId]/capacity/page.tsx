"use client"

import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { BarChartCard } from "@/components/features/reports/report-chart-card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCapacity, useWorkspace } from "@/hooks/queries"

export default function CapacityPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const capacity = useCapacity(workspaceId)

  if (workspace.isLoading || capacity.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (capacity.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => capacity.refetch()} />
      </DashboardShell>
    )
  }

  const items = capacity.data ?? []
  const chartData = items.map((m) => ({
    name: m.name.split(" ")[0],
    value: m.utilization,
    fill: m.utilization > 90 ? "#DE350B" : m.utilization > 75 ? "#FF991F" : "#00875A",
  }))

  return (
    <DashboardShell>
      <PageHeader
        title="ظرفیت"
        description="بهره‌وری و دسترس‌پذیری تیم"
        actions={<ExportMenu entityName="ظرفیت" />}
      />

      <div className="mb-4">
        <BarChartCard title="بهره‌وری بر اساس عضو" description="درصد ظرفیت هفتگی" data={chartData} />
      </div>

      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>عضو</TableHead>
              <TableHead>تخصیص‌یافته</TableHead>
              <TableHead>در دسترس</TableHead>
              <TableHead>بهره‌وری</TableHead>
              <TableHead className="w-48">بار</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((member) => (
              <TableRow key={member.userId}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.allocatedHours}س</TableCell>
                <TableCell>{member.availableHours}س</TableCell>
                <TableCell>{member.utilization}٪</TableCell>
                <TableCell><Progress value={member.utilization} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardShell>
  )
}
