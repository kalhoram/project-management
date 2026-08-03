"use client"

import { useParams } from "next/navigation"
import { Target } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useOKRs, useWorkspace } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"

const statusVariant = {
  on_track: "success" as const,
  at_risk: "warning" as const,
  behind: "destructive" as const,
  completed: "default" as const,
}

const okrStatusLabels: Record<string, string> = {
  on_track: "در مسیر",
  at_risk: "در معرض ریسک",
  behind: "عقب‌مانده",
  completed: "تکمیل‌شده",
}

export default function OKRPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const okrs = useOKRs(workspaceId)

  if (workspace.isLoading || okrs.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (okrs.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => okrs.refetch()} />
      </DashboardShell>
    )
  }

  const items = okrs.data ?? []

  return (
    <DashboardShell>
      <div dir="rtl" className="w-full text-start">
        <PageHeader
          title="اهداف کلیدی"
          description="اهداف و نتایج کلیدی"
          actions={<ExportMenu entityName="اهداف کلیدی" />}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={Target}
            title="هدفی تعریف نشده"
            description="اهداف را تعیین کنید تا تیم هم‌راستا شود."
          />
        ) : (
          <div className="space-y-4">
            {items.map((okr) => {
              const owner = lookupUser(okr.ownerId)
              return (
                <Card key={okr.id} className="text-start">
                  <CardHeader className="space-y-3 pb-2">
                    <div className="flex flex-wrap items-center justify-start gap-2">
                      <Badge variant="outline">{okr.period}</Badge>
                      <Badge variant={statusVariant[okr.status]}>
                        {okrStatusLabels[okr.status]}
                      </Badge>
                    </div>
                    <CardTitle className="text-base leading-relaxed">{okr.objective}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {owner?.name} · {okr.confidence}٪ اطمینان
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span>پیشرفت کلی</span>
                        <span className="font-medium tabular-nums">{okr.progress}٪</span>
                      </div>
                      <Progress value={okr.progress} />
                    </div>
                    <ul className="space-y-3">
                      {(okr.keyResults ?? []).map((kr) => (
                        <li key={kr.id} className="rounded-sm border border-border p-3 text-start">
                          <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="min-w-0 flex-1">{kr.title}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {kr.current}/{kr.target} {kr.unit}
                            </span>
                          </div>
                          <Progress
                            value={
                              kr.target > 0
                                ? Math.min((kr.current / kr.target) * 100, 100)
                                : 0
                            }
                            className="mt-2"
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
