"use client"

import { AtSign } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useCurrentUser, useMentions } from "@/hooks/queries"
import { mockUsers } from "@/lib/mock/data"
import { formatDate } from "@/lib/utils"

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function MentionsPage() {
  const user = useCurrentUser()
  const mentions = useMentions(user.data?.id ?? "")

  if (user.isLoading || mentions.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (mentions.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => mentions.refetch()} />
      </DashboardShell>
    )
  }

  const items = mentions.data ?? []

  return (
    <DashboardShell>
      <PageHeader title="منشن‌ها" description="نظراتی که در آن‌ها منشن شده‌اید" />
      {items.length === 0 ? (
        <EmptyState icon={AtSign} title="منشنی وجود ندارد" description="وقتی کسی شما را @منشن کند، اینجا نمایش داده می‌شود." />
      ) : (
        <ul className="space-y-3">
          {items.map((comment) => {
            const author = mockUsers.find((u) => u.id === comment.authorId)
            return (
              <li key={comment.id} className="rounded-sm border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{initials(author?.name ?? "?")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{author?.name}</span>
                      <Badge variant="purple">شما را منشن کرد</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt, "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{comment.body}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </DashboardShell>
  )
}
