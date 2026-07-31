"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { PageToolbar } from "@/components/common/page-toolbar"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { ActivityFeed } from "@/components/common/activity-feed"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useActivities } from "@/hooks/queries"
import { Search } from "lucide-react"

export default function ActivityPage() {
  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const activities = useActivities()

  if (activities.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (activities.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => activities.refetch()} />
      </DashboardShell>
    )
  }

  const filtered = (activities.data ?? []).filter((a) => {
    const matchesSearch =
      !search.trim() ||
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.entityName.toLowerCase().includes(search.toLowerCase())
    const matchesEntity = entityFilter === "all" || a.entityType === entityFilter
    return matchesSearch && matchesEntity
  })

  return (
    <DashboardShell>
      <PageHeader
        title="فعالیت"
        description="تغییرات اخیر در فضاهای کاری شما"
        actions={<ExportMenu entityName="فعالیت‌ها" />}
      />
      <PageToolbar
        left={
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی فعالیت…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        }
        right={
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="نوع موجودیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              <SelectItem value="task">وظایف</SelectItem>
              <SelectItem value="project">پروژه‌ها</SelectItem>
              <SelectItem value="file">فایل‌ها</SelectItem>
              <SelectItem value="comment">نظرات</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <div className="rounded-sm border border-border bg-card p-4">
        <ActivityFeed activities={filtered} />
      </div>
    </DashboardShell>
  )
}
