import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import type { Task, TaskPriority, TaskStatus, User } from "@/lib/types"
import { lookupUser } from "@/lib/user-registry"

export interface TaskFilters {
  search: string
  statuses: TaskStatus[]
  priorities: TaskPriority[]
  assigneeIds: string[]
  labelIds: string[]
}

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  search: "",
  statuses: [],
  priorities: [],
  assigneeIds: [],
  labelIds: [],
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const query = filters.search.trim().toLowerCase()

  return tasks.filter((task) => {
    if (query) {
      const haystack = `${task.key} ${task.title} ${task.description ?? ""}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false
    if (filters.assigneeIds.length > 0) {
      if (!task.assigneeId || !filters.assigneeIds.includes(task.assigneeId)) return false
    }
    if (filters.labelIds.length > 0) {
      if (!filters.labelIds.some((id) => task.labelIds.includes(id))) return false
    }
    return true
  })
}

export function getChecklistProgress(task: Task): { completed: number; total: number } {
  const total = task.checklist.length
  const completed = task.checklist.filter((item) => item.completed).length
  return { completed, total }
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "cancelled") return false
  return isBefore(parseISO(task.dueDate), new Date())
}

export function isTaskDelayed(task: Task): boolean {
  return isTaskOverdue(task) && task.status !== "done"
}

export function getUserById(userId: string): User | undefined {
  return lookupUser(userId)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export type CalendarViewMode = "month" | "week" | "day"
export type TimelineZoom = "day" | "week" | "month"

export function getCalendarDays(date: Date, mode: CalendarViewMode): Date[] {
  if (mode === "day") return [date]
  if (mode === "week") {
    return eachDayOfInterval({
      start: startOfWeek(date, { weekStartsOn: 0 }),
      end: endOfWeek(date, { weekStartsOn: 0 }),
    })
  }
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function getTasksForDay(tasks: Task[], day: Date): Task[] {
  return tasks.filter((task) => task.dueDate && isSameDay(parseISO(task.dueDate), day))
}

export function getTimelineRange(tasks: Task[]): { start: Date; end: Date } {
  const now = new Date()
  const dates = tasks.flatMap((task) =>
    [task.startDate, task.dueDate].filter(Boolean).map((d) => parseISO(d as string))
  )
  if (dates.length === 0) {
    return { start: addDays(now, -7), end: addDays(now, 30) }
  }
  const start = dates.reduce((min, d) => (d < min ? d : min), dates[0])
  const end = dates.reduce((max, d) => (d > max ? d : max), dates[0])
  return { start: addDays(start, -3), end: addDays(end, 7) }
}

export function getBarPosition(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date,
  totalWidth: number
): { left: number; width: number } | null {
  const start = task.startDate
    ? parseISO(task.startDate)
    : task.dueDate
      ? addDays(parseISO(task.dueDate), -2)
      : null
  const end = task.dueDate
    ? parseISO(task.dueDate)
    : start
      ? addDays(start, 2)
      : null
  if (!start || !end) return null

  const totalMs = rangeEnd.getTime() - rangeStart.getTime()
  if (totalMs <= 0) return null

  // Ensure at least one day span so single-date tasks still render
  const endMs = Math.max(end.getTime(), start.getTime() + 24 * 60 * 60 * 1000)

  const clampedStart = Math.max(start.getTime(), rangeStart.getTime())
  const clampedEnd = Math.min(endMs, rangeEnd.getTime())
  if (clampedEnd < clampedStart) return null

  const left = ((clampedStart - rangeStart.getTime()) / totalMs) * totalWidth
  const width = Math.max(((clampedEnd - clampedStart) / totalMs) * totalWidth, 24)
  return { left, width }
}

export function formatCalendarHeader(date: Date, mode: CalendarViewMode): string {
  if (mode === "day") return format(date, "EEEE, MMMM d, yyyy")
  if (mode === "week") {
    const start = startOfWeek(date, { weekStartsOn: 0 })
    const end = endOfWeek(date, { weekStartsOn: 0 })
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
  }
  return format(date, "MMMM yyyy")
}

export function shiftCalendarDate(date: Date, mode: CalendarViewMode, direction: -1 | 1): Date {
  if (mode === "day") return addDays(date, direction)
  if (mode === "week") return addDays(date, direction * 7)
  return addMonths(date, direction)
}

export { isSameDay, isSameMonth, isToday, format }
