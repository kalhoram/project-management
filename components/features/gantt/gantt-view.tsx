"use client"

import { useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { addDays, differenceInCalendarDays, format, isToday } from "date-fns"
import { faIR } from "date-fns/locale"
import { CardFilters } from "@/components/features/kanban/card-filters"
import { PageToolbar } from "@/components/common/page-toolbar"
import { StatusBadge } from "@/components/common/status-badge"
import { PriorityBadge } from "@/components/common/priority-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Task } from "@/lib/types"
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  getBarPosition,
  getTimelineRange,
  getUserById,
  isTaskDelayed,
  type TaskFilters,
  type TimelineZoom,
} from "@/lib/task-utils"
import { TIMELINE_ZOOM_LABELS } from "@/lib/constants"
import { cn, formatDate } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"

interface GanttViewProps {
  tasks: Task[]
  memberIds?: string[]
}

const ZOOM_DAYS: Record<TimelineZoom, number> = {
  day: 21,
  week: 56,
  month: 120,
}

const LABEL_WIDTH = 280
const ROW_HEIGHT = 56
const HEADER_HEIGHT = 44
const DAY_WIDTH: Record<TimelineZoom, number> = {
  day: 48,
  week: 28,
  month: 14,
}

function isCriticalPath(task: Task, allTasks: Task[]): boolean {
  if (task.blockedByIds.length === 0 && task.blockingIds.length > 0) return true
  if (task.priority === "highest" || task.priority === "high") {
    return task.status !== "done" && !!task.dueDate
  }
  return allTasks.some((t) => t.blockedByIds.includes(task.id) && t.status !== "done")
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
}

