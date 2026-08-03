"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { KanbanColumnView } from "@/components/features/kanban/kanban-column"
import { KanbanCardOverlay } from "@/components/features/kanban/kanban-card"
import {
  CardFilters,
} from "@/components/features/kanban/card-filters"
import {
  CardSettings,
  DEFAULT_CARD_SETTINGS,
  type CardDisplaySettings,
} from "@/components/features/kanban/card-settings"
import { PageToolbar } from "@/components/common/page-toolbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { KanbanColumn, Label, Task, TaskStatus } from "@/lib/types"
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  type TaskFilters,
} from "@/lib/task-utils"

interface KanbanBoardProps {
  projectId: string
  workspaceId: string
  columns: KanbanColumn[]
  tasks: Task[]
  labels: Label[]
  reporterId?: string
}

function findColumnForTask(columns: KanbanColumn[], task: Task): string | undefined {
  if (task.columnId) return task.columnId
  const match = columns.find((c) => c.status === task.status)
  return match?.id
}

export function KanbanBoard({
  projectId,
  workspaceId,
  columns: initialColumns,
  tasks: initialTasks,
  labels,
  reporterId,
}: KanbanBoardProps) {
  void reporterId
  const [columns, setColumns] = useState(initialColumns)
  const [tasks, setTasks] = useState(initialTasks)
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS)
  const [settings, setSettings] = useState<CardDisplaySettings>(DEFAULT_CARD_SETTINGS)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")

  useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters])

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const column of columns) {
      map.set(column.id, [])
    }
    for (const task of filteredTasks) {
      const columnId = findColumnForTask(columns, task)
      if (columnId && map.has(columnId)) {
        map.get(columnId)?.push(task)
      }
    }
    for (const [, columnTasks] of map) {
      columnTasks.sort((a, b) => a.order - b.order)
    }
    return map
  }, [columns, filteredTasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) setActiveTask(task)
  }, [tasks])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const activeData = active.data.current
      if (activeData?.type !== "task") return

      const activeTaskItem = tasks.find((t) => t.id === activeId)
      if (!activeTaskItem) return

      let overColumnId: string | undefined
      if (over.data.current?.type === "column") {
        overColumnId = overId
      } else if (over.data.current?.type === "task") {
        overColumnId = over.data.current.columnId as string
      } else {
        overColumnId = columns.find((c) => c.id === overId)?.id
      }

      if (!overColumnId || activeTaskItem.columnId === overColumnId) return

      const overColumn = columns.find((c) => c.id === overColumnId)
      if (!overColumn) return

      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? { ...t, columnId: overColumnId, status: overColumn.status }
            : t
        )
      )
    },
    [columns, tasks]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTask(null)
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const activeData = active.data.current

      if (activeData?.type === "column") {
        const oldIndex = columns.findIndex((c) => c.id === activeId)
        const newIndex = columns.findIndex((c) => c.id === overId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          setColumns((prev) => {
            const reordered = arrayMove(prev, oldIndex, newIndex)
            return reordered.map((col, index) => ({ ...col, order: index }))
          })
        }
        return
      }

      if (activeData?.type !== "task") return

      const activeTaskItem = tasks.find((t) => t.id === activeId)
      if (!activeTaskItem?.columnId) return

      const columnId = activeTaskItem.columnId
      const columnTasks = tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.order - b.order)

      const overTask = tasks.find((t) => t.id === overId)
      if (overTask && overTask.columnId === columnId) {
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex)
          setTasks((prev) => {
            const others = prev.filter((t) => t.columnId !== columnId)
            const updated = reordered.map((t, index) => ({ ...t, order: index }))
            return [...others, ...updated]
          })
        }
      }
    },
    [columns, tasks]
  )

  function handleAddTask(columnId: string, title: string) {
    const column = columns.find((c) => c.id === columnId)
    if (!column) return
    const columnTasks = tasks.filter((t) => t.columnId === columnId)
    const newTask: Task = {
      id: `task-local-${Date.now()}`,
      projectId,
      workspaceId,
      key: `NEW-${tasks.length + 1}`,
      title,
      status: column.status,
      priority: "medium",
      reporterId: reporterId ?? "",
      labelIds: [],
      progress: 0,
      columnId,
      order: columnTasks.length,
      blockedByIds: [],
      blockingIds: [],
      checklist: [],
      attachmentCount: 0,
      commentCount: 0,
      isRecurring: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setTasks((prev) => [...prev, newTask])
  }

  function handleAddColumn() {
    const name = newColumnName.trim()
    if (!name) return
    const newColumn: KanbanColumn = {
      id: `col-local-${Date.now()}`,
      projectId,
      name,
      status: "todo" as TaskStatus,
      order: columns.length,
      color: "#0052CC",
    }
    setColumns((prev) => [...prev, newColumn])
    setNewColumnName("")
    setAddingColumn(false)
  }

  function handleRenameColumn(columnId: string, name: string) {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name } : c)))
  }

  function handleDeleteColumn(columnId: string) {
    const fallback = columns.find((c) => c.id !== columnId)
    if (!fallback) return
    setColumns((prev) => prev.filter((c) => c.id !== columnId))
    setTasks((prev) =>
      prev.map((t) =>
        t.columnId === columnId
          ? { ...t, columnId: fallback.id, status: fallback.status }
          : t
      )
    )
  }

  return (
    <div className="space-y-4">
      <PageToolbar
        left={<CardFilters filters={filters} onChange={setFilters} />}
        right={<CardSettings settings={settings} onChange={setSettings} />}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map((column) => (
              <KanbanColumnView
                key={column.id}
                column={column}
                tasks={tasksByColumn.get(column.id) ?? []}
                labels={labels}
                settings={settings}
                onAddTask={handleAddTask}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={columns.length > 1 ? handleDeleteColumn : undefined}
              />
            ))}

            <div className="w-72 shrink-0">
              {addingColumn ? (
                <div className="rounded-sm border border-border bg-card p-3 space-y-2">
                  <Input
                    placeholder="نام ستون..."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn()
                      if (e.key === "Escape") setAddingColumn(false)
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddColumn}>
                      افزودن ستون
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>
                      انصراف
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="h-full min-h-[120px] w-full border-dashed"
                  onClick={() => setAddingColumn(true)}
                >
                  <Plus className="h-4 w-4" />
                  افزودن ستون
                </Button>
              )}
            </div>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <KanbanCardOverlay task={activeTask} labels={labels} settings={settings} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
