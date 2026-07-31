"use client"

import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminPayments } from "@/hooks/queries"
import { PAYMENT_STATUS_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import type { PaymentStatus } from "@/lib/types"

const statusVariant: Record<PaymentStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  paid: "success",
  pending: "warning",
  failed: "destructive",
  refunded: "secondary",
}

export default function AdminPaymentsPage() {
  const payments = useAdminPayments()

  if (payments.isLoading) return <PageSkeleton />
  if (payments.isError) return <ErrorState onRetry={() => payments.refetch()} />

  const total = (payments.data ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0)

  return (
    <>
      <PageHeader
        title="پرداخت‌ها"
        description={`مجموع درآمد: $${total.toLocaleString()}`}
        actions={<ExportMenu entityName="پرداخت‌ها" />}
      />
      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>تاریخ</TableHead>
              <TableHead>مشتری</TableHead>
              <TableHead>فضای کاری</TableHead>
              <TableHead>روش پرداخت</TableHead>
              <TableHead>مبلغ</TableHead>
              <TableHead>وضعیت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(payments.data ?? []).map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{formatDate(payment.createdAt)}</TableCell>
                <TableCell>{payment.customerName}</TableCell>
                <TableCell>{payment.workspaceId}</TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>${payment.amount} {payment.currency}</TableCell>
                <TableCell><Badge variant={statusVariant[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
