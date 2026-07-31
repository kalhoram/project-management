import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { TaskPriority } from "@/lib/types"
import { PRIORITY_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const config: Record<
  TaskPriority,
  { icon: typeof ArrowUp; className: string }
> = {
  highest: { icon: ChevronsUp, className: "text-destructive" },
  high: { icon: ArrowUp, className: "text-destructive" },
  medium: { icon: Minus, className: "text-warning" },
  low: { icon: ArrowDown, className: "text-primary" },
  lowest: { icon: ChevronsDown, className: "text-muted-foreground" },
}

export function PriorityBadge({
  priority,
  showLabel = true,
}: {
  priority: TaskPriority
  showLabel?: boolean
}) {
  const item = config[priority]
  const Icon = item.icon

  return (
    <Badge variant="outline" className="gap-1 normal-case tracking-normal">
      <Icon className={cn("h-3.5 w-3.5", item.className)} />
      {showLabel ? PRIORITY_LABELS[priority] : null}
    </Badge>
  )
}
