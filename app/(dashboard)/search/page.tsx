"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FileText, FolderKanban, MessageSquare, Search, Users } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGlobalSearch } from "@/hooks/queries"
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/constants"
import { mockUsers } from "@/lib/mock/data"
import { formatDate } from "@/lib/utils"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} بایت`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} کیلوبایت`
  return `${(bytes / 1048576).toFixed(1)} مگابایت`
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [submitted, setSubmitted] = useState("task")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [assigneeOnly, setAssigneeOnly] = useState(false)

  const search = useGlobalSearch(submitted.length > 0 ? submitted : query)

  const results = search.data

  const filteredTasks = useMemo(() => {
    if (!results?.tasks) return []
    return results.tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false
      if (assigneeOnly && t.assigneeId !== "user-1") return false
      return true
    })
  }, [results?.tasks, statusFilter, priorityFilter, assigneeOnly])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(query.trim())
  }

  return (
    <DashboardShell>
      <PageHeader title="جستجو" description="وظایف، پروژه‌ها، افراد، فایل‌ها و نظرات را پیدا کنید" />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 space-y-4 lg:w-64">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">فیلترها</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>وضعیت</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="todo">{TASK_STATUS_LABELS.todo}</SelectItem>
                    <SelectItem value="in_progress">{TASK_STATUS_LABELS.in_progress}</SelectItem>
                    <SelectItem value="in_review">{TASK_STATUS_LABELS.in_review}</SelectItem>
                    <SelectItem value="done">{TASK_STATUS_LABELS.done}</SelectItem>
                    <SelectItem value="blocked">{TASK_STATUS_LABELS.blocked}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اولویت</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه اولویت‌ها</SelectItem>
                    <SelectItem value="highest">{PRIORITY_LABELS.highest}</SelectItem>
                    <SelectItem value="high">{PRIORITY_LABELS.high}</SelectItem>
                    <SelectItem value="medium">{PRIORITY_LABELS.medium}</SelectItem>
                    <SelectItem value="low">{PRIORITY_LABELS.low}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="mine" checked={assigneeOnly} onCheckedChange={(v) => setAssigneeOnly(!!v)} />
                <Label htmlFor="mine" className="font-normal">محول‌شده به من</Label>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 flex-1">
          <form onSubmit={handleSearch} className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجو در یادباکس…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-24"
            />
            <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2">
              جستجو
            </Button>
          </form>

          {!submitted ? (
            <EmptyState
              icon={Search}
              title="جستجو را شروع کنید"
              description="عبارتی وارد کنید تا در وظایف، پروژه‌ها، کاربران، فایل‌ها و نظرات جستجو شود."
            />
          ) : search.isLoading ? (
            <p className="text-sm text-muted-foreground">در حال جستجو…</p>
          ) : search.isError ? (
            <ErrorState onRetry={() => search.refetch()} />
          ) : (
            <Tabs defaultValue="tasks">
              <TabsList>
                <TabsTrigger value="tasks">وظایف ({filteredTasks.length})</TabsTrigger>
                <TabsTrigger value="projects">پروژه‌ها ({results?.projects.length ?? 0})</TabsTrigger>
                <TabsTrigger value="users">کاربران ({results?.users.length ?? 0})</TabsTrigger>
                <TabsTrigger value="files">فایل‌ها ({results?.files.length ?? 0})</TabsTrigger>
                <TabsTrigger value="comments">نظرات ({results?.comments.length ?? 0})</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-4 space-y-2">
                {filteredTasks.length === 0 ? (
                  <EmptyState title="وظیفه‌ای یافت نشد" description="فیلترها یا عبارت جستجو را تغییر دهید." />
                ) : (
                  filteredTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/workspaces/${task.workspaceId}/projects/${task.projectId}/tasks/${task.id}`}
                      className="flex items-center justify-between rounded-sm border border-border bg-card px-4 py-3 hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.key}</p>
                      </div>
                      <StatusBadge status={task.status} />
                    </Link>
                  ))
                )}
              </TabsContent>

              <TabsContent value="projects" className="mt-4 space-y-2">
                {(results?.projects ?? []).map((project) => (
                  <Link
                    key={project.id}
                    href={`/workspaces/${project.workspaceId}/projects/${project.id}`}
                    className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3 hover:bg-muted/50"
                  >
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.key}</p>
                    </div>
                  </Link>
                ))}
              </TabsContent>

              <TabsContent value="users" className="mt-4 space-y-2">
                {(results?.users ?? []).map((user) => (
                  <div key={user.id} className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3">
                    <Users className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="files" className="mt-4 space-y-2">
                {(results?.files ?? []).map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-sm border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {mockUsers.find((u) => u.id === file.uploadedById)?.name} · {formatDate(file.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="comments" className="mt-4 space-y-2">
                {(results?.comments ?? []).map((comment) => (
                  <div key={comment.id} className="rounded-sm border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {mockUsers.find((u) => u.id === comment.authorId)?.name} · {formatDate(comment.createdAt)}
                    </div>
                    <p className="mt-1 text-sm">{comment.body}</p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
