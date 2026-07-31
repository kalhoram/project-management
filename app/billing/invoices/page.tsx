"use client"

import { Download } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInvoices } from "@/hooks/queries"
import { INVOICE_STATUS_LABELS, DEFAULT_WORKSPACE_ID } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import type { InvoiceStatus } from "@/lib/types"

const statusVariant: Record<InvoiceStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  open: "warning",
  paid: "success",
  void: "secondary",
  overdue: "destructive",
}

export default function InvoicesPage() {
  const invoices = useInvoices(DEFAULT_WORKSPACE_ID)

  if (invoices.isLoading) return <PageSkeleton />
  if (invoices.isError) return <ErrorState onRetry={() => invoices.refetch()} />

  return (
    <>
      <PageHeader title="فاکتورها" description="دانلود و بررسی فاکتورهای صورتحساب" actions={<ExportMenu entityName="فاکتورها" />} />
      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>فاکتور</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>تاریخ صدور</TableHead>
              <TableHead>سررسید</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invoices.data ?? []).map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.number}</TableCell>
                <TableCell>${inv.amount} {inv.currency}</TableCell>
                <TableCell><Badge variant={statusVariant[inv.status]}>{INVOICE_STATUS_LABELS[inv.status] ?? inv.status}</Badge></TableCell>
                <TableCell>{formatDate(inv.issuedAt)}</TableCell>
                <TableCell>{formatDate(inv.dueAt)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" onClick={() => toast.success("در حال دانلود PDF")}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
