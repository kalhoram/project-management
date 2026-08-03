import { apiRequest } from "@/lib/api/client"
import {
  mapDashboardMetrics,
  mapMemberPerformanceRow,
  mapProgressTrendRow,
  mapTimeTrackingReport,
  type DashboardMetricsApi,
  type MemberPerformanceApiRow,
  type ProgressTrendApiRow,
  type TimeTrackingReportApi,
} from "@/lib/api/mappers"
import type {
  DashboardMetrics,
  MemberPerformanceItem,
  ProgressTrendItem,
  SearchResults,
  TaskStatusReportItem,
  TimeTrackingReport,
} from "@/lib/api/types"

export async function getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
  const payload = await apiRequest<DashboardMetricsApi>(
    `/workspaces/${workspaceId}/reports/dashboard`
  )
  return mapDashboardMetrics(payload)
}

export async function getTaskStatusReport(projectId: string): Promise<TaskStatusReportItem[]> {
  return apiRequest<TaskStatusReportItem[]>(`/projects/${projectId}/reports/status`)
}

export async function getMemberPerformance(workspaceId: string): Promise<MemberPerformanceItem[]> {
  const rows = await apiRequest<MemberPerformanceApiRow[]>(
    `/workspaces/${workspaceId}/reports/members`
  )
  return rows.map(mapMemberPerformanceRow)
}

export async function getTimeTrackingReport(workspaceId: string): Promise<TimeTrackingReport> {
  const payload = await apiRequest<TimeTrackingReportApi>(
    `/workspaces/${workspaceId}/reports/time-tracking`
  )
  return mapTimeTrackingReport(payload)
}

export async function getProgressTrend(projectId: string): Promise<ProgressTrendItem[]> {
  const rows = await apiRequest<ProgressTrendApiRow[]>(
    `/projects/${projectId}/reports/progress-trend`,
    { query: { weeks: 6 } }
  )
  return rows.map(mapProgressTrendRow)
}
