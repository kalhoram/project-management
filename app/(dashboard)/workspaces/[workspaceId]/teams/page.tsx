"use client"

import { useParams } from "next/navigation"
import { Users } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { CardGridSkeleton } from "@/components/common/loading-skeleton"
import { MemberAvatarGroup } from "@/components/common/member-avatar-group"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWorkspace, useWorkspaceTeams } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"

export default function WorkspaceTeamsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const teams = useWorkspaceTeams(workspaceId)

  if (teams.isLoading) {
    return (
      <DashboardShell>
        <PageHeader title="تیم‌ها" description="سازمان‌دهی اعضا در تیم‌ها" />
        <CardGridSkeleton count={3} />
      </DashboardShell>
    )
  }

  if (teams.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری تیم‌ها ممکن نشد." onRetry={() => teams.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="تیم‌ها"
        description="سازمان‌دهی اعضا در تیم‌ها و واحدها"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "تیم‌ها" },
        ]}
        actions={
          <Button onClick={() => toast.success("پنجره ایجاد تیم باز می‌شود")}>
            ایجاد تیم
          </Button>
        }
      />

      {(teams.data ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="هنوز تیمی وجود ندارد"
          description="تیم‌ها را برای سازمان‌دهی اعضا بر اساس واحد یا حوزه کاری بسازید."
          actionLabel="ایجاد تیم"
          onAction={() => toast.success("پنجره ایجاد تیم باز می‌شود")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(teams.data ?? []).map((team) => {
            const lead = lookupUser(team.leadId)
            return (
              <Card key={team.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <CardTitle className="text-base">{team.name}</CardTitle>
                  </div>
                  {team.department ? (
                    <Badge variant="secondary">{team.department}</Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {team.description ?? "بدون توضیحات"}
                  </p>
                  {lead ? (
                    <p className="text-xs text-muted-foreground">
                      سرپرست: <span className="font-medium text-foreground">{lead.name}</span>
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <MemberAvatarGroup userIds={team.memberIds} />
                    <span className="text-xs text-muted-foreground">
                      {team.memberIds.length} عضو
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardShell>
  )
}
