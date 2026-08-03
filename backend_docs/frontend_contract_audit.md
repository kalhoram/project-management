# Frontend Contract Audit — YadBox (یادباکس)

> Generated from the existing Next.js frontend. This document is the **source of truth** for backend API shapes, enums, and capabilities. Backend implementations must match these contracts so `lib/api/*` mock services can be swapped without breaking pages.

**App:** یادباکس (YadBox) — Persian/RTL project-management SaaS  
**Frontend stack:** Next.js App Router, TanStack Query, Zustand, RHF + Zod, shadcn/ui  
**Mock layer:** `lib/api/*.service.ts` + `lib/mock/data.ts` + `lib/types/index.ts`

---

## 1. Route Inventory

### Auth
| Route | Capability |
|-------|------------|
| `/login` | Login (email **or** username), remember, demo-account quick login |
| `/signup` | Register: name, email, password, confirm, terms |
| `/forgot-password` | Request reset by email |
| `/reset-password?token=` | Set new password |
| `/verify-email?token=&email=` | Email verification + resend |
| `/two-factor` | OTP (6 digit) or recovery code |
| `/auth/google` | Google OAuth connect flow |

### Onboarding
| Route | Capability |
|-------|------------|
| `/onboarding` | Stepper entry |
| `/onboarding/workspace` | Create workspace draft (name, slug, size, industry) |
| `/onboarding/invite` | Invite list (email + role) |
| `/onboarding/templates` | Pick first-project template |
| `/onboarding/guide` | Post-setup guide |

### Dashboard / Global
| Route | Capability |
|-------|------------|
| `/dashboard` | Global metrics |
| `/activity` | Global activity feed |
| `/notifications` | In-app notifications |
| `/comments` | All comments |
| `/mentions` | Mentions for current user |
| `/search` | Global search + client filters |
| `/kanban` | Shortcut/demo kanban |

### Settings
| Route | Capability |
|-------|------------|
| `/settings/profile` | name, jobTitle, bio |
| `/settings/account` | email, timezone |
| `/settings/password` | change password |
| `/settings/sessions` | list/revoke sessions |
| `/settings/notifications` | preference toggles (local only today) |
| `/settings/language` | language/locale |
| `/settings/appearance` | theme/density (mostly client) |
| `/settings/google` | connect/disconnect Google |

### Workspaces
| Route | Capability |
|-------|------------|
| `/workspaces` | List workspaces |
| `/workspaces/[workspaceId]` | Workspace dashboard |
| `.../settings` | Workspace settings |
| `.../members` | Members list / invite / role |
| `.../teams` | Teams/departments CRUD UI |
| `.../roles` | Roles + permission matrix |
| `.../security` | Security settings UI |
| `.../notifications` | Workspace notification settings |
| `.../project-categories` | Categories CRUD |
| `.../files` | Workspace files |
| `.../sprints` | Sprint management |
| `.../roadmap` | Roadmap items |
| `.../okr` | OKRs |
| `.../time-tracking` | Time entries |
| `.../capacity` | Capacity plan |
| `.../request-form` | Request forms |
| `.../approvals` | Approval workflows |
| `.../estimation` | Estimate vs actual |

### Projects & Views
| Route | Capability |
|-------|------------|
| `.../projects` | Active projects |
| `.../projects/new` | Create project |
| `.../projects/archived` | Archived list |
| `.../projects/deleted` | Soft-deleted list |
| `.../projects/[projectId]` | Project overview |
| `.../edit` | Edit project |
| `.../kanban` | Kanban board |
| `.../list` | List/table view |
| `.../calendar` | Calendar |
| `.../timeline` | Timeline |
| `.../gantt` | Gantt |
| `.../members` | Project members |
| `.../files` | Project files |
| `.../activity` | Project activity |
| `.../reports` | Project reports |
| `.../settings` | Project settings (archive/delete) |
| `.../settings-view` | View/card settings |
| `.../tasks/new` | Create task |
| `.../tasks/[taskId]` | Task detail |
| `.../tasks/[taskId]/edit` | Edit task |

