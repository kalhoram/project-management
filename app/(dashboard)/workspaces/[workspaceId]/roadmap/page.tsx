"use client"

import { useParams } from "next/navigation"
import { Map } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useRoadmap, useWorkspace } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"
import { formatDate } from "@/lib/utils"

const statusVariant = {
  planned: "secondary" as const,
  in_progress: "warning" as const,
  shipped: "success" as const,
  cancelled: "destructive" as const,
}

const roadmapStatusLabels: Record<string, string> = {
  planned: "برنامه‌ریزی‌شده",
  in_progress: "در حال انجام",
  shipped: "منتشرشده",
  cancelled: "لغوشده",
}

export default function RoadmapPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const roadmap = useRoadmap(workspaceId)

  if (workspace.isLoading || roadmap.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (roadmap.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => roadmap.refetch()} />
      </DashboardShell>
    )
  }

  const items = roadmap.data ?? []

  return (
    <DashboardShell>
      <PageHeader
        title="نقشه راه"
        description="ابتکارات و انتشارها"
        actions={<ExportMenu entityName="نقشه راه" />}
      />

      {items.length === 0 ? (
        <EmptyState icon={Map} title="موردی در نقشه راه نیست" description="ابتکارات را برنامه‌ریزی و انتشارها را پیگیری کنید." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const owner = lookupUser(item.ownerId)
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="font-semibold">{item.title}</h5>
                      <Badge variant={statusVariant[item.status]}>{roadmapStatusLabels[item.status]}</Badge>
                      {item.release ? <Badge variant="outline">{item.release}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.initiative} · {owner?.name} · {formatDate(item.startDate)} – {formatDate(item.endDate)}
                    </p>
                  </div>
                  <div className="hidden h-2 w-32 shrink-0 rounded-full bg-muted sm:block">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: item.status === "shipped" ? "100%" : item.status === "in_progress" ? "60%" : "20%",
                      }}
                    />
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
