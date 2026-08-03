/**
 * Generates route pages for YadBox PM SaaS.
 * Run: node scripts/scaffold-pages.mjs
 */
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function write(filePath, content) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, "utf8")
}

function pageShell({
  title,
  description,
  layout = "dashboard",
  client = true,
  body,
  imports = [],
}) {
  const layoutImport =
    layout === "auth"
      ? `import { AuthShell } from "@/components/layout/auth-shell"`
      : layout === "none"
        ? ""
        : `import { DashboardShell } from "@/components/layout/dashboard-shell"`
  const headerImport = `import { PageHeader } from "@/components/common/page-header"`
  const allImports = [
    client ? `"use client"` : "",
    layoutImport,
    headerImport,
    ...imports,
  ]
    .filter(Boolean)
    .join("\n")

  const wrapStart =
    layout === "auth"
      ? `<AuthShell title="${title}" subtitle="${description ?? ""}">`
      : layout === "none"
        ? `<>`
        : `<DashboardShell>`
  const wrapEnd =
    layout === "auth" ? `</AuthShell>` : layout === "none" ? `</>` : `</DashboardShell>`

  return `${allImports}

export default function Page() {
  return (
    ${wrapStart}
      ${layout === "auth" ? body : `<>
      <PageHeader title="${title}" description="${description ?? ""}" />
      ${body}
      </>`}
    ${wrapEnd}
  )
}
`
}

// ---------- Auth pages ----------
const authPages = [
  ["app/(auth)/login/page.tsx", "Login", "Sign in to your YadBox account"],
  ["app/(auth)/signup/page.tsx", "Sign up", "Create your YadBox account"],
  ["app/(auth)/forgot-password/page.tsx", "Forgot password", "We'll email you a reset link"],
  ["app/(auth)/reset-password/page.tsx", "Reset password", "Choose a new password"],
  ["app/(auth)/verify-email/page.tsx", "Verify email", "Confirm your email address"],
  ["app/(auth)/two-factor/page.tsx", "Two-factor authentication", "Enter your verification code"],
  ["app/auth/google/page.tsx", "Google sign-in", "Connecting your Google account"],
]

// We'll write detailed auth pages separately; scaffold placeholders for structure listing
const simpleDashboard = (title, description, extra = "", layout = "dashboard") =>
  pageShell({
    title,
    description,
    layout,
    body:
      layout === "none"
        ? `<div className="space-y-4">
      <PageHeader title="${title}" description="${description ?? ""}" />
      <div className="rounded-sm border border-border bg-card p-4 text-sm text-muted-foreground">
        Mock UI for <span className="font-medium text-foreground">${title}</span>. Data is loaded from API-ready services.
      </div>
      ${extra}
    </div>`
        : `<div className="space-y-4">
      <div className="rounded-sm border border-border bg-card p-4 text-sm text-muted-foreground">
        Mock UI for <span className="font-medium text-foreground">${title}</span>. Data is loaded from API-ready services.
      </div>
      ${extra}
    </div>`,
  })

