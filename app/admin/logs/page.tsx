"use client"

import { useState } from "react"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminLogs } from "@/hooks/queries"
import { LOG_SEVERITY_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import type { SystemLog } from "@/lib/types"

const severityVariant: Record<SystemLog["severity"], "default" | "secondary" | "warning" | "destructive"> = {
  info: "secondary",
  warning: "warning",
  error: "destructive",
  critical: "destructive",
}

export default function AdminLogsPage() {
  const logs = useAdminLogs()
  const [severity, setSeverity] = useState("all")
  const [selected, setSelected] = useState<SystemLog | null>(null)

  if (logs.isLoading) return <PageSkeleton />
  if (logs.isError) return <ErrorState onRetry={() => logs.refetch()} />

  const filtered = (logs.data ?? []).filter(
    (l) => severity === "all" || l.severity === severity
  )

  return (
    <>
      <PageHeader
        title="گزارش‌های سیستم"
        description="گزارش‌های ممیزی و خطا"
        actions={
          <div className="flex gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-36"><SelectValue placeholder="شدت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="info">اطلاعات</SelectItem>
                <SelectItem value="warning">هشدار</SelectItem>
                <SelectItem value="error">خطا</SelectItem>
                <SelectItem value="critical">بحرانی</SelectItem>
              </SelectContent>
            </Select>
            <ExportMenu entityName="گزارش‌های سیستم" />
          </div>
        }
      />

      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>زمان</TableHead>
              <TableHead>شدت</TableHead>
              <TableHead>منبع</TableHead>
              <TableHead>پیام</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs">{formatDate(log.createdAt, "MMM d h:mm a")}</TableCell>
                <TableCell><Badge variant={severityVariant[log.severity]}>{LOG_SEVERITY_LABELS[log.severity] ?? log.severity}</Badge></TableCell>
                <TableCell>{log.source}</TableCell>
                <TableCell className="max-w-md truncate">{log.message}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(log)}>جزئیات</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>جزئیات گزارش</SheetTitle>
            <SheetDescription>{selected?.source}</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 space-y-3 text-sm">
              <div><span className="text-muted-foreground">شدت:</span> <Badge variant={severityVariant[selected.severity]}>{LOG_SEVERITY_LABELS[selected.severity] ?? selected.severity}</Badge></div>
              <div><span className="text-muted-foreground">زمان:</span> {formatDate(selected.createdAt, "PPpp")}</div>
              <div><span className="text-muted-foreground">پیام:</span> {selected.message}</div>
              {selected.details ? (
                <pre className="overflow-auto rounded-sm bg-muted p-3 text-xs">
                  {JSON.stringify(selected.details, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
