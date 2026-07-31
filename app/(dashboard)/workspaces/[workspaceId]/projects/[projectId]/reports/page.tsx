"use client"

import { useParams } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { ProjectTabs } from "@/components/features/projects/project-tabs"
import {
  BarChartCard,
  LineChartCard,
  MetricCard,
  PieChartCard,
} from "@/components/features/reports/report-chart-card"
import {
  useMemberPerformance,
  useProgressTrend,
  useProject,
  useTaskStatusReport,
  useWorkspace,
} from "@/hooks/queries"
import { STATUS_COLORS, TASK_STATUS_LABELS } from "@/lib/constants"

export default function ProjectReportsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const statusReport = useTaskStatusReport(projectId)
  const progressTrend = useProgressTrend(projectId)
  const memberPerf = useMemberPerformance(workspaceId)

  const isLoading =
    workspace.isLoading || project.isLoading || statusReport.isLoading || progressTrend.isLoading

  if (isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (project.isError || !project.data) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => project.refetch()} />
      </DashboardShell>
    )
  }

  const p = project.data
  const statusData = (statusReport.data ?? []).map((item, i) => ({
    name: TASK_STATUS_LABELS[item.status] ?? item.status,
    value: item.count,
    fill: Object.values(STATUS_COLORS)[i % Object.values(STATUS_COLORS).length],
  }))

  const memberData = (memberPerf.data ?? []).slice(0, 5).map((m) => ({
    name: m.name.split(" ")[0],
    value: m.completed,
  }))

  return (
    <DashboardShell>
      <PageHeader
        title={p.name}
        description="تحلیل و عملکرد پروژه"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: p.key, href: `/workspaces/${workspaceId}/projects/${projectId}` },
          { label: "گزارش‌ها" },
        ]}
        actions={<ExportMenu entityName="گزارش‌ها" />}
      />
      <ProjectTabs workspaceId={workspaceId} projectId={projectId} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="پیشرفت" value={`${p.progress}%`} />
        <MetricCard label="وظایف" value={p.taskCount} />
        <MetricCard label="تکمیل‌شده" value={p.completedTaskCount} />
        <MetricCard label="باز" value={p.taskCount - p.completedTaskCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PieChartCard
          title="وظایف بر اساس وضعیت"
          description="توزیع فعلی"
          data={statusData}
          isLoading={statusReport.isLoading}
        />
        <LineChartCard
          title="روند پیشرفت"
          description="درصد تکمیل هفتگی"
          data={(progressTrend.data ?? []).map((d) => ({ week: d.week, progress: d.progress }))}
          xKey="week"
          lines={[{ dataKey: "progress", name: "پیشرفت %", color: "#0052CC" }]}
          isLoading={progressTrend.isLoading}
        />
      </div>

      <div className="mt-4">
        <BarChartCard
          title="عملکرد اعضا"
          description="وظایف تکمیل‌شده به تفکیک عضو تیم"
          data={memberData}
          isLoading={memberPerf.isLoading}
        />
      </div>
    </DashboardShell>
  )
}
