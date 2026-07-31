"use client"

import { Fragment, useMemo, useState } from "react"
import Link from "next/link"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { StatusBadge } from "@/components/common/status-badge"
import { PriorityBadge } from "@/components/common/priority-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Task, TaskStatus } from "@/lib/types"
import { getUserById, isTaskOverdue } from "@/lib/task-utils"
import { formatDate } from "@/lib/utils"
import { useUIStore } from "@/stores/ui-store"
import { TASK_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

type GroupBy = "none" | "status" | "assignee"

interface TaskTableProps {
  tasks: Task[]
  workspaceId: string
  projectId: string
  onStatusChange?: (taskId: string, status: TaskStatus) => void
  onAssigneeChange?: (taskId: string, assigneeId: string | undefined) => void
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function TaskTable({
  tasks,
  workspaceId,
  projectId,
  onStatusChange,
  onAssigneeChange,
}: TaskTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [groupBy, setGroupBy] = useState<GroupBy>("none")
  const openTaskDrawer = useUIStore((s) => s.openTaskDrawer)

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="انتخاب همه"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="انتخاب ردیف"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "key",
        header: "کلید",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-muted-foreground">{row.original.key}</span>
        ),
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            عنوان
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left font-medium hover:text-primary"
            onClick={() => openTaskDrawer(row.original.id)}
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: "status",
        header: "وضعیت",
        cell: ({ row }) =>
          onStatusChange ? (
            <Select
              value={row.original.status}
              onValueChange={(v) => onStatusChange(row.original.id, v as TaskStatus)}
            >
              <SelectTrigger className="h-8 w-[130px]" onClick={(e) => e.stopPropagation()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "backlog",
                    "todo",
                    "in_progress",
                    "in_review",
                    "done",
                    "blocked",
                    "cancelled",
                  ] as TaskStatus[]
                ).map((s) => (
                  <SelectItem key={s} value={s}>
                    {TASK_STATUS_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge status={row.original.status} />
          ),
      },
      {
        accessorKey: "priority",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            اولویت
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        accessorKey: "assigneeId",
        header: "مسئول",
        cell: ({ row }) => {
          const assignee = row.original.assigneeId
            ? getUserById(row.original.assigneeId)
            : undefined
          if (onAssigneeChange) {
            return (
              <Select
                value={row.original.assigneeId ?? "unassigned"}
                onValueChange={(v) =>
                  onAssigneeChange(row.original.id, v === "unassigned" ? undefined : v)
                }
              >
                <SelectTrigger className="h-8 w-[140px]" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="بدون مسئول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">بدون مسئول</SelectItem>
                  {["user-1", "user-2", "user-3", "user-4"].map((id) => {
                    const user = getUserById(id)
                    return user ? (
                      <SelectItem key={id} value={id}>
                        {user.name}
                      </SelectItem>
                    ) : null
                  })}
                </SelectContent>
              </Select>
            )
          }
          if (!assignee) return <span className="text-muted-foreground">—</span>
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {assignee.avatarUrl ? (
                  <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                ) : null}
                <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{assignee.name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            مهلت
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const due = row.original.dueDate
          if (!due) return <span className="text-muted-foreground">—</span>
          const overdue = isTaskOverdue(row.original)
          return (
            <span className={cn("text-sm", overdue && "font-medium text-destructive")}>
              {formatDate(due)}
            </span>
          )
        },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button variant="link" size="sm" asChild className="h-8 px-0">
            <Link
              href={`/workspaces/${workspaceId}/projects/${projectId}/tasks/${row.original.id}`}
            >
              مشاهده
            </Link>
          </Button>
        ),
      },
    ],
    [workspaceId, projectId, onStatusChange, onAssigneeChange, openTaskDrawer]
  )

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const groupedRows = useMemo(() => {
    const rows = table.getRowModel().rows
    if (groupBy === "none") return [{ key: "all", label: null, rows }]

    const groups = new Map<string, typeof rows>()
    for (const row of rows) {
      let key: string
      if (groupBy === "status") {
        key = row.original.status
      } else {
        key = row.original.assigneeId ?? "unassigned"
      }
      groups.set(key, [...(groups.get(key) ?? []), row])
    }

    return Array.from(groups.entries()).map(([key, groupRows]) => {
      let label = key
      if (groupBy === "status") label = TASK_STATUS_LABELS[key] ?? key
      if (groupBy === "assignee") {
        const user = key !== "unassigned" ? getUserById(key) : undefined
        label = user?.name ?? "بدون مسئول"
      }
      return { key, label, rows: groupRows }
    })
  }, [table, groupBy])

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">گروه‌بندی</span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون گروه</SelectItem>
              <SelectItem value="status">وضعیت</SelectItem>
              <SelectItem value="assignee">مسئول</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selectedCount > 0 ? (
          <span className="text-sm text-muted-foreground">{selectedCount} مورد انتخاب شده</span>
        ) : null}
      </div>

      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {groupedRows.map((group) => (
              <Fragment key={group.key ?? "all"}>
                {group.label ? (
                  <TableRow key={`group-${group.key}`} className="bg-surface/50 hover:bg-surface/50">
                    <TableCell colSpan={columns.length} className="py-2 font-medium">
                      {group.label}
                      <span className="ml-2 text-muted-foreground">({group.rows.length})</span>
                    </TableCell>
                  </TableRow>
                ) : null}
                {group.rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  وظیفه‌ای یافت نشد.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          صفحه {table.getState().pagination.pageIndex + 1} از {table.getPageCount()}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            قبلی
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            بعدی
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
