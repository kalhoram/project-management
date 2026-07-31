"use client"

import { useParams } from "next/navigation"
import { Shield } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { PermissionMatrix } from "@/components/common/permission-matrix"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePermissions, useWorkspace, useWorkspaceRoles } from "@/hooks/queries"
import { AccessDeniedCard, RequirePermission } from "@/components/common/require-permission"

export default function WorkspaceRolesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const roles = useWorkspaceRoles(workspaceId)
  const permissions = usePermissions()

  const isLoading = workspace.isLoading || roles.isLoading || permissions.isLoading
  const isError = workspace.isError || roles.isError || permissions.isError

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (isError) {
    return (
      <DashboardShell>
        <ErrorState
          message="بارگذاری نقش‌ها و مجوزها ممکن نشد."
          onRetry={() => {
            roles.refetch()
            permissions.refetch()
          }}
        />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <RequirePermission
        permission="members.manage"
        fallback={
          <AccessDeniedCard
            title="مدیریت نقش‌ها محدود است"
            description="فقط مالک و مدیر می‌توانند ماتریس نقش‌ها را ببینند."
          />
        }
      >
      <PageHeader
        title="نقش‌ها و مجوزها"
        description="پیکربندی سطح دسترسی اعضای فضای کاری"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "نقش‌ها" },
        ]}
        actions={<ExportMenu entityName="ماتریس نقش‌ها" label="خروجی ماتریس" />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(roles.data ?? []).map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{role.name}</CardTitle>
              </div>
              {role.isSystem ? <Badge variant="secondary">سیستمی</Badge> : null}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{role.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {role.memberCount} عضو ·{" "}
                {role.permissions.length} مجوز
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <PermissionMatrix
        roles={roles.data ?? []}
        permissions={permissions.data ?? []}
      />
      </RequirePermission>
    </DashboardShell>
  )
}