### Billing
| Route | Capability |
|-------|------------|
| `/billing/plans` | Plan catalog |
| `/billing/select-plan` | Select plan |
| `/billing/subscription` | Current subscription + usage |
| `/billing/invoices` | Invoice list |
| `/billing/history` | Payment history |
| `/billing/payment` | Payment flow |
| `/billing/result` | Payment result |

### Admin (system)
| Route | Capability |
|-------|------------|
| `/admin` | Admin dashboard metrics |
| `/admin/users`, `/admin/users/[userId]` | Users |
| `/admin/workspaces`, `/admin/workspaces/[workspaceId]` | Workspaces |
| `/admin/projects` | All projects |
| `/admin/plans` | Plan CRUD |
| `/admin/payments` | Payments |
| `/admin/reports` | System reports |
| `/admin/logs` | System logs |
| `/admin/settings` | Feature flags, maintenance |

### System pages
`/unauthorized`, `/access-denied`, `/maintenance`, `/500`, `/not-found`

---

## 2. Entity Inventory

Canonical TypeScript shapes live in `lib/types/index.ts`. Field names below are **exact** frontend contract names (camelCase JSON).

### Enums
| Name | Values |
|------|--------|
| `UserStatus` | `active`, `inactive`, `invited`, `suspended` |
| `WorkspaceRole` | `owner`, `admin`, `member`, `guest`, `viewer` |
| `ProjectVisibility` | `private`, `team`, `public` |
| `ProjectStatus` | `active`, `on_hold`, `completed`, `archived`, `deleted` |
| `TaskStatus` | `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled` |
| `TaskPriority` | `highest`, `high`, `medium`, `low`, `lowest` |
| `NotificationType` | `mention`, `assignment`, `comment`, `deadline`, `status_change`, `system` |
| `PlanInterval` | `monthly`, `yearly` |
| `PaymentStatus` | `paid`, `pending`, `failed`, `refunded` |
| `InvoiceStatus` | `draft`, `open`, `paid`, `void`, `overdue` |
| `ApprovalStatus` | `pending`, `approved`, `rejected` |
| `ActivityEntityType` | `task`, `project`, `workspace`, `file`, `comment`, `user`, `sprint` |
| `Sprint.status` | `planning`, `active`, `completed` |
| `RoadmapItem.status` | `planned`, `in_progress`, `shipped`, `cancelled` |
| `OKR.status` | `on_track`, `at_risk`, `behind`, `completed` |
| `Workspace.status` | `active`, `suspended`, `trial` (+ UI label `archived`) |
| `Subscription.status` (UI) | `active`, `cancelled`, `past_due`, `trialing` |
| `SavedFilter.scope` | `workspace`, `project`, `global` |
| `FilterCondition.operator` | `eq`, `neq`, `contains`, `gt`, `lt`, `in`, `between` |
| `SystemLog.severity` | `info`, `warning`, `error`, `critical` |

