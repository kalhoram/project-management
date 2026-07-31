"use client"

import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useProjects } from "@/hooks/queries"
import { useWorkspaceStore } from "@/stores/ui-store"
import { Skeleton } from "@/components/ui/skeleton"

export function ProjectSwitcher() {
  const router = useRouter()
  const { currentWorkspaceId, currentProjectId, setCurrentProjectId } = useWorkspaceStore()
  const { data: projects, isLoading } = useProjects(currentWorkspaceId)
  const current = projects?.find((p) => p.id === currentProjectId)

  if (isLoading) return <Skeleton className="h-8 w-36" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[180px] justify-between">
          <span className="truncate">{current?.name ?? "پروژه"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>پروژه‌ها</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects?.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => {
              setCurrentProjectId(project.id)
              router.push(`/workspaces/${currentWorkspaceId}/projects/${project.id}`)
            }}
          >
            <span className="me-2 font-mono text-xs text-muted-foreground">{project.key}</span>
            <span className="flex-1 truncate">{project.name}</span>
            {project.id === currentProjectId ? <Check className="h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push(`/workspaces/${currentWorkspaceId}/projects`)}
        >
          مشاهده همه پروژه‌ها
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/workspaces/${currentWorkspaceId}/projects/new`)}
        >
          <Plus className="h-4 w-4" />
          ایجاد پروژه
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
