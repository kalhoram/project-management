"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  FolderKanban,
  Search,
  SquareCheck,
  Users,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useUIStore, useWorkspaceStore } from "@/stores/ui-store"
import { useGlobalSearch } from "@/hooks/queries"

export function GlobalCommandSearch() {
  const router = useRouter()
  const { commandOpen, setCommandOpen } = useUIStore()
  const { currentWorkspaceId } = useWorkspaceStore()
  const [query, setQuery] = useState("")
  const { data, isFetching } = useGlobalSearch(currentWorkspaceId ?? "", query)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [commandOpen, setCommandOpen])

  const go = (href: string) => {
    setCommandOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput
        placeholder="جستجوی وظایف، پروژه‌ها، افراد و فایل‌ها…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>{isFetching ? "در حال جستجو…" : "نتیجه‌ای یافت نشد."}</CommandEmpty>
        {!query ? (
          <CommandGroup heading="دسترسی سریع">
            <CommandItem onSelect={() => go("/dashboard")}>
              <Search className="h-4 w-4" />
              رفتن به داشبورد
            </CommandItem>
            <CommandItem
              onSelect={() =>
                currentWorkspaceId
                  ? go(`/workspaces/${currentWorkspaceId}/projects/new`)
                  : go("/workspaces")
              }
            >
              <FolderKanban className="h-4 w-4" />
              ایجاد پروژه
            </CommandItem>
            <CommandItem onSelect={() => go("/search")}>
              <Search className="h-4 w-4" />
              باز کردن صفحه جستجو
            </CommandItem>
          </CommandGroup>
        ) : null}
        {data?.tasks?.length ? (
          <CommandGroup heading="وظایف">
            {data.tasks.slice(0, 5).map((task) => (
              <CommandItem
                key={task.id}
                onSelect={() =>
                  go(
                    `/workspaces/${task.workspaceId}/projects/${task.projectId}/tasks/${task.id}`
                  )
                }
              >
                <SquareCheck className="h-4 w-4" />
                <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
                {task.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {data?.projects?.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="پروژه‌ها">
              {data.projects.slice(0, 5).map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() =>
                    go(`/workspaces/${project.workspaceId}/projects/${project.id}`)
                  }
                >
                  <FolderKanban className="h-4 w-4" />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
        {data?.users?.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="افراد">
              {data.users.slice(0, 5).map((user) => (
                <CommandItem key={user.id} onSelect={() => go("/search?tab=users")}>
                  <Users className="h-4 w-4" />
                  {user.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
        {data?.files?.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="فایل‌ها">
              {data.files.slice(0, 5).map((file) => (
                <CommandItem
                  key={file.id}
                  onSelect={() => go(`/workspaces/${file.workspaceId}/files`)}
                >
                  <FileText className="h-4 w-4" />
                  {file.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