const routes = [
  // Onboarding
  ["app/(onboarding)/onboarding/page.tsx", "Welcome", "Set up your workspace in a few steps"],
  ["app/(onboarding)/onboarding/workspace/page.tsx", "Create workspace", "Name your team workspace"],
  ["app/(onboarding)/onboarding/invite/page.tsx", "Invite members", "Bring your teammates onboard"],
  ["app/(onboarding)/onboarding/templates/page.tsx", "Choose a template", "Start from a proven structure"],
  ["app/(onboarding)/onboarding/guide/page.tsx", "First steps", "Create your first project and task"],

  // Core
  ["app/(dashboard)/dashboard/page.tsx", "Dashboard", "Your work across workspaces"],
  ["app/(dashboard)/activity/page.tsx", "Activity", "Workspace activity feed"],
  ["app/(dashboard)/notifications/page.tsx", "Notifications", "Mentions, assignments, and deadlines"],
  ["app/(dashboard)/comments/page.tsx", "Comments", "Recent comments across your work"],
  ["app/(dashboard)/mentions/page.tsx", "Mentions", "Where teammates tagged you"],
  ["app/(dashboard)/search/page.tsx", "Search", "Find tasks, projects, people, and files"],

  // Workspaces
  ["app/(dashboard)/workspaces/page.tsx", "Workspaces", "All workspaces you belong to"],
  ["app/(dashboard)/workspaces/[workspaceId]/page.tsx", "Workspace overview", "Projects, tasks, and team pulse"],
  ["app/(dashboard)/workspaces/[workspaceId]/settings/page.tsx", "Workspace settings", "General workspace configuration"],
  ["app/(dashboard)/workspaces/[workspaceId]/members/page.tsx", "Members", "Manage workspace membership"],
  ["app/(dashboard)/workspaces/[workspaceId]/roles/page.tsx", "Roles & permissions", "Control access with roles"],
  ["app/(dashboard)/workspaces/[workspaceId]/teams/page.tsx", "Teams & departments", "Organize people into teams"],
  ["app/(dashboard)/workspaces/[workspaceId]/security/page.tsx", "Security", "Authentication and access controls"],
  ["app/(dashboard)/workspaces/[workspaceId]/notifications/page.tsx", "Notification settings", "Workspace notification defaults"],
  ["app/(dashboard)/workspaces/[workspaceId]/files/page.tsx", "Workspace files", "Shared file library"],
  ["app/(dashboard)/workspaces/[workspaceId]/project-categories/page.tsx", "Project categories", "Group projects by category"],
  ["app/(dashboard)/workspaces/[workspaceId]/sprints/page.tsx", "Sprints", "Plan and track sprint delivery"],
  ["app/(dashboard)/workspaces/[workspaceId]/roadmap/page.tsx", "Product roadmap", "Initiatives and releases"],
  ["app/(dashboard)/workspaces/[workspaceId]/okr/page.tsx", "OKRs", "Objectives and key results"],
  ["app/(dashboard)/workspaces/[workspaceId]/time-tracking/page.tsx", "Time tracking", "Timers and timesheets"],
  ["app/(dashboard)/workspaces/[workspaceId]/capacity/page.tsx", "Team capacity", "Workload and availability"],
  ["app/(dashboard)/workspaces/[workspaceId]/request-form/page.tsx", "Request intake", "Collect and convert requests"],
  ["app/(dashboard)/workspaces/[workspaceId]/approvals/page.tsx", "Approvals", "Review pending requests"],
  ["app/(dashboard)/workspaces/[workspaceId]/estimation/page.tsx", "Task estimation", "Story points and hours"],

  // Projects
  ["app/(dashboard)/workspaces/[workspaceId]/projects/page.tsx", "Projects", "All projects in this workspace"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/new/page.tsx", "Create project", "Start a new project"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/archived/page.tsx", "Archived projects", "Restore or permanently remove"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/deleted/page.tsx", "Deleted projects", "Trash retention window"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/page.tsx", "Project details", "Overview and views"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/edit/page.tsx", "Edit project", "Update project settings"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/members/page.tsx", "Project members", "Manage project access"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/settings/page.tsx", "Project settings", "Workflow, fields, danger zone"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/settings-view/page.tsx", "Project profile", "Integrations and shortcuts"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/kanban/page.tsx", "Kanban board", "Drag and drop workflow"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/list/page.tsx", "List view", "Sortable task table"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/calendar/page.tsx", "Calendar", "Deadlines by day and week"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/timeline/page.tsx", "Timeline", "Horizontal schedule"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/gantt/page.tsx", "Gantt chart", "Dependencies and critical path"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/files/page.tsx", "Project files", "Documents and attachments"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/activity/page.tsx", "Project activity", "Change history"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/reports/page.tsx", "Project reports", "Progress and performance"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/tasks/new/page.tsx", "Create task", "Add a task to this project"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/tasks/[taskId]/page.tsx", "Task details", "Description, comments, and history"],
  ["app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/tasks/[taskId]/edit/page.tsx", "Edit task", "Update task fields"],

  // Settings
  ["app/(dashboard)/settings/profile/page.tsx", "Profile", "Your public profile"],
  ["app/(dashboard)/settings/account/page.tsx", "Account", "Email, connected accounts, danger zone"],
  ["app/(dashboard)/settings/password/page.tsx", "Password", "Change your password"],
  ["app/(dashboard)/settings/sessions/page.tsx", "Sessions", "Active devices and revoke access"],
  ["app/(dashboard)/settings/notifications/page.tsx", "Notifications", "Email and in-app preferences"],
  ["app/(dashboard)/settings/language/page.tsx", "Language & region", "Locale, formats, timezone"],
  ["app/(dashboard)/settings/appearance/page.tsx", "Appearance", "Theme and density"],
  ["app/(dashboard)/settings/google/page.tsx", "Google account", "Connect Google services"],

  ]

