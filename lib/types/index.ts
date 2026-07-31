export type UserStatus = "active" | "inactive" | "invited" | "suspended"
export type WorkspaceRole = "owner" | "admin" | "member" | "guest" | "viewer"
export type ProjectVisibility = "private" | "team" | "public"
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived" | "deleted"
export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked"
  | "cancelled"
export type TaskPriority = "highest" | "high" | "medium" | "low" | "lowest"
export type NotificationType =
  | "mention"
  | "assignment"
  | "comment"
  | "deadline"
  | "status_change"
  | "system"
export type PlanInterval = "monthly" | "yearly"
export type PaymentStatus = "paid" | "pending" | "failed" | "refunded"
export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "overdue"
export type ApprovalStatus = "pending" | "approved" | "rejected"
export type ActivityEntityType =
  | "task"
  | "project"
  | "workspace"
  | "file"
  | "comment"
  | "user"
  | "sprint"

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  bio?: string
  jobTitle?: string
  status: UserStatus
  role?: WorkspaceRole
  timezone?: string
  language?: string
  createdAt: string
  lastActiveAt?: string
}

export interface Permission {
  id: string
  key: string
  label: string
  description: string
  category: string
}

export interface Role {
  id: string
  workspaceId: string
  name: string
  description: string
  isSystem: boolean
  permissions: string[]
  memberCount: number
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logoUrl?: string
  description?: string
  industry?: string
  companySize?: string
  timezone: string
  defaultVisibility: ProjectVisibility
  planId: string
  ownerId: string
  memberCount: number
  projectCount: number
  createdAt: string
  status: "active" | "suspended" | "trial"
}

export interface Team {
  id: string
  workspaceId: string
  name: string
  description?: string
  department?: string
  leadId?: string
  memberIds: string[]
  color: string
}

export interface ProjectCategory {
  id: string
  workspaceId: string
  name: string
  color: string
  projectCount: number
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description?: string
  key: string
  status: ProjectStatus
  visibility: ProjectVisibility
  categoryId?: string
  ownerId: string
  memberIds: string[]
  startDate?: string
  dueDate?: string
  progress: number
  taskCount: number
  completedTaskCount: number
  templateId?: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
  deletedAt?: string
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface ChecklistItem {
  id: string
  title: string
  completed: boolean
  assigneeId?: string
  dueDate?: string
}

export interface Task {
  id: string
  projectId: string
  workspaceId: string
  key: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string
  reporterId: string
  labelIds: string[]
  startDate?: string
  dueDate?: string
  estimateHours?: number
  actualHours?: number
  storyPoints?: number
  progress: number
  columnId?: string
  order: number
  parentId?: string
  blockedByIds: string[]
  blockingIds: string[]
  checklist: ChecklistItem[]
  attachmentCount: number
  commentCount: number
  isRecurring: boolean
  createdAt: string
  updatedAt: string
}

export interface KanbanColumn {
  id: string
  projectId: string
  name: string
  status: TaskStatus
  order: number
  wipLimit?: number
  color: string
}

export interface Comment {
  id: string
  entityType: "task" | "project" | "file"
  entityId: string
  authorId: string
  body: string
  mentions: string[]
  createdAt: string
  updatedAt?: string
  parentId?: string
}

export interface Attachment {
  id: string
  name: string
  mimeType: string
  size: number
  url: string
  folderId?: string
  projectId?: string
  taskId?: string
  workspaceId: string
  uploadedById: string
  version: number
  createdAt: string
  deletedAt?: string
}

export interface FileFolder {
  id: string
  name: string
  parentId?: string
  workspaceId: string
  projectId?: string
}

export interface Activity {
  id: string
  workspaceId: string
  actorId: string
  action: string
  entityType: ActivityEntityType
  entityId: string
  entityName: string
  metadata?: Record<string, string>
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  entityType?: ActivityEntityType
  entityId?: string
  read: boolean
  createdAt: string
}

export interface Sprint {
  id: string
  workspaceId: string
  projectId?: string
  name: string
  goal?: string
  status: "planning" | "active" | "completed"
  startDate: string
  endDate: string
  capacity: number
  committedPoints: number
  completedPoints: number
  taskIds: string[]
}

export interface RoadmapItem {
  id: string
  workspaceId: string
  title: string
  description?: string
  status: "planned" | "in_progress" | "shipped" | "cancelled"
  startDate: string
  endDate: string
  ownerId?: string
  initiative?: string
  release?: string
}

export interface KeyResult {
  id: string
  title: string
  target: number
  current: number
  unit: string
}

export interface OKR {
  id: string
  workspaceId: string
  objective: string
  ownerId: string
  confidence: number
  progress: number
  keyResults: KeyResult[]
  period: string
  status: "on_track" | "at_risk" | "behind" | "completed"
}

export interface TimeEntry {
  id: string
  workspaceId: string
  taskId: string
  userId: string
  hours: number
  note?: string
  date: string
  billable: boolean
}

export interface ApprovalRequest {
  id: string
  workspaceId: string
  title: string
  description?: string
  requesterId: string
  approverIds: string[]
  status: ApprovalStatus
  entityType: string
  entityId: string
  createdAt: string
  decidedAt?: string
}

export interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: string[]
  limits: {
    workspaces: number
    members: number
    projects: number
    storageGb: number
  }
  popular?: boolean
  status: "active" | "deprecated"
}

export interface Invoice {
  id: string
  workspaceId: string
  number: string
  amount: number
  currency: string
  status: InvoiceStatus
  issuedAt: string
  dueAt: string
  pdfUrl?: string
}

export interface Payment {
  id: string
  workspaceId: string
  invoiceId?: string
  amount: number
  currency: string
  status: PaymentStatus
  method: string
  createdAt: string
  customerName: string
}

export interface SavedFilter {
  id: string
  name: string
  scope: "workspace" | "project" | "global"
  workspaceId?: string
  projectId?: string
  ownerId: string
  conditions: FilterCondition[]
  visibility: "private" | "shared"
  lastUsedAt?: string
  isDefault?: boolean
}

export interface FilterCondition {
  id: string
  field: string
  operator: "eq" | "neq" | "contains" | "gt" | "lt" | "in" | "between"
  value: string | string[]
}

export interface Session {
  id: string
  device: string
  browser: string
  location: string
  ip: string
  lastActiveAt: string
  current: boolean
}

export interface SystemLog {
  id: string
  severity: "info" | "warning" | "error" | "critical"
  source: string
  message: string
  details?: Record<string, unknown>
  createdAt: string
}

export interface PageState {
  isLoading?: boolean
  isEmpty?: boolean
  isError?: boolean
  errorMessage?: string
}
