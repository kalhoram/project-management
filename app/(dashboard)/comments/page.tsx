"use client"

import { MessageSquare } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useComments } from "@/hooks/queries"
import { mockUsers } from "@/lib/mock/data"
import { formatDate } from "@/lib/utils"

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

const entityTypeLabels: Record<string, string> = {
  task: "وظیفه",
  project: "پروژه",
}

export default function CommentsPage() {
  const comments = useComments()

  if (comments.isLoading) return <DashboardShell><PageSkeleton /></DashboardShell>
  if (comments.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => comments.refetch()} />
      </DashboardShell>
    )
  }

  const items = comments.data ?? []

  return (
    <DashboardShell>
      <PageHeader title="نظرات" description="نظرات اخیر در وظایف و پروژه‌ها" />
      {items.length === 0 ? (
        <EmptyState icon={MessageSquare} title="هنوز نظری ثبت نشده" description="نظرات اینجا نمایش داده می‌شوند." />
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
                      <Badge variant="secondary">{entityTypeLabels[comment.entityType] ?? comment.entityType}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt, "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{comment.body}</p>
                    {comment.mentions.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        منشن‌ها: {comment.mentions.map((id) => mockUsers.find((u) => u.id === id)?.name).join("، ")}
                      </p>
                    ) : null}
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
