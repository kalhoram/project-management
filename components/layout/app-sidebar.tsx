"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Bell,
  CalendarDays,
  ChartColumn,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Map,
  Search,
  Settings,
  Target,
  Users,
  Workflow,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useUIStore, useWorkspaceStore } from "@/stores/ui-store"
import { APP_NAME_FULL } from "@/lib/constants"

const navItems = [
  { label: "داشبورد", href: "/dashboard", icon: LayoutDashboard },
  { label: "پروژه‌ها", href: "projects", icon: FolderKanban },
  { label: "وظایف من", href: "/workspaces/ws-1/projects/proj-1/list", icon: CheckSquare },
  { label: "تقویم", href: "/workspaces/ws-1/projects/proj-1/calendar", icon: CalendarDays },
  { label: "فایل‌ها", href: "files", icon: FileText },
  { label: "اسپرینت‌ها", href: "sprints", icon: Workflow },
  { label: "نقشه راه", href: "roadmap", icon: Map },
  { label: "اهداف کلیدی", href: "okr", icon: Target },
  { label: "ثبت زمان", href: "time-tracking", icon: Clock3 },
  { label: "ظرفیت تیم", href: "capacity", icon: Gauge },
  { label: "تأییدها", href: "approvals", icon: Users },
  { label: "گزارش‌ها", href: "/workspaces/ws-1/projects/proj-1/reports", icon: ChartColumn },
  { label: "فعالیت‌ها", href: "/activity", icon: Activity },
  { label: "اعلان‌ها", href: "/notifications", icon: Bell },
  { label: "جستجو", href: "/search", icon: Search },
  { label: "تنظیمات", href: "settings", icon: Settings },
]

function resolveHref(href: string, workspaceId: string) {
  if (href.startsWith("/")) return href
  return `/workspaces/${workspaceId}/${href}`
}

export function AppSidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { currentWorkspaceId } = useWorkspaceStore()

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-e border-sidebar-border bg-sidebar transition-[width] md:flex",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
        {!sidebarCollapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[10px] text-primary-foreground">
              YB
            </div>
            <span className="truncate text-sm">{APP_NAME_FULL}</span>
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="mx-auto flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-[10px] text-primary-foreground"
          >
            YB
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(sidebarCollapsed && "mx-auto")}
          onClick={toggleSidebar}
          aria-label="باز و بسته کردن منو"
        >
          {sidebarCollapsed ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const href = resolveHref(item.href, currentWorkspaceId)
            const active = pathname === href || pathname.startsWith(`${href}/`)
            const Icon = item.icon
            const link = (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent",
                  active && "border-s-2 border-primary bg-sidebar-accent text-sidebar-accent-foreground",
                  sidebarCollapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed ? <span>{item.label}</span> : null}
              </Link>
            )

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="left">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return link
          })}
        </nav>
      </ScrollArea>

      <Separator />
      <div className="p-3">
        <Link
          href="/billing/plans"
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-sidebar-foreground hover:bg-accent",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <ChartColumn className="h-4 w-4" />
          {!sidebarCollapsed ? "صورتحساب" : null}
        </Link>
      </div>
    </aside>
  )
}
