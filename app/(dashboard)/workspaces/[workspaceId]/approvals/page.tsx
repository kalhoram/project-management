"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useApprovals, useWorkspace } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"
import { formatDate } from "@/lib/utils"

const statusVariant = {
  pending: "warning" as const,
  approved: "success" as const,
  rejected: "destructive" as const,
}

const approvalStatusLabels: Record<string, string> = {
  pending: "در انتظار",
  approved: "تأییدشده",
  rejected: "ردشده",
}

const tabLabels: Record<string, string> = {
  pending: "در انتظار",
  approved: "تأییدشده",
  rejected: "ردشده",
  all: "همه",
}

export default function ApprovalsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const approvals = useApprovals(workspaceId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (workspace.isLoading || approvals.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (approvals.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => approvals.refetch()} />
      </DashboardShell>
    )
  }

  const items = approvals.data ?? []
  const selected = items.find((a) => a.id === selectedId)

  function handleDecision(decision: "approved" | "rejected") {
    toast.success(decision === "approved" ? "درخواست تأیید شد" : "درخواست رد شد")
    setDialogOpen(false)
    setSelectedId(null)
  }

  return (
    <DashboardShell>
      <div dir="rtl" className="w-full text-start">
        <PageHeader
          title="تأییدها"
          description="بررسی و اقدام روی درخواست‌های در انتظار"
          actions={<ExportMenu entityName="تأییدها" />}
        />

        <Tabs defaultValue="pending" dir="rtl">
          <div className="flex w-full justify-start">
            <TabsList>
              <TabsTrigger value="pending">
                در انتظار ({items.filter((a) => a.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="approved">تأییدشده</TabsTrigger>
              <TabsTrigger value="rejected">ردشده</TabsTrigger>
              <TabsTrigger value="all">همه</TabsTrigger>
            </TabsList>
          </div>

          {(["pending", "approved", "rejected", "all"] as const).map((tab) => {
            const filtered = tab === "all" ? items : items.filter((a) => a.status === tab)
            return (
              <TabsContent key={tab} value={tab} className="mt-4">
                {filtered.length === 0 ? (
                  <EmptyState
                    title={tab === "all" ? "تأییدی وجود ندارد" : `تأیید ${tabLabels[tab]} وجود ندارد`}
                    description="درخواست‌های تأیید اینجا نمایش داده می‌شوند."
                  />
                ) : (
                  <div className="overflow-hidden rounded-sm border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>عنوان</TableHead>
                          <TableHead>درخواست‌کننده</TableHead>
                          <TableHead>وضعیت</TableHead>
                          <TableHead>تاریخ ایجاد</TableHead>
                          <TableHead className="w-32 text-start">عملیات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((req) => {
                          const requester = lookupUser(req.requesterId)
                          return (
                            <TableRow key={req.id}>
                              <TableCell className="font-medium">{req.title}</TableCell>
                              <TableCell>{requester?.name ?? "کاربر"}</TableCell>
                              <TableCell>
                                <Badge variant={statusVariant[req.status]}>
                                  {approvalStatusLabels[req.status]}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(req.createdAt)}</TableCell>
                              <TableCell>
                                {req.status === "pending" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedId(req.id)
                                      setDialogOpen(true)
                                    }}
                                  >
                                    بررسی
                                  </Button>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl" className="text-start">
            <DialogHeader className="text-start sm:text-start">
              <DialogTitle>{selected?.title}</DialogTitle>
              <DialogDescription>
                {selected?.description ?? "این درخواست تأیید را بررسی کنید."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
              <Button onClick={() => handleDecision("approved")}>
                <Check className="h-4 w-4" />
                تأیید
              </Button>
              <Button variant="outline" onClick={() => handleDecision("rejected")}>
                <X className="h-4 w-4" />
                رد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  )
}
