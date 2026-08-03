"use client"

import { Gauge } from "lucide-react"
import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
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
import { lookupUser } from "@/lib/user-registry"

function memberLabel(userId: string, mappedName?: string) {
  if (mappedName && mappedName !== "عضو تیم") return mappedName
  return lookupUser(userId)?.name ?? mappedName ?? "عضو تیم"
}

export default function CapacityPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const capacity = useCapacity(workspaceId)

  if (workspace.isLoading || capacity.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (capacity.isError) {
    return (
      <DashboardShell>
        <ErrorState
          message="بارگذاری داده ظرفیت تیم ممکن نشد."
          onRetry={() => capacity.refetch()}
        />
      </DashboardShell>
    )
  }

  const items = capacity.data ?? []

  if (items.length === 0) {
    return (
      <DashboardShell>
        <PageHeader
          title="ظرفیت"
          description="بهره‌وری و دسترس‌پذیری تیم"
          actions={<ExportMenu entityName="ظرفیت" />}
        />
        <EmptyState
          icon={Gauge}
          title="داده ظرفیتی ثبت نشده"
          description="برنامه ظرفیت هفتگی اعضا پس از تنظیم در اینجا نمایش داده می‌شود."
        />
      </DashboardShell>
    )
  }

  const chartData = items.map((member) => {
    const utilization = member.utilization ?? 0
    const label = memberLabel(member.userId, member.name)
    return {
      name: label.split(" ")[0] ?? label,
      value: utilization,
      fill: utilization > 90 ? "#DE350B" : utilization > 75 ? "#FF991F" : "#00875A",
    }
  })

  return (
    <DashboardShell>
      <PageHeader
        title="ظرفیت"
        description="بهره‌وری و دسترس‌پذیری تیم"
        actions={<ExportMenu entityName="ظرفیت" />}
      />

      <div className="mb-4">
        <BarChartCard
          title="بهره‌وری بر اساس عضو"
          description="درصد ظرفیت هفتگی"
          data={chartData}
        />
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
            {items.map((member) => {
              const utilization = member.utilization ?? 0
              const name = memberLabel(member.userId, member.name)
              return (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>{member.allocatedHours ?? 0}س</TableCell>
                  <TableCell>{member.availableHours ?? 0}س</TableCell>
                  <TableCell>{utilization}٪</TableCell>
                  <TableCell>
                    <Progress value={utilization} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </DashboardShell>
  )
}
