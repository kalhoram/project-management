"use client"

import { useParams } from "next/navigation"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { StatusBadge } from "@/components/common/status-badge"
import { MetricCard } from "@/components/features/reports/report-chart-card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminWorkspace } from "@/hooks/queries"
import { PLAN_ID_LABELS, WORKSPACE_STATUS_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

export default function AdminWorkspaceDetailsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { data, isLoading, isError, refetch } = useAdminWorkspace(workspaceId)

  if (isLoading) return <PageSkeleton />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const { workspace, projects, members } = data

  return (
    <>
      <PageHeader
        title={workspace.name}
        description={workspace.description}
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "فضاهای کاری", href: "/admin/workspaces" },
          { label: workspace.name },
        ]}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <MetricCard label="اعضا" value={workspace.memberCount} />
        <MetricCard label="پروژه‌ها" value={workspace.projectCount} />
        <MetricCard label="طرح" value={PLAN_ID_LABELS[workspace.planId] ?? workspace.planId} />
      </div>

      <SettingsSection title="جزئیات">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">شناسه</dt><dd className="font-medium">{workspace.slug}</dd></div>
          <div><dt className="text-muted-foreground">وضعیت</dt><dd><Badge variant="success">{WORKSPACE_STATUS_LABELS[workspace.status] ?? workspace.status}</Badge></dd></div>
          <div><dt className="text-muted-foreground">منطقه زمانی</dt><dd>{workspace.timezone}</dd></div>
          <div><dt className="text-muted-foreground">تاریخ ایجاد</dt><dd>{formatDate(workspace.createdAt)}</dd></div>
        </dl>
      </SettingsSection>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SettingsSection title="پروژه‌ها">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کلید</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.key}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SettingsSection>

        <SettingsSection title="اعضا">
          <ul className="space-y-2">
            {members.slice(0, 8).map((m) => (
              <li key={m.id} className="flex justify-between text-sm">
                <span>{m.name}</span>
                <span className="text-muted-foreground">{m.email}</span>
              </li>
            ))}
          </ul>
        </SettingsSection>
      </div>
    </>
  )
}
