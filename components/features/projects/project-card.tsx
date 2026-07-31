"use client"

import Link from "next/link"
import { Calendar, FolderKanban } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MemberAvatarGroup } from "@/components/common/member-avatar-group"
import { StatusBadge } from "@/components/common/status-badge"
import { mockCategories } from "@/lib/mock/data"
import type { Project } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  project: Project
  workspaceId: string
  view?: "grid" | "list"
  className?: string
}

export function ProjectCard({
  project,
  workspaceId,
  view = "grid",
  className,
}: ProjectCardProps) {
  const category = mockCategories.find((c) => c.id === project.categoryId)
  const href = `/workspaces/${workspaceId}/projects/${project.id}`

  if (view === "list") {
    return (
      <Link href={href}>
        <Card
          className={cn(
            "transition-shadow hover:shadow-[var(--shadow-1)] cursor-pointer",
            className
          )}
        >
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-xs font-bold text-white"
                style={{ backgroundColor: category?.color ?? "#0052CC" }}
              >
                {project.key}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{project.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {project.description ?? "بدون توضیحات"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={project.status} />
              <MemberAvatarGroup userIds={project.memberIds} />
              <div className="w-24">
                <Progress value={project.progress} className="h-1.5" />
                <p className="mt-0.5 text-right text-xs text-muted-foreground">
                  {project.progress}٪
                </p>
              </div>
              {project.dueDate ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(project.dueDate)}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={href}>
      <Card
        className={cn(
          "h-full transition-shadow hover:shadow-[var(--shadow-1)] cursor-pointer",
          className
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-sm text-xs font-bold text-white"
              style={{ backgroundColor: category?.color ?? "#0052CC" }}
            >
              {project.key}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{project.name}</p>
              {category ? (
                <p className="text-xs text-muted-foreground">{category.name}</p>
              ) : null}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {project.description ?? "توضیحاتی ثبت نشده"}
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5" />
                {project.completedTaskCount}/{project.taskCount} وظیفه
              </span>
              <span>{project.progress}٪</span>
            </div>
            <Progress value={project.progress} className="h-1.5" />
          </div>
          <div className="flex items-center justify-between">
            <MemberAvatarGroup userIds={project.memberIds} />
            {project.dueDate ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(project.dueDate)}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
