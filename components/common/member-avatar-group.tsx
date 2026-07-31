"use client"

import { mockUsers } from "@/lib/mock/data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface MemberAvatarGroupProps {
  userIds: string[]
  max?: number
  size?: "sm" | "md"
  className?: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function MemberAvatarGroup({
  userIds,
  max = 4,
  size = "sm",
  className,
}: MemberAvatarGroupProps) {
  const users = userIds
    .map((id) => mockUsers.find((u) => u.id === id))
    .filter(Boolean)
  const visible = users.slice(0, max)
  const remaining = users.length - visible.length
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visible.map((user) =>
        user ? (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className={cn(sizeClass, "border-2 border-background")}>
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>{user.name}</TooltipContent>
          </Tooltip>
        ) : null
      )}
      {remaining > 0 ? (
        <div
          className={cn(
            sizeClass,
            "flex items-center justify-center rounded-full border-2 border-background bg-surface font-medium text-muted-foreground"
          )}
        >
          +{remaining}
        </div>
      ) : null}
    </div>
  )
}