const nestedShellRoutes = [
  // Billing (layout provides DashboardShell)
  ["app/billing/plans/page.tsx", "Plans", "Compare YadBox plans"],
  ["app/billing/select-plan/page.tsx", "Select plan", "Choose billing cycle"],
  ["app/billing/payment/page.tsx", "Payment", "Checkout and billing details"],
  ["app/billing/result/page.tsx", "Payment result", "Status of your payment"],
  ["app/billing/invoices/page.tsx", "Invoices", "Download invoices"],
  ["app/billing/history/page.tsx", "Payment history", "Past transactions"],
  ["app/billing/subscription/page.tsx", "Subscription", "Manage your plan"],

  // Admin (layout provides DashboardShell)
  ["app/admin/page.tsx", "Admin dashboard", "System metrics and alerts"],
  ["app/admin/users/page.tsx", "Users", "Manage platform users"],
  ["app/admin/users/[userId]/page.tsx", "User details", "Profile, sessions, and activity"],
  ["app/admin/workspaces/page.tsx", "Workspaces", "All customer workspaces"],
  ["app/admin/workspaces/[workspaceId]/page.tsx", "Workspace details", "Usage, billing, and logs"],
  ["app/admin/projects/page.tsx", "Projects", "Projects across workspaces"],
  ["app/admin/plans/page.tsx", "Plans", "Manage subscription plans"],
  ["app/admin/payments/page.tsx", "Payments", "Payment transactions"],
  ["app/admin/reports/page.tsx", "System reports", "Usage and growth"],
  ["app/admin/logs/page.tsx", "System logs", "Operational log stream"],
  ["app/admin/settings/page.tsx", "System settings", "Feature flags and maintenance"],
]

const uxRoutes = [
  ["app/access-denied/page.tsx", "Access denied", "You do not have permission"],
  ["app/unauthorized/page.tsx", "Unauthorized", "Please sign in to continue"],
  ["app/maintenance/page.tsx", "Maintenance", "We'll be back shortly"],
  ["app/500/page.tsx", "Server error", "Something went wrong on our side"],
]

for (const [file, title, description] of routes) {
  write(path.join(root, file), simpleDashboard(title, description))
}

for (const [file, title, description] of nestedShellRoutes) {
  write(path.join(root, file), simpleDashboard(title, description, "", "none"))
}

for (const [file, title, description] of uxRoutes) {
  write(path.join(root, file), simpleDashboard(title, description))
}

// Auth route group layout
write(
  path.join(root, "app/(auth)/layout.tsx"),
  `export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
`
)

write(
  path.join(root, "app/(dashboard)/layout.tsx"),
  `export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return children
}
`
)

write(
  path.join(root, "app/(onboarding)/layout.tsx"),
  `export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}
`
)

write(
  path.join(root, "app/billing/layout.tsx"),
  `"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { cn } from "@/lib/utils"

const links = [
  { href: "/billing/plans", label: "Plans" },
  { href: "/billing/subscription", label: "Subscription" },
  { href: "/billing/invoices", label: "Invoices" },
  { href: "/billing/history", label: "History" },
]

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <DashboardShell>
      <div className="mb-6 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
              pathname === link.href && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </div>
      {children}
    </DashboardShell>
  )
}
`
)

write(
  path.join(root, "app/admin/layout.tsx"),
  `"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/workspaces", label: "Workspaces" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/settings", label: "Settings" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <DashboardShell>
      <div className="mb-4 rounded-sm border border-border bg-card p-3">
        <p className="overline mb-2">Admin</p>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                (pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href))) &&
                  "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </DashboardShell>
  )
}
`
)

console.log(`Scaffolded ${routes.length} dashboard/feature routes`)
