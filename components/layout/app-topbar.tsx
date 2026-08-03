"use client"

import Link from "next/link"
import { Bell, Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher"
import { ProjectSwitcher } from "@/components/layout/project-switcher"
import { UserMenu } from "@/components/layout/user-menu"
import { useUIStore } from "@/stores/ui-store"
import { useNotifications, useCurrentUser } from "@/hooks/queries"

export function AppTopbar() {
  const { setMobileNavOpen, setCommandOpen } = useUIStore()
  const { data: user } = useCurrentUser()
  const { data: notifications } = useNotifications(user?.id ?? "")
  const unread = notifications?.filter((n) => !n.read).length ?? 0

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="باز کردن منو"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="hidden items-center gap-2 md:flex">
        <WorkspaceSwitcher />
        <span className="text-muted-foreground">/</span>
        <ProjectSwitcher />
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="hidden min-w-[200px] justify-start text-muted-foreground lg:inline-flex"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="h-4 w-4" />
          جستجو…
          <kbd className="ms-auto rounded-sm border border-border bg-muted px-1.5 text-[10px]">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setCommandOpen(true)}
          aria-label="جستجو"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" asChild className="relative">
          <Link href="/notifications" aria-label="اعلان‌ها">
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <Badge className="absolute -end-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
                {unread}
              </Badge>
            ) : null}
          </Link>
        </Button>
        <UserMenu />
      </div>
    </header>
  )
}
