"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Archive, Grid3X3, LayoutList, Plus, Search, Trash2 } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { PageToolbar } from "@/components/common/page-toolbar"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { CardGridSkeleton } from "@/components/common/loading-skeleton"
import { ExportMenu } from "@/components/common/export-menu"
import { ProjectCard } from "@/components/features/projects/project-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useProjectCategories,
  useProjects,
  useWorkspace,
} from "@/hooks/queries"
import { PROJECT_STATUS_LABELS } from "@/lib/constants"
import type { ProjectStatus, ProjectVisibility } from "@/lib/types"
import { cn } from "@/lib/utils"

type ViewMode = "grid" | "list"

const visibilityLabels: Record<ProjectVisibility, string> = {
  private: "خصوصی",
  team: "تیمی",
  public: "عمومی",
}

export default function ProjectsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const projects = useProjects(workspaceId)
  const categories = useProjectCategories(workspaceId)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [visibilityFilter, setVisibilityFilter] = useState<ProjectVisibility | "all">("all")
  const [view, setView] = useState<ViewMode>("grid")

  const filtered = useMemo(() => {
    let list = projects.data ?? []
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter)
    if (categoryFilter !== "all") list = list.filter((p) => p.categoryId === categoryFilter)
    if (visibilityFilter !== "all") list = list.filter((p) => p.visibility === visibilityFilter)
    return list
  }, [projects.data, search, statusFilter, categoryFilter, visibilityFilter])

  return (
    <DashboardShell>
      <PageHeader
        title="پروژه‌ها"
        description="همه پروژه‌های این فضای کاری"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "پروژه‌ها" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/projects/archived`}>
                <Archive className="h-4 w-4" />
                بایگانی‌شده
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/projects/deleted`}>
                <Trash2 className="h-4 w-4" />
                حذف‌شده
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/workspaces/${workspaceId}/projects/new`}>
                <Plus className="h-4 w-4" />
                پروژه جدید
              </Link>
            </Button>
          </div>
        }
      />

      <PageToolbar
        left={
          <>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجوی پروژه‌ها…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">{PROJECT_STATUS_LABELS.active}</SelectItem>
                <SelectItem value="on_hold">{PROJECT_STATUS_LABELS.on_hold}</SelectItem>
                <SelectItem value="completed">{PROJECT_STATUS_LABELS.completed}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دسته‌ها</SelectItem>
                {(categories.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={visibilityFilter}
              onValueChange={(v) => setVisibilityFilter(v as ProjectVisibility | "all")}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="نمایش" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه سطوح نمایش</SelectItem>
                <SelectItem value="private">{visibilityLabels.private}</SelectItem>
                <SelectItem value="team">{visibilityLabels.team}</SelectItem>
                <SelectItem value="public">{visibilityLabels.public}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        right={
          <>
            <ExportMenu entityName="فهرست پروژه‌ها" />
            <div className="flex rounded-sm border border-border">
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("grid")}
                aria-label="نمای شبکه‌ای"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setView("list")}
                aria-label="نمای فهرستی"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </>
        }
      />

      {projects.isLoading ? <CardGridSkeleton count={6} /> : null}

      {projects.isError ? (
        <ErrorState message="بارگذاری پروژه‌ها ممکن نشد." onRetry={() => projects.refetch()} />
      ) : null}

      {!projects.isLoading && !projects.isError && filtered.length === 0 ? (
        <EmptyState
          title={search ? "پروژه‌ای یافت نشد" : "هنوز پروژه‌ای ندارید"}
          description={
            search
              ? "جستجو یا فیلترها را تغییر دهید."
              : "اولین پروژه را بسازید تا کار را پیگیری کنید."
          }
          actionLabel="ایجاد پروژه"
          onAction={() => router.push(`/workspaces/${workspaceId}/projects/new`)}
        />
      ) : null}

      {!projects.isLoading && !projects.isError && filtered.length > 0 ? (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-2"
          )}
        >
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceId={workspaceId}
              view={view}
            />
          ))}
        </div>
      ) : null}
    </DashboardShell>
  )
}
