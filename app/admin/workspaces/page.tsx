"use client"

import Link from "next/link"
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
import { useAdminWorkspaces } from "@/hooks/queries"
import { WORKSPACE_STATUS_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

export default function AdminWorkspacesPage() {
  const workspaces = useAdminWorkspaces()

  if (workspaces.isLoading) return <PageSkeleton />
  if (workspaces.isError) return <ErrorState onRetry={() => workspaces.refetch()} />

  return (
    <>
      <PageHeader title="فضاهای کاری" description="همه فضاهای کاری پلتفرم" actions={<ExportMenu entityName="فضاهای کاری" />} />
      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>اعضا</TableHead>
              <TableHead>پروژه‌ها</TableHead>
              <TableHead>تاریخ ایجاد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(workspaces.data ?? []).map((ws) => (
              <TableRow key={ws.id}>
                <TableCell>
                  <Link href={`/admin/workspaces/${ws.id}`} className="font-medium hover:text-primary">
                    {ws.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{ws.slug}</p>
                </TableCell>
                <TableCell><Badge variant={ws.status === "active" ? "success" : "warning"}>{WORKSPACE_STATUS_LABELS[ws.status] ?? ws.status}</Badge></TableCell>
                <TableCell>{ws.memberCount}</TableCell>
                <TableCell>{ws.projectCount}</TableCell>
                <TableCell>{formatDate(ws.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