export function GanttView({ tasks, memberIds = [] }: GanttViewProps) {
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS)
  const [zoom, setZoom] = useState<TimelineZoom>("week")
  const [offsetDays, setOffsetDays] = useState(0)
  const [showCritical, setShowCritical] = useState(true)
  const openTaskDrawer = useUIStore((s) => s.openTaskDrawer)

  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])

  const { rangeStart, rangeEnd, totalWidth, days, pxPerDay } = useMemo(() => {
    const base = getTimelineRange(filteredTasks)
    const start = addDays(base.start, offsetDays)
    const span = ZOOM_DAYS[zoom]
    const end = addDays(start, span)
    const dayPx = DAY_WIDTH[zoom]
    const width = span * dayPx
    const dayList = Array.from({ length: span + 1 }, (_, i) => addDays(start, i))
    return {
      rangeStart: start,
      rangeEnd: end,
      totalWidth: width,
      days: dayList,
      pxPerDay: dayPx,
    }
  }, [filteredTasks, zoom, offsetDays])

  const criticalTasks = useMemo(
    () => new Set(filteredTasks.filter((t) => isCriticalPath(t, filteredTasks)).map((t) => t.id)),
    [filteredTasks]
  )

  const todayOffset = differenceInCalendarDays(new Date(), rangeStart)
  const todayLeft =
    todayOffset >= 0 && todayOffset <= ZOOM_DAYS[zoom] ? todayOffset * pxPerDay : null

  const headerLabels = useMemo(() => {
    if (zoom === "day") {
      return days.map((d) => ({
        key: d.toISOString(),
        label: format(d, "d", { locale: faIR }),
        sub: format(d, "EEE", { locale: faIR }),
        left: differenceInCalendarDays(d, rangeStart) * pxPerDay,
        width: pxPerDay,
        today: isToday(d),
      }))
    }
    if (zoom === "week") {
      const ticks: {
        key: string
        label: string
        sub: string
        left: number
        width: number
        today: boolean
      }[] = []
      for (let i = 0; i < days.length; i += 7) {
        const d = days[i]
        ticks.push({
          key: d.toISOString(),
          label: format(d, "d MMM", { locale: faIR }),
          sub: "هفته",
          left: i * pxPerDay,
          width: Math.min(7, days.length - i) * pxPerDay,
          today: false,
        })
      }
      return ticks
    }
    const ticks: {
      key: string
      label: string
      sub: string
      left: number
      width: number
      today: boolean
    }[] = []
    for (let i = 0; i < days.length; i += 14) {
      const d = days[i]
      ticks.push({
        key: d.toISOString(),
        label: format(d, "MMM yyyy", { locale: faIR }),
        sub: "",
        left: i * pxPerDay,
        width: Math.min(14, days.length - i) * pxPerDay,
        today: false,
      })
    }
    return ticks
  }, [days, zoom, rangeStart, pxPerDay])

  return (
    <div dir="rtl" className="w-full space-y-4 text-start">
      <PageToolbar
        left={<CardFilters filters={filters} onChange={setFilters} members={memberIds} />}
        right={
          <div className="flex flex-wrap items-center justify-start gap-2">
            <div className="flex rounded-md border border-border bg-card p-0.5">
              {(["day", "week", "month"] as TimelineZoom[]).map((z) => (
                <Button
                  key={z}
                  variant={zoom === z ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setZoom(z)}
                  className="h-8"
                >
                  {TIMELINE_ZOOM_LABELS[z]}
                </Button>
              ))}
            </div>
            <Button
              variant={showCritical ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCritical((v) => !v)}
            >
              مسیر بحرانی
            </Button>
            <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setOffsetDays((d) => d - (zoom === "day" ? 7 : zoom === "week" ? 14 : 30))
              }
              aria-label="بازه قبلی"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOffsetDays(0)}>
              امروز
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setOffsetDays((d) => d + (zoom === "day" ? 7 : zoom === "week" ? 14 : 30))
              }
              aria-label="بازه بعدی"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setZoom((z) => (z === "day" ? "week" : z === "week" ? "month" : "month"))
              }
              aria-label="کوچک‌نمایی"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                setZoom((z) => (z === "month" ? "week" : z === "week" ? "day" : "day"))
              }
              aria-label="بزرگ‌نمایی"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden shadow-none" dir="rtl">
        <CardContent className="p-0">
          {/* Native RTL scroll keeps the task column on the right */}
          <div className="w-full overflow-x-auto" dir="rtl">
            <div
              className="relative"
              style={{ width: LABEL_WIDTH + totalWidth, minWidth: "100%" }}
            >
              <div
                className="sticky top-0 z-20 flex flex-row border-b border-border bg-surface"
                style={{ height: HEADER_HEIGHT }}
                dir="rtl"
              >
                <div
                  className="sticky start-0 z-30 flex shrink-0 items-center border-e border-border bg-surface px-3 text-xs font-medium text-muted-foreground"
                  style={{ width: LABEL_WIDTH }}
                >
                  وظیفه
                </div>
                <div
                  dir="ltr"
                  className="relative shrink-0"
                  style={{ width: totalWidth, height: HEADER_HEIGHT }}
                >
                  {headerLabels.map((tick) => (
                    <div
                      key={tick.key}
                      className={cn(
                        "absolute top-0 flex h-full flex-col justify-center border-e border-border/70 px-2 text-start",
                        tick.today && "bg-primary/5"
                      )}
                      style={{ left: tick.left, width: tick.width }}
                    >
                      <span className="text-[11px] font-medium text-foreground">{tick.label}</span>
                      {tick.sub ? (
                        <span className="text-[10px] text-muted-foreground">{tick.sub}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {filteredTasks.map((task, rowIndex) => {
                const bar = getBarPosition(task, rangeStart, rangeEnd, totalWidth)
                const delayed = isTaskDelayed(task)
                const critical = criticalTasks.has(task.id)
                const dimmed = showCritical && !critical && criticalTasks.size > 0
                const assignee = task.assigneeId ? getUserById(task.assigneeId) : undefined

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex flex-row border-b border-border last:border-b-0",
                      rowIndex % 2 === 1 && "bg-muted/20",
                      dimmed && "opacity-45"
                    )}
                    style={{ height: ROW_HEIGHT }}
                    dir="rtl"
                  >
                    <button
                      type="button"
                      className="sticky start-0 z-10 flex shrink-0 items-center gap-2 border-e border-border bg-card px-3 text-start hover:bg-accent/50"
                      style={{ width: LABEL_WIDTH }}
                      onClick={() => openTaskDrawer(task.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-start gap-1.5">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {task.key}
                          </span>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="truncate text-sm font-medium leading-5">{task.title}</p>
                        <div className="mt-0.5 flex items-center justify-start gap-1.5">
                          <PriorityBadge priority={task.priority} showLabel={false} />
                          {task.blockedByIds.length > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <GitBranch className="h-3 w-3" />
                              {task.blockedByIds.length}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {assignee ? (
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {initials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                    </button>

                    <div
                      dir="ltr"
                      className="relative shrink-0"
                      style={{ width: totalWidth, height: ROW_HEIGHT }}
                    >
                      {days.map((d, i) =>
                        i % (zoom === "day" ? 1 : zoom === "week" ? 7 : 14) === 0 ? (
                          <div
                            key={`grid-${d.toISOString()}`}
                            className="absolute inset-y-0 w-px bg-border/80"
                            style={{ left: i * pxPerDay }}
                          />
                        ) : null
                      )}

                      {todayLeft !== null ? (
                        <div
                          className="absolute inset-y-0 z-[1] w-0.5 bg-destructive/70"
                          style={{ left: todayLeft }}
                          title="امروز"
                        />
                      ) : null}

                      {bar ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => openTaskDrawer(task.id)}
                              className={cn(
                                "absolute top-1/2 z-[2] flex -translate-y-1/2 flex-col justify-center overflow-hidden rounded-md border text-start shadow-level-1 transition-transform hover:scale-[1.01] hover:shadow-level-2",
                                critical && showCritical
                                  ? "border-warning bg-warning/25"
                                  : delayed
                                    ? "border-destructive bg-destructive/15"
                                    : "border-primary/40 bg-primary/15"
                              )}
                              style={{
                                left: bar.left,
                                width: bar.width,
                                height: 34,
                              }}
                            >
                              <div
                                className={cn(
                                  "absolute inset-y-0 left-0 opacity-90",
                                  critical && showCritical
                                    ? "bg-warning/50"
                                    : delayed
                                      ? "bg-destructive/40"
                                      : "bg-primary/45"
                                )}
                                style={{ width: `${Math.min(task.progress, 100)}%` }}
                              />
                              <span className="relative z-[1] truncate px-2 text-[11px] font-medium text-foreground">
                                {task.progress}٪
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-xs space-y-1 text-start"
                            dir="rtl"
                          >
                            <p className="font-medium">{task.title}</p>
                            <p>
                              {task.startDate ? formatDate(task.startDate, "d MMM") : "—"} تا{" "}
                              {task.dueDate ? formatDate(task.dueDate, "d MMM yyyy") : "—"}
                            </p>
                            <p>پیشرفت: {task.progress}٪</p>
                            {assignee ? <p>مسئول: {assignee.name}</p> : null}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                          style={{ left: 12 }}
                        >
                          بدون تاریخ
                        </span>
                      )}

                      {task.blockedByIds.map((depId) => {
                        const dep = filteredTasks.find((t) => t.id === depId)
                        const depBar = dep
                          ? getBarPosition(dep, rangeStart, rangeEnd, totalWidth)
                          : null
                        if (!depBar || !bar) return null
                        const x1 = depBar.left + depBar.width
                        const x2 = bar.left
                        return (
                          <svg
                            key={depId}
                            className="pointer-events-none absolute inset-0 z-[1] overflow-visible text-muted-foreground"
                            width={totalWidth}
                            height={ROW_HEIGHT}
                          >
                            <path
                              d={`M ${x1} ${ROW_HEIGHT / 2 - 10} C ${x1 + 12} ${ROW_HEIGHT / 2 - 10}, ${x2 - 12} ${ROW_HEIGHT / 2}, ${x2} ${ROW_HEIGHT / 2}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              strokeDasharray="4 3"
                              opacity={0.7}
                            />
                            <circle cx={x2} cy={ROW_HEIGHT / 2} r={2.5} fill="currentColor" />
                          </svg>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        className="flex flex-wrap items-center justify-start gap-4 text-xs text-muted-foreground"
        dir="rtl"
      >
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-6 rounded-sm border border-primary/40 bg-primary/45" />
          زمان‌بندی‌شده
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-6 rounded-sm border border-warning bg-warning/40" />
          بحرانی
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-6 rounded-sm border border-destructive bg-destructive/40" />
          تأخیردار
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-0.5 bg-destructive/70" />
          امروز
        </span>
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          وابستگی
        </span>
        {criticalTasks.size > 0 ? (
          <Badge variant="warning">{criticalTasks.size} مورد در مسیر بحرانی</Badge>
        ) : null}
        <span className="ms-auto tabular-nums">
          {filteredTasks.length} وظیفه ·{" "}
          {format(rangeStart, "d MMM", { locale: faIR })} –{" "}
          {format(rangeEnd, "d MMM yyyy", { locale: faIR })}
        </span>
      </div>

      <Card className="shadow-none" dir="rtl">
        <CardContent className="grid gap-4 p-4 text-start sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">میانگین پیشرفت</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {filteredTasks.length
                ? Math.round(
                    filteredTasks.reduce((s, t) => s + t.progress, 0) / filteredTasks.length
                  )
                : 0}
              ٪
            </p>
            <Progress
              className="mt-2"
              value={
                filteredTasks.length
                  ? filteredTasks.reduce((s, t) => s + t.progress, 0) / filteredTasks.length
                  : 0
              }
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">دارای تاریخ</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {filteredTasks.filter((t) => t.startDate || t.dueDate).length} /{" "}
              {filteredTasks.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">تأخیردار</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-destructive">
              {filteredTasks.filter((t) => isTaskDelayed(t)).length}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
