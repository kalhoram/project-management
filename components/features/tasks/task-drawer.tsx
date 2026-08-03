"use client"

import Link from "next/link"
import { ExternalLink, Loader2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/common/status-badge"
import { PriorityBadge } from "@/components/common/priority-badge"
import { CommentThread } from "@/components/features/tasks/comment-thread"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTask, useTaskComments, useLabels, useProjectActivities } from "@/hooks/queries"
import * as fileService from "@/lib/api/file.service"
import { useUIStore } from "@/stores/ui-store"
import { getChecklistProgress, getUserById } from "@/lib/task-utils"
import { formatDate } from "@/lib/utils"
import { formatFileSize } from "@/lib/task-utils"
import { useQuery } from "@tanstack/react-query"

interface TaskDrawerProps {
  workspaceId: string
  projectId: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function TaskDrawer({ workspaceId, projectId }: TaskDrawerProps) {
  const taskDrawerOpen = useUIStore((s) => s.taskDrawerOpen)
  const selectedTaskId = useUIStore((s) => s.selectedTaskId)
  const closeTaskDrawer = useUIStore((s) => s.closeTaskDrawer)

  const task = useTask(selectedTaskId ?? "")
  const comments = useTaskComments(selectedTaskId ?? "")
  const labelsQuery = useLabels(workspaceId)
  const activitiesQuery = useProjectActivities(workspaceId, projectId)
  const filesQuery = useQuery({
    queryKey: ["task-files", selectedTaskId],
    queryFn: () => fileService.getTaskFiles(selectedTaskId!),
    enabled: !!selectedTaskId,
  })

  const taskData = task.data
  const labelMap = labelsQuery.data ?? []
  const taskLabels = taskData
    ? labelMap.filter((l) => taskData.labelIds.includes(l.id))
    : []
  const checklist = taskData ? getChecklistProgress(taskData) : { completed: 0, total: 0 }
  const assignee = taskData?.assigneeId ? getUserById(taskData.assigneeId) : undefined
  const attachments = filesQuery.data ?? []
  const activities = (activitiesQuery.data ?? []).filter(
    (a) => a.entityType === "task" && a.entityId === taskData?.id
  )

  return (
    <Sheet open={taskDrawerOpen} onOpenChange={(open) => !open && closeTaskDrawer()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {task.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : task.isError || !taskData ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            بارگذاری وظیفه ممکن نشد.
          </div>
        ) : (
          <>
            <SheetHeader className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {taskData.key}
              </p>
              <SheetTitle className="text-xl">{taskData.title}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <StatusBadge status={taskData.status} />
                  <PriorityBadge priority={taskData.priority} />
                </div>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskData.id}`}
                >
                  <ExternalLink className="h-4 w-4" />
                  باز کردن نمای کامل
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskData.id}/edit`}
                >
                  ویرایش
                </Link>
              </Button>
            </div>

            <Tabs defaultValue="summary" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="summary" className="flex-1">
                  خلاصه
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex-1">
                  نظرات ({taskData.commentCount})
                </TabsTrigger>
                <TabsTrigger value="attachments" className="flex-1">
                  فایل‌ها
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1">
                  فعالیت
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4 pt-4">
                {taskData.description ? (
                  <p className="text-sm text-muted-foreground">{taskData.description}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">بدون توضیحات.</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">مسئول</p>
                    {assignee ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {assignee.avatarUrl ? (
                            <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {initials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{assignee.name}</span>
                      </div>
                    ) : (
                      <p className="mt-1">بدون مسئول</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">مهلت</p>
                    <p className="mt-1">
                      {taskData.dueDate ? formatDate(taskData.dueDate) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">پیشرفت</p>
                    <p className="mt-1">{taskData.progress}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">امتیاز داستان</p>
                    <p className="mt-1">{taskData.storyPoints ?? "—"}</p>
                  </div>
                </div>

                {taskLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {taskLabels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="outline"
                        style={{
                          borderColor: label.color,
                          color: label.color,
                          backgroundColor: `${label.color}15`,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {checklist.total > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">چک‌لیست</span>
                      <span>
                        {checklist.completed}/{checklist.total}
                      </span>
                    </div>
                    <Progress value={(checklist.completed / checklist.total) * 100} />
                    <ul className="space-y-1">
                      {taskData.checklist.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            readOnly
                            className="rounded-sm"
                          />
                          <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                            {item.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="comments" className="pt-4">
                {comments.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <CommentThread comments={comments.data ?? []} />
                )}
              </TabsContent>

              <TabsContent value="attachments" className="space-y-2 pt-4">
                {attachments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">پیوستی نیست.</p>
                ) : (
                  attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-3 pt-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز فعالیتی ثبت نشده.</p>
                ) : (
                  activities.map((act) => {
                    const actor = getUserById(act.actorId)
                    return (
                      <div key={act.id} className="text-sm">
                        <span className="font-medium">{actor?.name ?? "کسی"}</span>{" "}
                        <span className="text-muted-foreground">{act.action}</span>{" "}
                        <span>{act.entityName}</span>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(act.createdAt, "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                    )
                  })
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
