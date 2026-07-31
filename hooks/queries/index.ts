"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import * as workspaceService from "@/lib/api/workspace.service"
import * as projectService from "@/lib/api/project.service"
import * as taskService from "@/lib/api/task.service"
import * as notificationService from "@/lib/api/notification.service"
import * as reportService from "@/lib/api/report.service"
import * as billingService from "@/lib/api/billing.service"
import * as fileService from "@/lib/api/file.service"
import * as searchService from "@/lib/api/search.service"
import * as adminService from "@/lib/api/admin.service"
import * as authService from "@/lib/api/auth.service"
import * as advancedService from "@/lib/api/advanced.service"

export function useCurrentUser() {
  return useQuery({ queryKey: ["currentUser"], queryFn: authService.getCurrentUser })
}

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
  })
}

export function useSignup() {
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      authService.signup(data),
  })
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => authService.requestPasswordReset(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
  })
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
  })
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: (email: string) => authService.resendVerificationEmail(email),
  })
}

export function useVerifyTwoFactor() {
  return useMutation({
    mutationFn: (code: string) => authService.verifyTwoFactor(code),
  })
}

export function useConnectGoogle() {
  return useMutation({
    mutationFn: (attempt: number) => authService.connectGoogle(attempt),
  })
}

export function useWorkspaces() {
  return useQuery({ queryKey: ["workspaces"], queryFn: workspaceService.getWorkspaces })
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => workspaceService.getWorkspace(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceService.getWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useWorkspaceTeams(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-teams", workspaceId],
    queryFn: () => workspaceService.getWorkspaceTeams(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useWorkspaceRoles(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-roles", workspaceId],
    queryFn: () => workspaceService.getWorkspaceRoles(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => projectService.getProjects(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  })
}

export function useKanbanColumns(projectId: string) {
  return useQuery({
    queryKey: ["kanban-columns", projectId],
    queryFn: () => projectService.getKanbanColumns(projectId),
    enabled: !!projectId,
  })
}

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => taskService.getTasks(projectId),
    enabled: !!projectId,
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => taskService.getTask(taskId),
    enabled: !!taskId,
  })
}

export function useWorkspaceTasks(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-tasks", workspaceId],
    queryFn: () => taskService.getWorkspaceTasks(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => notificationService.getNotifications(userId),
    enabled: !!userId,
  })
}

export function useActivities(workspaceId?: string) {
  return useQuery({
    queryKey: ["activities", workspaceId ?? "all"],
    queryFn: () => notificationService.getActivities(workspaceId),
  })
}

export function useDashboardMetrics(workspaceId?: string) {
  return useQuery({
    queryKey: ["dashboard-metrics", workspaceId ?? "global"],
    queryFn: () => reportService.getDashboardMetrics(workspaceId),
  })
}

export function usePlans() {
  return useQuery({ queryKey: ["plans"], queryFn: billingService.getPlans })
}

export function useSubscription(workspaceId: string) {
  return useQuery({
    queryKey: ["subscription", workspaceId],
    queryFn: () => billingService.getSubscription(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: ["project-files", projectId],
    queryFn: () => fileService.getProjectFiles(projectId),
    enabled: !!projectId,
  })
}

export function useWorkspaceFiles(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-files", workspaceId],
    queryFn: () => fileService.getWorkspaceFiles(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchService.globalSearch(query),
    enabled: query.length > 0,
  })
}

export function useAdminDashboard() {
  return useQuery({ queryKey: ["admin-dashboard"], queryFn: adminService.getAdminDashboard })
}

export function usePermissions() {
  return useQuery({ queryKey: ["permissions"], queryFn: workspaceService.getPermissions })
}

