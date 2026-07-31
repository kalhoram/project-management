"use client"

import { useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCurrentUser, useNotifications } from "@/hooks/queries"
import { formatDate } from "@/lib/utils"
import type { NotificationType } from "@/lib/types"

const typeVariant: Record<NotificationType, "default" | "secondary" | "warning" | "info" | "purple"> = {
  mention: "purple",
  assignment: "default",
  comment: "info",
  deadline: "warning",
  status_change: "secondary",
  system: "secondary",
}

const typeLabels: Record<NotificationType, string> = {
  mention: "منشن",
  assignment: "محول‌شده",
  comment: "نظر",
  deadline: "سررسید",
  status_change: "تغییر وضعیت",
  system: "سیستم",
}

export default function NotificationsPage() {
  const user = useCurrentUser()
  const notifications = useNotifications(user.data?.id ?? "")
  const [tab, setTab] = useState("all")

  if (user.isLoading || notifications.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (notifications.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => notifications.refetch()} />
      </DashboardShell>
    )
  }

  const items = notifications.data ?? []
  const unread = items.filter((n) => !n.read)
  const filtered =
    tab === "unread" ? unread : tab === "read" ? items.filter((n) => n.read) : items

  function markAllRead() {
    toast.success("همه اعلان‌ها به‌عنوان خوانده‌شده علامت‌گذاری شدند")
  }

  return (
    <DashboardShell>
      <div dir="rtl" className="w-full text-start">
        <PageHeader
          title="اعلان‌ها"
          description="از محول‌شدن‌ها، منشن‌ها و سررسیدها مطلع بمانید"
          actions={
            unread.length > 0 ? (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="h-4 w-4" />
                علامت‌گذاری همه به‌عنوان خوانده‌شده
              </Button>
            ) : null
          }
        />

        <Tabs value={tab} onValueChange={setTab} dir="rtl">
          <div className="flex w-full justify-start">
            <TabsList>
              <TabsTrigger value="all">همه ({items.length})</TabsTrigger>
              <TabsTrigger value="unread">خوانده‌نشده ({unread.length})</TabsTrigger>
              <TabsTrigger value="read">خوانده‌شده</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={tab} className="mt-4">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Bell}
                title={tab === "unread" ? "همه را دیده‌اید" : "اعلانی وجود ندارد"}
                description={
                  tab === "unread"
                    ? "اعلان خوانده‌نشده‌ای ندارید."
                    : "وقتی اتفاقی بیفتد، اعلان‌ها اینجا نمایش داده می‌شوند."
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-sm border border-border bg-card text-start">
                {filtered.map((n) => (
                  <li
                    key={n.id}
                    className={`flex flex-row items-start gap-3 px-4 py-3 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 text-start">
                      <div className="flex flex-wrap items-center justify-start gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        <Badge variant={typeVariant[n.type]}>{typeLabels[n.type]}</Badge>
                        {!n.read ? <Badge variant="default">جدید</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(n.createdAt, "d MMMM yyyy HH:mm")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
