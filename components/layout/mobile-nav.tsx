"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  Bell,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUIStore, useWorkspaceStore } from "@/stores/ui-store"
import { APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

const items = [
  { label: "داشبورد", href: "/dashboard", icon: LayoutDashboard },
  { label: "پروژه‌ها", hrefSuffix: "projects", icon: FolderKanban },
  { label: "فعالیت‌ها", href: "/activity", icon: Activity },
  { label: "اعلان‌ها", href: "/notifications", icon: Bell },
  { label: "جستجو", href: "/search", icon: Search },
  { label: "تنظیمات", href: "/settings/profile", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const { mobileNavOpen, setMobileNavOpen } = useUIStore()
  const { currentWorkspaceId } = useWorkspaceStore()

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-4 py-3 text-start">
          <SheetTitle>{APP_NAME}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-57px)] p-3">
          <nav className="space-y-1">
            {items.map((item) => {
              const href =
                "href" in item && item.href
                  ? item.href
                  : `/workspaces/${currentWorkspaceId}/${item.hrefSuffix}`
              const active = pathname === href || pathname.startsWith(`${href}/`)
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                    active && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
