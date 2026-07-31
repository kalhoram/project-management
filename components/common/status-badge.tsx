import { Badge } from "@/components/ui/badge"
import type { ProjectStatus, TaskStatus } from "@/lib/types"
import { PROJECT_STATUS_LABELS, TASK_STATUS_LABELS, VISIBILITY_LABELS } from "@/lib/constants"

const taskStatusVariant: Record<
  TaskStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "purple"
> = {
  backlog: "secondary",
  todo: "default",
  in_progress: "warning",
  in_review: "purple",
  done: "success",
  blocked: "destructive",
  cancelled: "secondary",
}

const projectStatusVariant: Record<
  ProjectStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  active: "success",
  on_hold: "warning",
  completed: "info",
  archived: "secondary",
  deleted: "destructive",
}

export function StatusBadge({
  status,
}: {
  status: TaskStatus | ProjectStatus | string
}) {
  const isTask = status in taskStatusVariant
  const variant = isTask
    ? taskStatusVariant[status as TaskStatus]
    : projectStatusVariant[status as ProjectStatus] ?? "secondary"

  const label =
    TASK_STATUS_LABELS[status] ??
    PROJECT_STATUS_LABELS[status] ??
    VISIBILITY_LABELS[status] ??
    status.replaceAll("_", " ")

  return <Badge variant={variant}>{label}</Badge>
}
