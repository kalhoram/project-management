"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CardFilters } from "@/components/features/kanban/card-filters"
import { PageToolbar } from "@/components/common/page-toolbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/types"
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  formatCalendarHeader,
  getCalendarDays,
  getTasksForDay,
  isSameMonth,
  isToday,
  shiftCalendarDate,
  type CalendarViewMode,
  type TaskFilters,
} from "@/lib/task-utils"
import { useUIStore } from "@/stores/ui-store"
import { cn } from "@/lib/utils"
import { CALENDAR_VIEW_LABELS, WEEKDAY_LABELS } from "@/lib/constants"
import { PriorityBadge } from "@/components/common/priority-badge"

interface CalendarViewProps {
  tasks: Task[]
  memberIds?: string[]
}

const WEEKDAYS = [...WEEKDAY_LABELS]

export function CalendarView({ tasks, memberIds = [] }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month")
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS)
  const openTaskDrawer = useUIStore((s) => s.openTaskDrawer)

  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])
  const days = useMemo(
    () => getCalendarDays(currentDate, viewMode),
    [currentDate, viewMode]
  )

  function goToday() {
    setCurrentDate(new Date())
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        left={<CardFilters filters={filters} onChange={setFilters} members={memberIds} />}
        right={
          <div className="flex items-center gap-2">
            {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="capitalize"
              >
                {CALENDAR_VIEW_LABELS[mode]}
              </Button>
            ))}
          </div>
        }
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentDate(shiftCalendarDate(currentDate, viewMode, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="min-w-[200px] text-center text-lg font-semibold">
            {formatCalendarHeader(currentDate, viewMode)}
          </h3>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setCurrentDate(shiftCalendarDate(currentDate, viewMode, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>
          امروز
        </Button>
      </div>

      {viewMode === "month" ? (
        <div className="overflow-hidden rounded-sm border border-border">
          <div className="grid grid-cols-7 border-b border-border bg-surface">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-xs font-medium uppercase text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayTasks = getTasksForDay(filteredTasks, day)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-24 border-b border-r border-border p-1.5",
                    !inMonth && "bg-neutral/30",
                    today && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      today && "bg-primary font-medium text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openTaskDrawer(task.id)}
                        className="block w-full truncate rounded-sm bg-primary/10 px-1 py-0.5 text-left text-[11px] font-medium text-primary hover:bg-primary/15"
                      >
                        {task.key}
                      </button>
                    ))}
                    {dayTasks.length > 3 ? (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{dayTasks.length - 3}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : viewMode === "week" ? (
        <div className="grid gap-2 sm:grid-cols-7">
          {days.map((day) => {
            const dayTasks = getTasksForDay(filteredTasks, day)
            const today = isToday(day)
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-sm border border-border p-2",
                  today && "border-primary bg-primary/5"
                )}
              >
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {WEEKDAYS[day.getDay()]} {day.getDate()}
                </p>
                <div className="mt-2 space-y-1">
                  {dayTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => openTaskDrawer(task.id)}
                      className="w-full rounded-sm border border-border bg-card p-2 text-left text-sm hover:border-primary"
                    >
                      <p className="truncate font-medium">{task.title}</p>
                      <PriorityBadge priority={task.priority} showLabel={false} />
                    </button>
                  ))}
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">مهلتی نیست</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {getTasksForDay(filteredTasks, currentDate).map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => openTaskDrawer(task.id)}
              className="flex w-full items-center justify-between rounded-sm border border-border bg-card p-3 text-left hover:border-primary"
            >
              <div>
                <p className="text-xs text-muted-foreground">{task.key}</p>
                <p className="font-medium">{task.title}</p>
              </div>
              <PriorityBadge priority={task.priority} />
            </button>
          ))}
          {getTasksForDay(filteredTasks, currentDate).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              وظیفه‌ای برای این روز سررسید ندارد.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
