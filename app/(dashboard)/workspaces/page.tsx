"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Plus, Search, Users } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { PageToolbar } from "@/components/common/page-toolbar"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { CardGridSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useWorkspaces } from "@/hooks/queries"
import { formatDate } from "@/lib/utils"

const workspaceStatusLabels: Record<string, string> = {
  active: "فعال",
  trial: "آزمایشی",
  suspended: "معلق",
}

export default function WorkspacesPage() {
  const router = useRouter()
  const { data: workspaces, isLoading, isError, refetch } = useWorkspaces()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    if (!workspaces) return []
    const q = search.trim().toLowerCase()
    if (!q) return workspaces
    return workspaces.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.slug.toLowerCase().includes(q) ||
        w.description?.toLowerCase().includes(q)
    )
  }, [workspaces, search])

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("نام فضای کاری الزامی است")
      return
    }
    setCreating(true)
    await new Promise((r) => setTimeout(r, 500))
    toast.success("فضای کاری ایجاد شد", { description: `"${newName}" آماده استفاده است.` })
    setCreating(false)
    setCreateOpen(false)
    setNewName("")
    router.push("/workspaces/ws-1")
  }

  return (
    <DashboardShell>
      <PageHeader
        title="فضاهای کاری"
        description="همه فضاهای کاری که عضو آن‌ها هستید"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            ایجاد فضای کاری
          </Button>
        }
      />

      <PageToolbar
        left={
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی فضاهای کاری…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
      />

      {isLoading ? <CardGridSkeleton count={6} /> : null}

      {isError ? (
        <ErrorState message="بارگذاری فضاهای کاری ممکن نشد." onRetry={() => refetch()} />
      ) : null}

      {!isLoading && !isError && filtered.length === 0 ? (
        search ? (
          <EmptyState
            title="فضای کاری یافت نشد"
            description={`نتیجه‌ای برای «${search}» یافت نشد. عبارت دیگری امتحان کنید.`}
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="هنوز فضای کاری ندارید"
            description="اولین فضای کاری خود را بسازید تا پروژه‌ها و وظایف را مدیریت کنید."
            actionLabel="ایجاد فضای کاری"
            onAction={() => setCreateOpen(true)}
          />
        )
      ) : null}

      {!isLoading && !isError && filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((workspace) => (
            <Link key={workspace.id} href={`/workspaces/${workspace.id}`}>
              <Card className="h-full transition-shadow hover:shadow-[var(--shadow-1)] cursor-pointer">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground">{workspace.slug}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      workspace.status === "active"
                        ? "success"
                        : workspace.status === "trial"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {workspaceStatusLabels[workspace.status] ?? workspace.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {workspace.description ?? "بدون توضیحات"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {workspace.memberCount} عضو
                    </span>
                    <span>{workspace.projectCount} پروژه</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ایجاد شده {formatDate(workspace.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ایجاد فضای کاری</DialogTitle>
            <DialogDescription>
              فضای کاری جدیدی برای پروژه‌های تیم خود راه‌اندازی کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ws-name">نام فضای کاری</Label>
            <Input
              id="ws-name"
              placeholder="فضای کاری"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "در حال ایجاد…" : "ایجاد فضای کاری"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
