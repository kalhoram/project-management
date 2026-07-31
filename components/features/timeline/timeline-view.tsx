"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Diamond, ZoomIn, ZoomOut } from "lucide-react"
import { CardFilters } from "@/components/features/kanban/card-filters"
import { PageToolbar } from "@/components/common/page-toolbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/types"
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  getBarPosition,
  getTimelineRange,
  isTaskDelayed,
  type TaskFilters,
  type TimelineZoom,
} from "@/lib/task-utils"
import { formatDate } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"
import { TIMELINE_ZOOM_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { addDays, format } from "date-fns"
import { faIR } from "date-fns/locale"

interface TimelineViewProps {
  tasks: Task[]
  memberIds?: string[]
}

const ZOOM_DAYS: Record<TimelineZoom, number> = {
  day: 14,
  week: 42,
  month: 90,
}

const LABEL_WIDTH = 220
const ROW_HEIGHT = 44
const BAR_HEIGHT = 24

export function TimelineView({ tasks, memberIds = [] }: TimelineViewProps) {
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS)
  const [zoom, setZoom] = useState<TimelineZoom>("week")
  const [offsetDays, setOffsetDays] = useState(0)
  const openTaskDrawer = useUIStore((s) => s.openTaskDrawer)

  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])

  const { rangeStart, rangeEnd, totalWidth, headerTicks } = useMemo(() => {
    const base = getTimelineRange(filteredTasks)
    const start = addDays(base.start, offsetDays)
    const end = addDays(start, ZOOM_DAYS[zoom])
    const width = 800
    const tickCount = zoom === "day" ? 14 : zoom === "week" ? 6 : 3
    const step = Math.floor(ZOOM_DAYS[zoom] / tickCount)
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => addDays(start, i * step))
    return { rangeStart: start, rangeEnd: end, totalWidth: width, headerTicks: ticks }
  }, [filteredTasks, zoom, offsetDays])

  const milestones = filteredTasks.filter(
    (t) => t.dueDate && !t.startDate && t.storyPoints && t.storyPoints >= 8
  )

  return (
    <div className="space-y-4">
      <PageToolbar
        left={<CardFilters filters={filters} onChange={setFilters} members={memberIds} />}
        right={
          <div className="flex items-center gap-2">
            {(["day", "week", "month"] as TimelineZoom[]).map((z) => (
              <Button
                key={z}
                variant={zoom === z ? "default" : "outline"}
                size="sm"
                onClick={() => setZoom(z)}
                className="capitalize"
              >
                {TIMELINE_ZOOM_LABELS[z]}
              </Button>
            ))}
            <Button variant="outline" size="icon-sm" onClick={() => setOffsetDays((d) => d - 7)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setOffsetDays((d) => d + 7)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom("week")}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setZoom("day")}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-sm border border-border">
        <div style={{ minWidth: LABEL_WIDTH + totalWidth }}>
          <div className="flex border-b border-border bg-surface">
            <div
              className="shrink-0 border-r border-border px-3 py-2 text-xs font-medium uppercase text-muted-foreground"
              style={{ width: LABEL_WIDTH }}
            >
              وظیفه
            </div>
            <div className="relative flex-1" style={{ width: totalWidth }}>
              {headerTicks.map((tick) => {
                const pos = getBarPosition(
                  {
                    startDate: tick.toISOString().slice(0, 10),
                    dueDate: tick.toISOString().slice(0, 10),
                  } as Task,
                  rangeStart,
                  rangeEnd,
                  totalWidth
                )
                return (
                  <span
                    key={tick.toISOString()}
                    className="absolute top-2 text-[11px] text-muted-foreground"
                    style={{ left: pos?.left ?? 0 }}
                  >
                    {format(tick, "d MMM", { locale: faIR })}
                  </span>
                )
              })}
            </div>
          </div>

          {filteredTasks.map((task) => {
            const bar = getBarPosition(task, rangeStart, rangeEnd, totalWidth)
            const delayed = isTaskDelayed(task)
            return (
              <div
                key={task.id}
                className="flex border-b border-border last:border-b-0"
                style={{ height: ROW_HEIGHT }}
              >
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-2 border-r border-border px-3 text-left text-sm hover:bg-neutral/50"
                  style={{ width: LABEL_WIDTH }}
                  onClick={() => openTaskDrawer(task.id)}
                >
                  <span className="truncate text-xs text-muted-foreground">{task.key}</span>
                  <span className="truncate font-medium">{task.title}</span>
                </button>
                <div className="relative flex-1" style={{ width: totalWidth }}>
                  {bar ? (
                    <button
                      type="button"
                      onClick={() => openTaskDrawer(task.id)}
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 rounded-sm px-2 text-left text-[11px] font-medium text-white transition-opacity hover:opacity-90",
                        delayed ? "bg-destructive" : "bg-primary"
                      )}
                      style={{
                        left: bar.left,
                        width: bar.width,
                        height: BAR_HEIGHT,
                        lineHeight: `${BAR_HEIGHT}px`,
                      }}
                      title={`${task.title} — ${task.dueDate ? formatDate(task.dueDate) : ""}`}
                    >
                      <span className="block truncate">{task.title}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}

          {milestones.length > 0 ? (
            <div className="flex border-t border-border bg-neutral/30">
              <div
                className="flex shrink-0 items-center gap-1 border-r border-border px-3 py-2 text-xs font-bold uppercase text-muted-foreground"
                style={{ width: LABEL_WIDTH }}
              >
                <Diamond className="h-3 w-3 text-purple" />
                نقاط عطف
              </div>
              <div className="relative flex-1 py-2" style={{ width: totalWidth, height: 36 }}>
                {milestones.map((task) => {
                  if (!task.dueDate) return null
                  const bar = getBarPosition(task, rangeStart, rangeEnd, totalWidth)
                  if (!bar) return null
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: bar.left + bar.width / 2 }}
                      onClick={() => openTaskDrawer(task.id)}
                      title={task.title}
                    >
                      <Diamond className="h-4 w-4 fill-purple text-purple" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-sm bg-primary" /> در مسیر
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-6 rounded-sm bg-destructive" /> تأخیر
        </span>
        <span className="flex items-center gap-1">
          <Diamond className="h-3 w-3 fill-purple text-purple" /> نقطه عطف
        </span>
        {filteredTasks.filter(isTaskDelayed).length > 0 ? (
          <Badge variant="destructive">
            {filteredTasks.filter(isTaskDelayed).length} مورد تأخیر
          </Badge>
        ) : null}
      </div>
    </div>
  )
}
