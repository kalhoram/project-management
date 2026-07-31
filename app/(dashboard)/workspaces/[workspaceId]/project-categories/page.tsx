"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { FolderTree, Plus } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { TableSkeleton } from "@/components/common/loading-skeleton"
import { ExportMenu } from "@/components/common/export-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProjectCategories, useWorkspace } from "@/hooks/queries"

export default function ProjectCategoriesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const categories = useProjectCategories(workspaceId)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#0052CC")

  function handleCreate() {
    if (!newName.trim()) {
      toast.error("نام دسته‌بندی الزامی است")
      return
    }
    toast.success(`دسته‌بندی «${newName}» ایجاد شد`)
    setCreateOpen(false)
    setNewName("")
    setNewColor("#0052CC")
  }

  if (categories.isLoading) {
    return (
      <DashboardShell>
        <PageHeader title="دسته‌بندی پروژه‌ها" />
        <TableSkeleton rows={4} />
      </DashboardShell>
    )
  }

  if (categories.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری دسته‌بندی‌ها ممکن نشد." onRetry={() => categories.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="دسته‌بندی پروژه‌ها"
        description="سازمان‌دهی پروژه‌ها بر اساس دسته"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "دسته‌بندی‌ها" },
        ]}
        actions={
          <div className="flex gap-2">
            <ExportMenu entityName="دسته‌بندی‌ها" />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              دسته‌بندی جدید
            </Button>
          </div>
        }
      />

      {(categories.data ?? []).length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="هنوز دسته‌بندی ندارید"
          description="دسته‌بندی بسازید تا پروژه‌ها را سازمان‌دهی کنید."
          actionLabel="ایجاد دسته‌بندی"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="rounded-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>دسته‌بندی</TableHead>
                <TableHead>رنگ</TableHead>
                <TableHead className="text-right">پروژه‌ها</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(categories.data ?? []).map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {cat.color}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {cat.projectCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ایجاد دسته‌بندی</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">نام</Label>
              <Input
                id="cat-name"
                placeholder="محصول"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-color">رنگ</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cat-color"
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer p-1"
                />
                <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleCreate}>ایجاد دسته‌بندی</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
