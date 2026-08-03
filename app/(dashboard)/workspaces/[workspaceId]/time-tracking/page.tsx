"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Clock, Plus } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { MetricCard } from "@/components/features/reports/report-chart-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTimeEntries, useTimeTrackingReport, useWorkspace, useWorkspaceTasks } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"
import { formatDate } from "@/lib/utils"

export default function TimeTrackingPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const entries = useTimeEntries(workspaceId)
  const report = useTimeTrackingReport(workspaceId)
  const workspaceTasks = useWorkspaceTasks(workspaceId)
  const [logOpen, setLogOpen] = useState(false)

  if (workspace.isLoading || entries.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (entries.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => entries.refetch()} />
      </DashboardShell>
    )
  }

  const items = entries.data ?? []
  const r = report.data
  const taskById = new Map((workspaceTasks.data ?? []).map((task) => [task.id, task]))

  return (
    <DashboardShell>
      <PageHeader
        title="ردیابی زمان"
        description="ثبت و بررسی زمان صرف‌شده روی وظایف"
        actions={
          <div className="flex gap-2">
            <ExportMenu entityName="ثبت‌های زمان" />
            <Button onClick={() => setLogOpen(true)}>
              <Plus className="h-4 w-4" />
              ثبت زمان
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="مجموع ساعات" value={r?.totalHours.toFixed(1) ?? "0"} />
        <MetricCard label="ساعات قابل صورتحساب" value={r?.billableHours.toFixed(1) ?? "0"} />
        <MetricCard label="رکوردها" value={items.length} />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Clock} title="زمانی ثبت نشده" description="ردیابی زمان روی وظایف را شروع کنید." actionLabel="ثبت زمان" onAction={() => setLogOpen(true)} />
      ) : (
        <div className="rounded-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ</TableHead>
                <TableHead>وظیفه</TableHead>
                <TableHead>کاربر</TableHead>
                <TableHead>ساعات</TableHead>
                <TableHead>قابل صورتحساب</TableHead>
                <TableHead>یادداشت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => {
                const task = taskById.get(entry.taskId)
                const user = lookupUser(entry.userId)
                return (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{task ? `${task.key} · ${task.title}` : entry.taskId}</TableCell>
                    <TableCell>{user?.name ?? "—"}</TableCell>
                    <TableCell>{entry.hours}س</TableCell>
                    <TableCell>
                      <Badge variant={entry.billable ? "success" : "secondary"}>
                        {entry.billable ? "بله" : "خیر"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entry.note ?? "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ثبت زمان</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>ساعات</Label><Input type="number" step="0.5" placeholder="2.5" /></div>
            <div className="space-y-2"><Label>یادداشت</Label><Input placeholder="روی چه کاری کار کردید؟" /></div>
            <div className="flex items-center justify-between"><Label>قابل صورتحساب</Label><Switch defaultChecked /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>انصراف</Button>
            <Button onClick={() => { toast.success("زمان ثبت شد"); setLogOpen(false) }}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
