"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "نمای کلی" },
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/workspaces", label: "فضاهای کاری" },
  { href: "/admin/projects", label: "پروژه‌ها" },
  { href: "/admin/plans", label: "طرح‌ها" },
  { href: "/admin/payments", label: "پرداخت‌ها" },
  { href: "/admin/reports", label: "گزارش‌ها" },
  { href: "/admin/logs", label: "گزارش‌های سیستم" },
  { href: "/admin/settings", label: "تنظیمات" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <DashboardShell>
      <div className="mb-4 rounded-sm border border-border bg-card p-3">
        <p className="overline mb-2">مدیریت</p>
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