### Core entities (fields)
- **User:** `id`, `name`, `email`, `username?`, `avatarUrl?`, `bio?`, `jobTitle?`, `status`, `role?`, `timezone?`, `language?`, `createdAt`, `lastActiveAt?`
- **Permission:** `id`, `key`, `label`, `description`, `category`
- **Role:** `id`, `workspaceId`, `name`, `description`, `isSystem`, `permissions[]`, `memberCount`
- **Workspace:** `id`, `name`, `slug`, `logoUrl?`, `description?`, `industry?`, `companySize?`, `timezone`, `defaultVisibility`, `planId`, `ownerId`, `memberCount`, `projectCount`, `createdAt`, `status`
- **Team:** `id`, `workspaceId`, `name`, `description?`, `department?`, `leadId?`, `memberIds[]`, `color`
- **ProjectCategory:** `id`, `workspaceId`, `name`, `color`, `projectCount`
- **Project:** `id`, `workspaceId`, `name`, `description?`, `key`, `status`, `visibility`, `categoryId?`, `ownerId`, `memberIds[]`, `startDate?`, `dueDate?`, `progress`, `taskCount`, `completedTaskCount`, `templateId?`, `createdAt`, `updatedAt`, `archivedAt?`, `deletedAt?`
- **Label:** `id`, `name`, `color`
- **ChecklistItem:** `id`, `title`, `completed`, `assigneeId?`, `dueDate?`
- **Task:** `id`, `projectId`, `workspaceId`, `key`, `title`, `description?`, `status`, `priority`, `assigneeId?`, `reporterId`, `labelIds[]`, `startDate?`, `dueDate?`, `estimateHours?`, `actualHours?`, `storyPoints?`, `progress`, `columnId?`, `order`, `parentId?`, `blockedByIds[]`, `blockingIds[]`, `checklist[]`, `attachmentCount`, `commentCount`, `isRecurring`, `createdAt`, `updatedAt`
- **KanbanColumn:** `id`, `projectId`, `name`, `status`, `order`, `wipLimit?`, `color`
- **Comment:** `id`, `entityType` (`task`\|`project`\|`file`), `entityId`, `authorId`, `body`, `mentions[]`, `createdAt`, `updatedAt?`, `parentId?`
- **Attachment:** `id`, `name`, `mimeType`, `size`, `url`, `folderId?`, `projectId?`, `taskId?`, `workspaceId`, `uploadedById`, `version`, `createdAt`, `deletedAt?`
- **FileFolder:** `id`, `name`, `parentId?`, `workspaceId`, `projectId?`
- **Activity:** `id`, `workspaceId`, `actorId`, `action`, `entityType`, `entityId`, `entityName`, `metadata?`, `createdAt`
- **Notification:** `id`, `userId`, `type`, `title`, `body`, `entityType?`, `entityId?`, `read`, `createdAt`
- **Sprint / RoadmapItem / OKR+KeyResult / TimeEntry / ApprovalRequest / Plan / Invoice / Payment / SavedFilter / Session / SystemLog** — as in `lib/types/index.ts`

### Permission keys (exact)
```
workspace.manage
members.invite
members.manage
projects.create
projects.manage
tasks.create
tasks.delete
billing.manage
reports.view
files.upload
```

### Role → permissions (demo RBAC)
| Role | Permissions |
|------|-------------|
| owner | all |
| admin | all except `billing.manage` |
| member | `projects.create`, `tasks.create`, `reports.view`, `files.upload` |
| guest | none |
| viewer | `reports.view` |

### Demo seed identities
| Login | Password | Role | ID |
|-------|----------|------|-----|
| `admin` / `admin@local` | `123/321` | owner | `user-admin` |
| `owner@yadbox.app` | `demo` | owner | `user-1` |
| `admin@yadbox.app` | `demo` | admin | `user-2` |
| `member@yadbox.app` | `demo` | member | `user-3` |
| `guest@yadbox.app` | `demo` | guest | `user-4` |
| `viewer@yadbox.app` | `demo` | viewer | `user-5` |

Default workspace/project: `ws-1` / `proj-1`. Timezone default for users: `Asia/Tehran`, language `fa`.

---

## 3. API Need Inventory (from `lib/api/*` + hooks)

Hooks live in `hooks/queries/index.ts`. Backend must provide equivalents under `/api/v1`.

### Auth / User
| Frontend fn | Need |
|-------------|------|
| `login(email, password) → User` | POST login; accept email **or** username; return User (+ tokens) |
| `logout() → {success}` | POST logout / revoke refresh |
| `signup({name,email,password}) → User` | POST signup; reject duplicate email |
| `requestPasswordReset(email)` | POST forgot-password |
| `resetPassword(token, password)` | POST reset-password |
| `verifyEmail(token) → {success, expired?}` | POST verify-email |
| `resendVerificationEmail(email)` | POST resend-verification |
| `verifyTwoFactor(code)` | POST 2FA verify / recovery |
| `getCurrentUser() → User` | GET me |
| `connectGoogle(attempt)` | Google OAuth connect |
| `getSessions() → Session[]` | GET sessions |
| `revokeSession(id)` | DELETE session |
| `updateProfile(Partial<User>)` | PATCH profile |
| `changePassword(current, new)` | POST change password |

### Workspace
| Frontend fn | Need |
|-------------|------|
| `getWorkspaces` | list membership workspaces |
| `getWorkspace(id)` | detail |
| `getWorkspaceMembers(id)` | members (must be workspace-scoped) |
| `getWorkspaceTeams(id)` | teams |
| `getWorkspaceRoles(id)` | roles |
| `getPermissions` | permission catalog |
| `updateWorkspace(id, data)` | patch settings |

