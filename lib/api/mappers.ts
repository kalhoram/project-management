import type {
  DashboardMetrics,
  MemberPerformanceItem,
  ProgressTrendItem,
  TimeTrackingReport,
} from "@/lib/api/types"
import type { User, WorkspaceRole, Task } from "@/lib/types"
import type { CapacityMember, EstimationItem } from "@/lib/api/advanced.service"

/** Raw capacity row from GET /workspaces/{id}/capacity */
export interface CapacityApiRow {
  userId: string
  workspaceId: string
  weekStart: string
  capacityHours: number
  allocatedHours: number
  availableHours: number
}

/** Raw dashboard metrics from GET /workspaces/{id}/reports/dashboard */
export interface DashboardMetricsApi {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  totalMembers: number
  tasksDueThisWeek: number
  completionRate: number
}

/** Raw member performance row from GET /workspaces/{id}/reports/members */
export interface MemberPerformanceApiRow {
  userId: string
  userName: string
  tasksAssigned: number
  tasksCompleted: number
  tasksOverdue: number
  avgCompletionHours: number | null
  onTimeRate: number
}

/** Raw progress trend row from GET /projects/{id}/reports/progress-trend */
export interface ProgressTrendApiRow {
  date: string
  created: number
  completed: number
  cumulativeCompleted: number
}

/** Raw estimation row from GET /workspaces/{id}/estimation */
export interface EstimationApiRow {
  taskId: string
  key: string
  title: string
  estimateHours: number | null
  actualHours: number
  storyPoints: number | null
  variance: number
  confidence: number
}

/** Raw time tracking report from GET /workspaces/{id}/reports/time-tracking */
export interface TimeTrackingReportApi {
  totalHours: number
  billableHours: number
  nonBillableHours: number
  byMember: Array<{
    userId: string
    userName: string
    totalHours: number
    billableHours: number
  }>
  byProject: Array<{
    projectId: string
    projectName: string
    totalHours: number
    billableHours: number
  }>
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Raw workspace member from GET /workspaces/{id}/members */
export interface WorkspaceMemberApiRow {
  user: User
  workspaceId: string
  role: WorkspaceRole
  teamIds?: string[]
  joinedAt: string
}

export interface WorkspaceMemberView extends User {
  role: WorkspaceRole
  joinedAt: string
  teamIds: string[]
}

export function mapWorkspaceMember(row: WorkspaceMemberApiRow): WorkspaceMemberView {
  return {
    ...row.user,
    role: row.role,
    joinedAt: row.joinedAt,
    teamIds: row.teamIds ?? [],
  }
}

export function mapCapacityRow(row: CapacityApiRow, displayName?: string): CapacityMember {
  const capacityHours = safeNumber(row.capacityHours)
  const allocatedHours = safeNumber(row.allocatedHours)
  const availableHours =
    row.availableHours != null
      ? safeNumber(row.availableHours)
      : Math.max(0, capacityHours - allocatedHours)
  const utilization =
    capacityHours > 0 ? Math.round((allocatedHours / capacityHours) * 100) : 0

  return {
    userId: row.userId,
    name: displayName?.trim() || "عضو تیم",
    allocatedHours,
    availableHours,
    utilization,
    capacityHours,
  }
}

export function mapDashboardMetrics(api: DashboardMetricsApi): DashboardMetrics {
  const totalTasks = safeNumber(api.totalTasks)
  const completedTasks = safeNumber(api.completedTasks)

  return {
    totalProjects: safeNumber(api.activeProjects ?? api.totalProjects),
    openTasks: Math.max(0, totalTasks - completedTasks),
    overdueTasks: safeNumber(api.overdueTasks),
    completedTasks,
    members: safeNumber(api.totalMembers),
    totalTasks,
    activeProjects: safeNumber(api.activeProjects),
    tasksDueThisWeek: safeNumber(api.tasksDueThisWeek),
    completionRate: safeNumber(api.completionRate),
  }
}

export function mapMemberPerformanceRow(row: MemberPerformanceApiRow): MemberPerformanceItem {
  const assigned = safeNumber(row.tasksAssigned)
  const completed = safeNumber(row.tasksCompleted)

  return {
    userId: row.userId,
    name: row.userName?.trim() || "عضو",
    completed,
    overdue: safeNumber(row.tasksOverdue),
    open: Math.max(0, assigned - completed),
    avgHours: row.avgCompletionHours != null ? safeNumber(row.avgCompletionHours) : 0,
  }
}

export function mapProgressTrendRow(row: ProgressTrendApiRow, index: number): ProgressTrendItem {
  const created = safeNumber(row.created)
  const completed = safeNumber(row.completed)
  const cumulative = safeNumber(row.cumulativeCompleted)
  const denominator = Math.max(created + cumulative, completed, 1)
  const progress = Math.min(100, Math.round((cumulative / denominator) * 100))

  return {
    week: `ه${index + 1}`,
    date: row.date,
    progress,
    created,
    completed,
    cumulativeCompleted: cumulative,
  }
}

export function mapEstimationRow(row: EstimationApiRow): EstimationItem {
  const estimateHours = safeNumber(row.estimateHours)
  const actualHours = safeNumber(row.actualHours)
  const storyPoints = safeNumber(row.storyPoints)

  return {
    taskId: row.taskId,
    key: row.key?.trim() || row.taskId.slice(0, 8),
    title: row.title?.trim() || "وظیفه",
    estimateHours,
    actualHours,
    storyPoints,
    variance: row.variance != null ? safeNumber(row.variance) : actualHours - estimateHours,
    confidence: safeNumber(row.confidence, 50),
  }
}

export function mapTimeTrackingReport(api: TimeTrackingReportApi): TimeTrackingReport {
  return {
    totalHours: safeNumber(api.totalHours),
    billableHours: safeNumber(api.billableHours),
    nonBillableHours: safeNumber(api.nonBillableHours),
    entries: [],
    byMember: (api.byMember ?? []).map((row) => ({
      userId: row.userId,
      name: row.userName,
      totalHours: safeNumber(row.totalHours),
      billableHours: safeNumber(row.billableHours),
    })),
    byProject: (api.byProject ?? []).map((row) => ({
      projectId: row.projectId,
      name: row.projectName,
      totalHours: safeNumber(row.totalHours),
      billableHours: safeNumber(row.billableHours),
    })),
  }
}
