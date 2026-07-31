"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, MoreHorizontal, Plus } from "lucide-react"
import { KanbanCard } from "@/components/features/kanban/kanban-card"
import type { CardDisplaySettings } from "@/components/features/kanban/card-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { KanbanColumn, Label, Task } from "@/lib/types"
import { cn } from "@/lib/utils"

interface KanbanColumnViewProps {
  column: KanbanColumn
  tasks: Task[]
  labels: Label[]
  settings: CardDisplaySettings
  onAddTask: (columnId: string, title: string) => void
  onRenameColumn?: (columnId: string, name: string) => void
  onDeleteColumn?: (columnId: string) => void
}

export function KanbanColumnView({
  column,
  tasks,
  labels,
  settings,
  onAddTask,
  onRenameColumn,
  onDeleteColumn,
}: KanbanColumnViewProps) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.name)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id, data: { type: "column", column } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const atWipLimit = column.wipLimit !== undefined && tasks.length >= column.wipLimit

  function submitTask() {
    const title = newTitle.trim()
    if (!title) return
    onAddTask(column.id, title)
    setNewTitle("")
    setAdding(false)
  }

  function submitRename() {
    const name = renameValue.trim()
    if (name && onRenameColumn) onRenameColumn(column.id, name)
    setRenaming(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-sm border border-border bg-neutral/50",
        isDragging && "opacity-80 shadow-level-2"
      )}
    >
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <button
          type="button"
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="کشیدن ستون"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: column.color }}
        />
        {renaming ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename()
              if (e.key === "Escape") setRenaming(false)
            }}
            className="h-7 flex-1 text-sm"
            autoFocus
          />
        ) : (
          <h3 className="flex-1 truncate text-sm font-medium">{column.name}</h3>
        )}
        <Badge
          variant={atWipLimit ? "destructive" : "secondary"}
          className="h-5 shrink-0 px-1.5 text-[11px]"
        >
          {tasks.length}
          {column.wipLimit !== undefined ? ` / ${column.wipLimit}` : ""}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRenaming(true)}>تغییر نام</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAdding(true)}>افزودن وظیفه</DropdownMenuItem>
            {onDeleteColumn ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteColumn(column.id)}
              >
                حذف ستون
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2" style={{ minHeight: 120 }}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} labels={labels} settings={settings} />
          ))}
        </div>
      </SortableContext>

      <div className="border-t border-border p-2">
        {adding ? (
          <div className="space-y-2">
            <Input
              placeholder="عنوان وظیفه..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitTask()
                if (e.key === "Escape") setAdding(false)
              }}
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitTask}>
                افزودن
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                انصراف
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setAdding(true)}
            disabled={atWipLimit}
          >
            <Plus className="h-4 w-4" />
            افزودن وظیفه
          </Button>
        )}
      </div>
    </div>
  )
}