### Project
| Frontend fn | Need |
|-------------|------|
| `getProjects(ws)` | active (exclude archived/deleted) |
| `getArchivedProjects` / `getDeletedProjects` | filtered lists |
| `getProject` / `createProject` / `updateProject` | CRUD |
| `getProjectCategories` | categories |
| `getKanbanColumns(projectId)` | columns sorted by `order` |

### Task
| Frontend fn | Need |
|-------------|------|
| `getTasks(projectId)` | sorted by `order` |
| `getWorkspaceTasks(ws)` | workspace-wide |
| `getTask` / `createTask` / `updateTask` | CRUD |
| `getTaskComments(taskId)` | comments |
| `getLabels` | labels (prefer workspace-scoped) |

### Files
| Frontend fn | Need |
|-------------|------|
| `getWorkspaceFiles` / `getProjectFiles` / `getTaskFiles` | non-deleted |
| `getDeletedFiles` | trash |
| `getFolders(ws, projectId?)` | folders |
| `getFile(id)` | detail |
| *(gap)* upload / restore / version | required for production |

### Notifications / Activity
| Frontend fn | Need |
|-------------|------|
| `getNotifications(userId)` | list |
| `markNotificationRead` / `markAllNotificationsRead` | mutations |
| `getActivities(ws?)` | feed |
| `getProjectActivities(ws, projectId)` | project feed |

### Search / Reports / Billing / Admin / Advanced
See sections 7–10 and service inventory from exploration. Key composite responses:

**`globalSearch(q)` →**
```ts
{ tasks: Task[]; projects: Project[]; users: User[]; files: Attachment[]; comments: Comment[] }
```

**`getDashboardMetrics(ws?)` →**
```ts
{ totalWorkspaces, totalProjects, openTasks, overdueTasks, completedTasks, members }
```

**`getTaskStatusReport(projectId)` →** `{ status, count }[]`  
**`getMemberPerformance(ws)` →** `{ userId, name, completed, overdue, open, avgHours }[]`  
**`getTimeTrackingReport(ws)` →** `{ totalHours, billableHours, entries: TimeEntry[] }`  
**`getProgressTrend(projectId)` →** `{ week, progress }[]`  

**`getSubscription(ws)` →**
```ts
{ workspaceId, plan: Plan, renewalDate, status, usage: { members, projects, storageGb } }
```

**`getCapacity(ws)` →** `{ userId, name, allocatedHours, availableHours, utilization }[]`  
**`getEstimation(ws)` →** `{ taskId, key, title, estimateHours, actualHours, storyPoints, variance }[]`  

**`getAdminDashboard` →** `{ users, workspaces, projects, revenue, alerts, recentActivity }`  
**`getAdminUser(id)` →** `{ user, workspaces, projects }`  
**`getAdminWorkspace(id)` →** `{ workspace, projects, members }`  
**`getAdminReports` →** `{ activeUsers, workspaceGrowth, errors }`  
**`getAdminSettings` →**
```ts
{ maintenanceMode, featureFlags: { aiAssist, advancedReports, sso, betaKanban, exportPdf }, supportEmail, maxUploadMb }
```

### Advanced feature lists
`getSprints`, `getRoadmap`, `getOKRs`, `getTimeEntries`, `getApprovals`, `getComments`, `getMentions(userId)`, `getMyTasks(userId)`, `getOverdueTasks(userId?)`, `getUpcomingDeadlines(userId?, days=14)`

---

## 4. Forms Inventory

