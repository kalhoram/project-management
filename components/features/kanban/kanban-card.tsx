"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, CheckSquare, GripVertical, MessageSquare, Paperclip } from "lucide-react"
import type { HTMLAttributes } from "react"
import { PriorityBadge } from "@/components/common/priority-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { CardDisplaySettings } from "@/components/features/kanban/card-settings"
import type { Label, Task } from "@/lib/types"
import { getChecklistProgress, getUserById, isTaskOverdue } from "@/lib/task-utils"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

interface KanbanCardProps {
  task: Task
  labels: Label[]
  settings: CardDisplaySettings
  isDragging?: boolean
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function KanbanCardContent({
  task,
  labels,
  settings,
  isDragging,
  dragHandleProps,
}: KanbanCardProps) {
  const openTaskDrawer = useUIStore((s) => s.openTaskDrawer)
  const density = useUIStore((s) => s.density)
  const assignee = task.assigneeId ? getUserById(task.assigneeId) : undefined
  const checklist = getChecklistProgress(task)
  const overdue = isTaskOverdue(task)
  const taskLabels = labels.filter((l) => task.labelIds.includes(l.id))
  const compact = density === "compact"

  return (
    <div
      className={cn(
        "group cursor-pointer rounded-sm border border-border bg-card transition-shadow hover:shadow-level-1",
        isDragging && "rotate-1 shadow-level-3 opacity-90",
        compact ? "p-2" : "px-3 py-2"
      )}
      onClick={() => openTaskDrawer(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          openTaskDrawer(task.id)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="mb-1.5 flex items-start gap-1">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          aria-label="کشیدن وظیفه"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {task.key}
          </p>
          <p
            className={cn(
              "font-medium leading-snug text-foreground",
              compact ? "text-sm" : "text-base"
            )}
          >
            {task.title}
          </p>
        </div>
      </div>

      {settings.showLabels && taskLabels.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {taskLabels.map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-bold uppercase"
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

      {settings.showChecklist && checklist.total > 0 ? (
        <div className="mb-2 flex items-center gap-2">
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <Progress
            value={(checklist.completed / checklist.total) * 100}
            className="h-1 flex-1"
          />
          <span className="text-[11px] text-muted-foreground">
            {checklist.completed}/{checklist.total}
          </span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {settings.showPriority ? (
            <PriorityBadge priority={task.priority} showLabel={false} />
          ) : null}
          {settings.showDueDate && task.dueDate ? (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[11px]",
                overdue ? "font-medium text-destructive" : "text-muted-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate, "MMM d")}
            </span>
          ) : null}
          {task.commentCount > 0 ? (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          ) : null}
          {task.attachmentCount > 0 ? (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {task.attachmentCount}
            </span>
          ) : null}
        </div>
        {settings.showAssignee && assignee ? (
          <Avatar className="h-6 w-6">
            {assignee.avatarUrl ? (
              <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
            ) : null}
            <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </div>
  )
}

export function KanbanCard({ task, labels, settings }: Omit<KanbanCardProps, "isDragging" | "dragHandleProps">) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task, columnId: task.columnId } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCardContent
        task={task}
        labels={labels}
        settings={settings}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function KanbanCardOverlay({
  task,
  labels,
  settings,
}: {
  task: Task
  labels: Label[]
  settings: CardDisplaySettings
}) {
  return (
    <div className="w-72">
      <KanbanCardContent task={task} labels={labels} settings={settings} isDragging />
    </div>
  )
}
