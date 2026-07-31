"use client"

import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { StatusBadge } from "@/components/common/status-badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminProjects } from "@/hooks/queries"
import { formatDate } from "@/lib/utils"

export default function AdminProjectsPage() {
  const projects = useAdminProjects()

  if (projects.isLoading) return <PageSkeleton />
  if (projects.isError) return <ErrorState onRetry={() => projects.refetch()} />

  return (
    <>
      <PageHeader title="پروژه‌ها" description="همه پروژه‌ها در فضاهای کاری" actions={<ExportMenu entityName="پروژه‌ها" />} />
      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>پروژه</TableHead>
              <TableHead>فضای کاری</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>پیشرفت</TableHead>
              <TableHead>وظایف</TableHead>
              <TableHead>به‌روزرسانی</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(projects.data ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.key}</p>
                </TableCell>
                <TableCell>{p.workspaceId}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={p.progress} className="w-16" />
                    <span className="text-xs">{p.progress}٪</span>
                  </div>
                </TableCell>
                <TableCell>{p.completedTaskCount}/{p.taskCount}</TableCell>
                <TableCell>{formatDate(p.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