| Form | Fields / validation (Persian messages where present) |
|------|------------------------------------------------------|
| Login | `email` min1 («نام کاربری یا ایمیل الزامی است»), `password` min1, `remember` |
| Signup | `name` min2, `email` valid, `password` min8, `confirmPassword` match, `terms` true |
| Forgot | `email` valid |
| Reset | `password` min8 + password rules, `confirmPassword` match |
| 2FA | OTP 6 chars OR recovery ≥6 |
| Onboarding workspace | `workspaceName` min2, `workspaceSlug` `/^[a-z0-9-]+$/`, `companySize`, `industry` |
| Onboarding invite | `{email, role∈admin\|member\|guest\|viewer}[]` |
| Onboarding template | `templateId` ∈ PROJECT_TEMPLATES |
| Task | title min2, description?, status enum, priority enum, assigneeId?, start/due, estimateHours?, storyPoints?, labelIds? |
| Project | name min2, key 2–6 `/^[A-Z0-9]+$/`, description?, visibility, categoryId?, templateId?, dates |
| Profile | name, jobTitle, bio |
| Account | email, timezone |
| Password | current, next min8, confirm |
| Workspace settings | name, description, industry, companySize, timezone, defaultVisibility |
| Project settings | name, description, status∈active\|on_hold\|completed, visibility; archive/delete actions |

**Onboarding draft (sessionStorage `yadbox-onboarding`):**
```ts
{ workspaceName?, workspaceSlug?, companySize?, industry?, invites?: {email, role}[], templateId? }
```
**Gap:** no finalize API in frontend — backend must provide `POST /api/v1/onboarding/complete`.

---

## 5. Filters / Sorting / Grouping / Pagination

### Task filters (`lib/task-utils.ts` — currently client-side)
```ts
{ search: string; statuses: TaskStatus[]; priorities: TaskPriority[]; assigneeIds: string[]; labelIds: string[] }
```
Backend query params (recommended): `q`, `status`, `priority`, `assignee`, `label` (multi), plus `sort=order|dueDate|priority|updatedAt`, `page`, `pageSize`.

### Search page (client post-filter)
`statusFilter`, `priorityFilter`, `assigneeOnly` (assigned-to-me)

### Views
- Kanban: columns by `status`/`order`; drag reorder task within/across columns; WIP limits
- List: table + group-by status/assignee (client); inline updates via `updateTask`
- Calendar: `month|week|day` — needs date-range task query
- Timeline/Gantt: zoom `day|week|month`; needs bars + dependencies

### Pagination
Frontend mocks return full arrays. Backend should use a stable envelope:
```ts
{ items: T[]; total: number; page: number; pageSize: number; hasMore: boolean }
```
Frontend can ignore pagination fields initially while migrating.

### Saved filters
Entity exists (`SavedFilter` + `FilterCondition`); UI surface is partial — backend should still CRUD.

---

## 6. Admin Inventory

| Need | Data |
|------|------|
| Dashboard | users, workspaces, projects counts; revenue (paid payments sum); alerts (error/critical logs); recent activity |
| Users | list + detail with related workspaces/projects |
| Workspaces | list + detail with projects/members |
| Projects | cross-tenant list |
| Plans | list + create/update (admin) |
| Payments | all payments |
| Reports | time-series: activeUsers, workspaceGrowth, errors |
| Logs | SystemLog stream |
| Settings | maintenanceMode, featureFlags, supportEmail, maxUploadMb |

System admin must be **separate** from workspace `owner` (flag `is_system_admin` on User).

---

## 7. Billing Inventory

| Need | Notes |
|------|-------|
| Plans listing | `status === "active"` for customer; admin sees all |
| Plan fields | priceMonthly/Yearly, features[], limits{workspaces,members,projects,storageGb}, popular?, status |
| Subscription | plan, renewalDate, status, usage counters |
| Select/upgrade/cancel | mutations |
| Invoices | list/detail + pdfUrl |
| Payments | history + webhook-ready provider abstraction |
| Result page | payment outcome |

---

## 8. Realtime Inventory

**Current frontend:** no WebSocket/SSE/polling. React Query refetch only.

**Backend should still provide** (forward-compatible):
- WS channel per workspace / user
- Events: `task.updated`, `task.moved`, `comment.created`, `notification.created`, `approval.updated`, `project.activity`

Frontend can adopt later without contract break.

---

## 9. Constants & Templates Backend Must Know

- `PROJECT_TEMPLATES`: kanban, scrum, marketing, roadmap, bugs, blank
- `COMPANY_SIZES`, `INDUSTRIES`
- Persian labels for statuses/priorities/roles (error messages & notifications)
- Feature flags: `aiAssist`, `advancedReports`, `sso`, `betaKanban`, `exportPdf`

