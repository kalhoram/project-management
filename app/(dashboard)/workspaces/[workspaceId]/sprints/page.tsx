"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Plus, Workflow } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSprints, useWorkspace } from "@/hooks/queries"
import { formatDate } from "@/lib/utils"

const statusVariant = {
  planning: "secondary" as const,
  active: "warning" as const,
  completed: "success" as const,
}

const sprintStatusLabels: Record<string, string> = {
  planning: "برنامه‌ریزی",
  active: "فعال",
  completed: "تکمیل‌شده",
}

export default function SprintsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const sprints = useSprints(workspaceId)
  const [createOpen, setCreateOpen] = useState(false)

  if (workspace.isLoading || sprints.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (sprints.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => sprints.refetch()} />
      </DashboardShell>
    )
  }

  const items = sprints.data ?? []

  return (
    <DashboardShell>
      <PageHeader
        title="اسپرینت‌ها"
        description={`اسپرینت‌های چابک در ${workspace.data?.name}`}
        actions={
          <div className="flex gap-2">
            <ExportMenu entityName="اسپرینت‌ها" />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              اسپرینت جدید
            </Button>
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={Workflow} title="اسپرینتی وجود ندارد" description="اولین اسپرینت را بسازید تا تکرارها را برنامه‌ریزی کنید." actionLabel="اسپرینت جدید" onAction={() => setCreateOpen(true)} />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {items.filter((s) => s.status === "active").map((sprint) => (
              <Card key={sprint.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{sprint.name}</CardTitle>
                    <Badge variant={statusVariant[sprint.status]}>{sprintStatusLabels[sprint.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{sprint.goal}</p>
                  <Progress value={(sprint.completedPoints / sprint.committedPoints) * 100} />
                  <p className="text-xs text-muted-foreground">
                    {sprint.completedPoints}/{sprint.committedPoints} امتیاز · {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسپرینت</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>هدف</TableHead>
                  <TableHead>تاریخ‌ها</TableHead>
                  <TableHead>امتیاز</TableHead>
                  <TableHead>وظایف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((sprint) => (
                  <TableRow key={sprint.id}>
                    <TableCell className="font-medium">{sprint.name}</TableCell>
                    <TableCell><Badge variant={statusVariant[sprint.status]}>{sprintStatusLabels[sprint.status]}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{sprint.goal}</TableCell>
                    <TableCell>{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</TableCell>
                    <TableCell>{sprint.completedPoints}/{sprint.committedPoints}</TableCell>
                    <TableCell>{sprint.taskIds.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ایجاد اسپرینت</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input placeholder="اسپرینت ۲۶" />
            </div>
            <div className="space-y-2">
              <Label>هدف</Label>
              <Textarea placeholder="این اسپرینت چه دستاوردی باید داشته باشد؟" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={() => { toast.success("اسپرینت ایجاد شد"); setCreateOpen(false) }}>ایجاد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
