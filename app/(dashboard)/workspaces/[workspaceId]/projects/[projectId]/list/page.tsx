"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { CardFilters } from "@/components/features/kanban/card-filters"
import { TaskTable } from "@/components/features/list/task-table"
import { ProjectViewShell } from "@/components/features/projects/project-view-shell"
import { PageToolbar } from "@/components/common/page-toolbar"
import { TableSkeleton } from "@/components/common/loading-skeleton"
import { useTasks, useProject } from "@/hooks/queries"
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  type TaskFilters,
} from "@/lib/task-utils"
import type { Task, TaskStatus } from "@/lib/types"

export default function ListPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string

  const project = useProject(projectId)
  const tasks = useTasks(projectId)
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null)
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS)

  const taskList = localTasks ?? tasks.data ?? []
  const filtered = filterTasks(taskList, filters)

  const isLoading = tasks.isLoading || project.isLoading
  const isError = tasks.isError || project.isError

  function handleStatusChange(taskId: string, status: TaskStatus) {
    setLocalTasks((prev) => {
      const base = prev ?? tasks.data ?? []
      return base.map((t) => (t.id === taskId ? { ...t, status } : t))
    })
  }

  function handleAssigneeChange(taskId: string, assigneeId: string | undefined) {
    setLocalTasks((prev) => {
      const base = prev ?? tasks.data ?? []
      return base.map((t) => (t.id === taskId ? { ...t, assigneeId } : t))
    })
  }

  if (isLoading) {
    return (
      <ProjectViewShell
        workspaceId={workspaceId}
        projectId={projectId}
        title="نمای لیست"
        description="جدول مرتب‌سازی‌پذیر وظایف"
        isLoading
      >
        <TableSkeleton />
      </ProjectViewShell>
    )
  }

  return (
    <ProjectViewShell
      workspaceId={workspaceId}
      projectId={projectId}
      title="نمای لیست"
      description="جدول مرتب‌سازی‌پذیر با انتخاب گروهی"
      isError={isError}
      isEmpty={taskList.length === 0}
      onRetry={() => {
        tasks.refetch()
        project.refetch()
      }}
    >
      <PageToolbar
        left={
          <CardFilters
            filters={filters}
            onChange={setFilters}
            members={project.data?.memberIds}
          />
        }
      />
      <TaskTable
        tasks={filtered}
        workspaceId={workspaceId}
        projectId={projectId}
        onStatusChange={handleStatusChange}
        onAssigneeChange={handleAssigneeChange}
      />
    </ProjectViewShell>
  )
}
