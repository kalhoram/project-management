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
import { useWorkspaces } from "@/hooks/queries"
import { useWorkspaceStore } from "@/stores/ui-store"
import { Skeleton } from "@/components/ui/skeleton"

export function WorkspaceSwitcher() {
  const router = useRouter()
  const { data: workspaces, isLoading } = useWorkspaces()
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaceStore()
  const current = workspaces?.find((w) => w.id === currentWorkspaceId)

  if (isLoading) return <Skeleton className="h-8 w-36" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[180px] justify-between">
          <span className="truncate">{current?.name ?? "فضای کاری"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>فضاهای کاری</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces?.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => {
              setCurrentWorkspaceId(workspace.id)
              router.push(`/workspaces/${workspace.id}`)
            }}
          >
            <span className="flex-1 truncate">{workspace.name}</span>
            {workspace.id === currentWorkspaceId ? <Check className="h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/workspaces")}>
          مشاهده همه فضاهای کاری
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/onboarding/workspace")}>
          <Plus className="h-4 w-4" />
          ایجاد فضای کاری
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
