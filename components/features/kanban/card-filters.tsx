"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TaskFilters } from "@/lib/task-utils"
import { DEFAULT_TASK_FILTERS } from "@/lib/task-utils"
import type { TaskPriority, TaskStatus } from "@/lib/types"
import { lookupUser } from "@/lib/user-registry"
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const ALL_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
]

const ALL_PRIORITIES: TaskPriority[] = ["highest", "high", "medium", "low", "lowest"]

interface CardFiltersProps {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
  members?: string[]
  labels?: Array<{ id: string; name: string; color: string }>
  className?: string
}

export function CardFilters({ filters, onChange, members = [], labels = [], className }: CardFiltersProps) {
  const activeCount =
    filters.statuses.length +
    filters.priorities.length +
    filters.assigneeIds.length +
    filters.labelIds.length

  const memberOptions = members
    .map((id) => lookupUser(id))
    .filter((user): user is NonNullable<typeof user> => !!user)

  function toggleStatus(status: TaskStatus) {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onChange({ ...filters, statuses })
  }

  function togglePriority(priority: TaskPriority) {
    const priorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority]
    onChange({ ...filters, priorities })
  }

  function toggleLabel(id: string) {
    const labelIds = filters.labelIds.includes(id)
      ? filters.labelIds.filter((l) => l !== id)
      : [...filters.labelIds, id]
    onChange({ ...filters, labelIds })
  }

  function clearFilters() {
    onChange({ ...DEFAULT_TASK_FILTERS, search: filters.search })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="جستجوی وظایف..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-8 pl-8"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            وضعیت
            {filters.statuses.length > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.statuses.length}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>فیلتر بر اساس وضعیت</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ALL_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={filters.statuses.includes(status)}
              onCheckedChange={() => toggleStatus(status)}
            >
              {TASK_STATUS_LABELS[status] ?? status}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            اولویت
            {filters.priorities.length > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.priorities.length}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>فیلتر بر اساس اولویت</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ALL_PRIORITIES.map((priority) => (
            <DropdownMenuCheckboxItem
              key={priority}
              checked={filters.priorities.includes(priority)}
              onCheckedChange={() => togglePriority(priority)}
            >
              {PRIORITY_LABELS[priority] ?? priority}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Select
        value={filters.assigneeIds[0] ?? "all"}
        onValueChange={(value) =>
          onChange({
            ...filters,
            assigneeIds: value === "all" ? [] : [value],
          })
        }
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="مسئول" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه مسئولین</SelectItem>
          {memberOptions.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            برچسب‌ها
            {filters.labelIds.length > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {filters.labelIds.length}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>فیلتر بر اساس برچسب</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              checked={filters.labelIds.includes(label.id)}
              onCheckedChange={() => toggleLabel(label.id)}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeCount > 0 ? (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4" />
          پاک کردن
        </Button>
      ) : null}
    </div>
  )
}