---

## 10. UX States Backend Must Support

| State | Source |
|-------|--------|
| Loading | React Query `isLoading` — any latency OK |
| Empty | empty arrays → EmptyState components |
| Error | thrown Error / HTTP errors → ErrorState; prefer Persian `message` |
| Unauthorized | `/unauthorized`, `/access-denied` |
| Maintenance | `/maintenance` when `maintenanceMode` |
| Suspended user | login reject |
| Soft-deleted files/projects | trash lists + restore |

---

## 11. Unresolved Ambiguities

1. **Auth tokens:** Frontend uses `localStorage` user id only. Decision: JWT access + refresh cookies/headers; keep `User` response shape identical.
2. **ID format:** Mock uses `ws-1`, `task-1`. Decision: UUID primary keys; seed may keep stable demo slugs; mapping layer optional for demo IDs.
3. **Labels scope:** Global in mock. Decision: workspace-scoped labels.
4. **Workspace members:** Mock ignores `workspaceId`. Decision: real membership table.
5. **Notification prefs:** UI not wired. Decision: persist server-side under settings.
6. **Onboarding complete:** No API. Decision: add `POST /onboarding/complete`.
7. **File upload:** Read-only mocks. Decision: full upload/version/trash API.
8. **Kanban move:** Client-only `updateTask`. Decision: dedicated move/reorder endpoints + task PATCH.
9. **Request forms:** Page exists; mock entity thin. Decision: form schema + submissions models.
10. **Recurring tasks:** `isRecurring` flag only. Decision: RRULE-like config + worker generation.
11. **System admin vs workspace owner:** Overlapped in demo (`user-admin`). Decision: separate `is_system_admin`.
12. **Currency:** Invoices use string currency; assume `IRR`/`IRT` or `USD` — seed with `IRR`.
13. **Date format:** ISO-8601 strings in JSON; store UTC in DB; respect user/workspace timezone on aggregation.

---

## 12. Proposed Backend Contract Decisions

1. **API prefix:** `/api/v1`
2. **JSON:** camelCase field names matching TypeScript interfaces (Pydantic aliases)
3. **Auth header:** `Authorization: Bearer <access_token>`; refresh via `POST /auth/refresh`
4. **Error envelope:**
```json
{
  "success": false,
  "code": "TASK_STATUS_INVALID",
  "message": "تغییر وضعیت این تسک در وضعیت فعلی مجاز نیست.",
  "details": {}
}
```
5. **Success:** return entity directly **or** `{ success: true, data: T }` — **Decision: return entity/array directly** to match mock services; wrap only for `{success}`-style mutations that already return that shape.
6. **Persian messages** for all user-facing errors/validation.
7. **Tenant boundary:** `workspace_id` on all domain rows; enforce in every query.
8. **Soft delete:** projects, tasks (optional), files; `deletedAt` / status fields as in types.
9. **Permissions:** enforce the 10 keys above; extend with finer keys as needed without breaking UI.
10. **Replace path:** each `lib/api/*.service.ts` method maps 1:1 to HTTP — see `frontend_to_backend_mapping.md`.

---

## 13. Mock Service → HTTP Mapping Summary

| Service file | Approx. methods | Primary backend modules |
|--------------|-----------------|-------------------------|
| `auth.service.ts` | 14 | auth, users, sessions |
| `workspace.service.ts` | 7 | workspaces, teams, roles |
| `project.service.ts` | 8 | projects, categories, kanban |
| `task.service.ts` | 7 | tasks, comments, labels |
| `file.service.ts` | 6 (+uploads) | files, folders |
| `notification.service.ts` | 5 | notifications, activity |
| `search.service.ts` | 1 | search |
| `report.service.ts` | 5 | reports, dashboard |
| `billing.service.ts` | 5 | billing |
| `admin.service.ts` | 11 | admin |
| `advanced.service.ts` | 14 | sprints, okr, time, etc. |

**Total frontend-consumed operations ≈ 80+**; backend expands with invite, bulk, export, WS, jobs, webhooks to cover full UI + production needs listed in the product brief.
