import type {
  Activity,
  Attachment,
  Comment,
  Notification,
  Project,
  Task,
  User,
} from "@/lib/types"

export interface DashboardMetrics {
  totalWorkspaces?: number
  totalProjects: number
  openTasks: number
  overdueTasks: number
  completedTasks: number
  members?: number
  /** Raw backend fields preserved for advanced views */
  totalTasks?: number
  activeProjects?: number
  tasksDueThisWeek?: number
  completionRate?: number
}

export interface TaskStatusReportItem {
  status: string
  count: number
}

export interface MemberPerformanceItem {
  userId: string
  name: string
  completed: number
  overdue: number
  open: number
  avgHours: number
}

export interface TimeTrackingReport {
  totalHours: number
  billableHours: number
  nonBillableHours?: number
  entries: unknown[]
  byMember?: Array<{
    userId: string
    name: string
    totalHours: number
    billableHours: number
  }>
  byProject?: Array<{
    projectId: string
    name: string
    totalHours: number
    billableHours: number
  }>
}

export interface ProgressTrendItem {
  week: string
  progress: number
  date?: string
  created?: number
  completed?: number
  cumulativeCompleted?: number
}

export interface SearchResults {
  tasks: Task[]
  projects: Project[]
  users: User[]
  files: Attachment[]
  comments: Comment[]
}

export interface AdminDashboard {
  users: number
  workspaces: number
  projects: number
  revenue: number
  alerts: Array<{ id: string; severity: string; message: string; source?: string }>
  recentActivity: Activity[]
}

export interface SubscriptionResponse {
  workspaceId: string
  plan: import("@/lib/types").Plan
  renewalDate: string
  status: string
  usage: {
    members: number
    projects: number
    storageGb: number
  }
}

