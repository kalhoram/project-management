"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Calendar,
  Columns3,
  Files,
  GanttChart,
  List,
  Settings,
  Timeline,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectTabsProps {
  workspaceId: string
  projectId: string
}

const tabs = [
  { label: "نمای کلی", href: "", icon: null },
  { label: "کانبان", href: "/kanban", icon: Columns3 },
  { label: "فهرست", href: "/list", icon: List },
  { label: "تقویم", href: "/calendar", icon: Calendar },
  { label: "خط زمانی", href: "/timeline", icon: Timeline },
  { label: "گانت", href: "/gantt", icon: GanttChart },
  { label: "فایل‌ها", href: "/files", icon: Files },
  { label: "فعالیت", href: "/activity", icon: Activity },
  { label: "گزارش‌ها", href: "/reports", icon: BarChart3 },
  { label: "تنظیمات", href: "/settings", icon: Settings },
] as const

export function ProjectTabs({ workspaceId, projectId }: ProjectTabsProps) {
  const pathname = usePathname()
  const basePath = `/workspaces/${workspaceId}/projects/${projectId}`

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border pb-px">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.href}`
        const isActive =
          tab.href === ""
            ? pathname === basePath
            : pathname.startsWith(href)
        const Icon = tab.icon

        return (
          <Link
            key={tab.label}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
