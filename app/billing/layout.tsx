"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { AccessDeniedCard, RequirePermission } from "@/components/common/require-permission"
import { cn } from "@/lib/utils"

const links = [
  { href: "/billing/plans", label: "طرح‌ها" },
  { href: "/billing/subscription", label: "اشتراک" },
  { href: "/billing/invoices", label: "فاکتورها" },
  { href: "/billing/history", label: "تاریخچه" },
]

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <DashboardShell>
      <RequirePermission
        permission="billing.manage"
        fallback={
          <AccessDeniedCard
            title="مدیریت صورتحساب فقط برای مالک"
            description="نقش فعلی شما به صورتحساب دسترسی ندارد. با اکانت owner@yadbox.app وارد شوید."
          />
        }
      >
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
      </RequirePermission>
    </DashboardShell>
  )
}
