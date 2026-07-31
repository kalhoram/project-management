"use client"

import Link from "next/link"
import { Activity as ActivityIcon } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { mockUsers } from "@/lib/mock/data"
import type { Activity } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

interface ActivityFeedProps {
  activities: Activity[]
  className?: string
  compact?: boolean
}

export function ActivityFeed({ activities, className, compact }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
        <ActivityIcon className="mb-2 h-8 w-8 opacity-40" />
        هنوز فعالیتی ثبت نشده
      </div>
    )
  }

  return (
    <ul className={cn("space-y-0", className)}>
      {activities.map((activity, index) => {
        const actor = mockUsers.find((u) => u.id === activity.actorId)
        return (
          <li
            key={activity.id}
            className={cn(
              "flex gap-3 border-b border-border py-3 last:border-0",
              compact && "py-2"
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">{initials(actor?.name ?? "?")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{actor?.name ?? "یک نفر"}</span>{" "}
                <span className="text-muted-foreground">{activity.action}</span>{" "}
                <Link href="#" className="font-medium text-primary hover:underline">
                  {activity.entityName}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(activity.createdAt, "d MMMM yyyy HH:mm")}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