export function useArchivedProjects(workspaceId: string) {
  return useQuery({
    queryKey: ["projects-archived", workspaceId],
    queryFn: () => projectService.getArchivedProjects(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useDeletedProjects(workspaceId: string) {
  return useQuery({
    queryKey: ["projects-deleted", workspaceId],
    queryFn: () => projectService.getDeletedProjects(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useProjectCategories(workspaceId: string) {
  return useQuery({
    queryKey: ["project-categories", workspaceId],
    queryFn: () => projectService.getProjectCategories(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useMemberPerformance(workspaceId: string) {
  return useQuery({
    queryKey: ["member-performance", workspaceId],
    queryFn: () => reportService.getMemberPerformance(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useCreateProject() {
  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string
      data: Parameters<typeof projectService.createProject>[1]
    }) => projectService.createProject(workspaceId, data),
  })
}

export function useUpdateProject() {
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string
      data: Parameters<typeof projectService.updateProject>[1]
    }) => projectService.updateProject(projectId, data),
  })
}

export function useUpdateWorkspace() {
  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string
      data: Parameters<typeof workspaceService.updateWorkspace>[1]
    }) => workspaceService.updateWorkspace(workspaceId, data),
  })
}

export function useSprints(workspaceId: string) {
  return useQuery({
    queryKey: ["sprints", workspaceId],
    queryFn: () => advancedService.getSprints(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useRoadmap(workspaceId: string) {
  return useQuery({
    queryKey: ["roadmap", workspaceId],
    queryFn: () => advancedService.getRoadmap(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useOKRs(workspaceId: string) {
  return useQuery({
    queryKey: ["okrs", workspaceId],
    queryFn: () => advancedService.getOKRs(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useTimeEntries(workspaceId: string) {
  return useQuery({
    queryKey: ["time-entries", workspaceId],
    queryFn: () => advancedService.getTimeEntries(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useApprovals(workspaceId: string) {
  return useQuery({
    queryKey: ["approvals", workspaceId],
    queryFn: () => advancedService.getApprovals(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useCapacity(workspaceId: string) {
  return useQuery({
    queryKey: ["capacity", workspaceId],
    queryFn: () => advancedService.getCapacity(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useEstimation(workspaceId: string) {
  return useQuery({
    queryKey: ["estimation", workspaceId],
    queryFn: () => advancedService.getEstimation(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useComments() {
  return useQuery({ queryKey: ["comments"], queryFn: advancedService.getComments })
}

export function useMentions(userId: string) {
  return useQuery({
    queryKey: ["mentions", userId],
    queryFn: () => advancedService.getMentions(userId),
    enabled: !!userId,
  })
}

export function useMyTasks(userId: string) {
  return useQuery({
    queryKey: ["my-tasks", userId],
    queryFn: () => advancedService.getMyTasks(userId),
    enabled: !!userId,
  })
}

export function useOverdueTasks(userId?: string) {
  return useQuery({
    queryKey: ["overdue-tasks", userId ?? "all"],
    queryFn: () => advancedService.getOverdueTasks(userId),
  })
}

export function useUpcomingDeadlines(userId?: string) {
  return useQuery({
    queryKey: ["upcoming-deadlines", userId ?? "all"],
    queryFn: () => advancedService.getUpcomingDeadlines(userId),
  })
}

export function useProjectActivities(workspaceId: string, projectId: string) {
  return useQuery({
    queryKey: ["project-activities", workspaceId, projectId],
    queryFn: () => notificationService.getProjectActivities(workspaceId, projectId),
    enabled: !!workspaceId && !!projectId,
  })
}

export function useTaskStatusReport(projectId: string) {
  return useQuery({
    queryKey: ["task-status-report", projectId],
    queryFn: () => reportService.getTaskStatusReport(projectId),
    enabled: !!projectId,
  })
}

export function useProgressTrend(projectId: string) {
  return useQuery({
    queryKey: ["progress-trend", projectId],
    queryFn: () => reportService.getProgressTrend(projectId),
    enabled: !!projectId,
  })
}

export function useTimeTrackingReport(workspaceId: string) {
  return useQuery({
    queryKey: ["time-tracking-report", workspaceId],
    queryFn: () => reportService.getTimeTrackingReport(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useInvoices(workspaceId: string) {
  return useQuery({
    queryKey: ["invoices", workspaceId],
    queryFn: () => billingService.getInvoices(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useBillingPayments(workspaceId?: string) {
  return useQuery({
    queryKey: ["billing-payments", workspaceId ?? "all"],
    queryFn: () => billingService.getPayments(workspaceId),
  })
}

export function useSessions() {
  return useQuery({ queryKey: ["sessions"], queryFn: authService.getSessions })
}

export function useAdminUsers() {
  return useQuery({ queryKey: ["admin-users"], queryFn: adminService.getAdminUsers })
}

export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => adminService.getAdminUser(userId),
    enabled: !!userId,
  })
}

export function useAdminWorkspaces() {
  return useQuery({ queryKey: ["admin-workspaces"], queryFn: adminService.getAdminWorkspaces })
}

export function useAdminWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ["admin-workspace", workspaceId],
    queryFn: () => adminService.getAdminWorkspace(workspaceId),
    enabled: !!workspaceId,
  })
}

export function useAdminProjects() {
  return useQuery({ queryKey: ["admin-projects"], queryFn: adminService.getAdminProjects })
}

export function useAdminPlans() {
  return useQuery({ queryKey: ["admin-plans"], queryFn: adminService.getAdminPlans })
}

export function useAdminPayments() {
  return useQuery({ queryKey: ["admin-payments"], queryFn: adminService.getAdminPayments })
}

export function useAdminLogs() {
  return useQuery({ queryKey: ["admin-logs"], queryFn: adminService.getAdminLogs })
}

export function useAdminReports() {
  return useQuery({ queryKey: ["admin-reports"], queryFn: adminService.getAdminReports })
}

export function useAdminSettings() {
  return useQuery({ queryKey: ["admin-settings"], queryFn: advancedService.getAdminSettings })
}

export function useFolders(workspaceId: string, projectId?: string) {
  return useQuery({
    queryKey: ["folders", workspaceId, projectId ?? "workspace"],
    queryFn: () => fileService.getFolders(workspaceId, projectId),
    enabled: !!workspaceId,
  })
}

export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => taskService.getTaskComments(taskId),
    enabled: !!taskId,
  })
}

export function useLabels() {
  return useQuery({ queryKey: ["labels"], queryFn: taskService.getLabels })
}

export function useCreateTask() {
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string
      data: Parameters<typeof taskService.createTask>[1]
    }) => taskService.createTask(projectId, data),
  })
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string
      data: Parameters<typeof taskService.updateTask>[1]
    }) => taskService.updateTask(taskId, data),
  })
}
