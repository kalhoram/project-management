"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminPlans } from "@/hooks/queries"
import type { Plan } from "@/lib/types"

const planStatusLabels: Record<string, string> = {
  active: "فعال",
  inactive: "غیرفعال",
}

export default function AdminPlansPage() {
  const plans = useAdminPlans()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)

  if (plans.isLoading) return <PageSkeleton />
  if (plans.isError) return <ErrorState onRetry={() => plans.refetch()} />

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditing(plan)
    setDialogOpen(true)
  }

  function handleSave() {
    toast.success(editing ? "طرح به‌روزرسانی شد" : "طرح ایجاد شد")
    setDialogOpen(false)
  }

  return (
    <>
      <PageHeader
        title="طرح‌ها"
        description="مدیریت طرح‌های اشتراک"
        actions={
          <div className="flex gap-2">
            <ExportMenu entityName="طرح‌ها" />
            <Button onClick={openCreate}><Plus className="h-4 w-4" />افزودن طرح</Button>
          </div>
        }
      />

      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>طرح</TableHead>
              <TableHead>ماهانه</TableHead>
              <TableHead>سالانه</TableHead>
              <TableHead>محدودیت‌ها</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(plans.data ?? []).map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <p className="font-medium">{plan.name}</p>
                  {plan.popular ? <Badge className="mt-1">محبوب</Badge> : null}
                </TableCell>
                <TableCell>${plan.priceMonthly}</TableCell>
                <TableCell>${plan.priceYearly}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {plan.limits.members} عضو · {plan.limits.storageGb} گیگابایت
                </TableCell>
                <TableCell><Badge variant={plan.status === "active" ? "success" : "secondary"}>{planStatusLabels[plan.status] ?? plan.status}</Badge></TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>ویرایش</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش طرح" : "ایجاد طرح"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>نام</Label><Input defaultValue={editing?.name} placeholder="حرفه‌ای" /></div>
            <div className="space-y-2"><Label>توضیحات</Label><Textarea defaultValue={editing?.description} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>قیمت ماهانه</Label><Input type="number" defaultValue={editing?.priceMonthly} /></div>
              <div className="space-y-2"><Label>قیمت سالانه</Label><Input type="number" defaultValue={editing?.priceYearly} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>لغو</Button>
            <Button onClick={handleSave}>{editing ? "ذخیره" : "ایجاد"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
