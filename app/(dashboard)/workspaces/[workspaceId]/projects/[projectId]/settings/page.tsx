"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { ProjectTabs } from "@/components/features/projects/project-tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProject, useUpdateProject, useWorkspace } from "@/hooks/queries"
import { PROJECT_STATUS_LABELS, VISIBILITY_LABELS } from "@/lib/constants"
import type { ProjectStatus, ProjectVisibility } from "@/lib/types"

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const updateProject = useUpdateProject()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<ProjectStatus>("active")
  const [visibility, setVisibility] = useState<ProjectVisibility>("team")
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (project.data && !initialized) {
      setName(project.data.name)
      setDescription(project.data.description ?? "")
      setStatus(project.data.status)
      setVisibility(project.data.visibility)
      setInitialized(true)
    }
  }, [project.data, initialized])

  async function handleSave() {
    try {
      await updateProject.mutateAsync({
        projectId,
        data: { name, description, status, visibility },
      })
      toast.success("تنظیمات پروژه ذخیره شد")
    } catch {
      toast.error("ذخیره تنظیمات ناموفق بود")
    }
  }

  async function handleArchive() {
    try {
      await updateProject.mutateAsync({ projectId, data: { status: "archived" } })
      toast.success("پروژه بایگانی شد")
      setArchiveOpen(false)
      router.push(`/workspaces/${workspaceId}/projects/archived`)
    } catch {
      toast.error("بایگانی پروژه ناموفق بود")
    }
  }

  async function handleDelete() {
    try {
      await updateProject.mutateAsync({ projectId, data: { status: "deleted" } })
      toast.success("پروژه به سطل زباله منتقل شد")
      setDeleteOpen(false)
      router.push(`/workspaces/${workspaceId}/projects/deleted`)
    } catch {
      toast.error("حذف پروژه ناموفق بود")
    }
  }

  if (project.isLoading || workspace.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (project.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری پروژه ممکن نشد." onRetry={() => project.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="تنظیمات پروژه"
        description={`پیکربندی ${project.data?.name}`}
        breadcrumbs={[
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          { label: project.data?.name ?? "پروژه", href: `/workspaces/${workspaceId}/projects/${projectId}` },
          { label: "تنظیمات" },
        ]}
      />

      <ProjectTabs workspaceId={workspaceId} projectId={projectId} />

      <div className="space-y-6">
        <SettingsSection title="عمومی" description="تنظیمات پایه پروژه">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">نام پروژه</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">توضیحات</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{PROJECT_STATUS_LABELS.active}</SelectItem>
                  <SelectItem value="on_hold">{PROJECT_STATUS_LABELS.on_hold}</SelectItem>
                  <SelectItem value="completed">{PROJECT_STATUS_LABELS.completed}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>دسترسی</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as ProjectVisibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{VISIBILITY_LABELS.private}</SelectItem>
                  <SelectItem value="team">{VISIBILITY_LABELS.team}</SelectItem>
                  <SelectItem value="public">{VISIBILITY_LABELS.public}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateProject.isPending}>
            ذخیره تغییرات
          </Button>
        </div>

        <SettingsSection
          title="بایگانی پروژه"
          description="این پروژه را از فهرست‌های فعال پنهان کنید. بعداً می‌توانید بازیابی کنید."
          actions={
            <Button variant="outline" onClick={() => setArchiveOpen(true)}>
              بایگانی
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            پروژه‌های بایگانی‌شده از صفحه پروژه‌های بایگانی قابل دسترسی هستند.
          </p>
        </SettingsSection>

        <SettingsSection
          title="حذف پروژه"
          description="این پروژه را به سطل زباله منتقل کنید. پس از ۳۰ روز می‌تواند برای همیشه حذف شود."
          danger
          actions={
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              حذف پروژه
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            همه وظایف و فایل‌ها تا بازیابی یا حذف دائمی پنهان می‌شوند.
          </p>
        </SettingsSection>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="بایگانی پروژه"
        description="این پروژه به فهرست بایگانی منتقل می‌شود."
        confirmLabel="بایگانی"
        loading={updateProject.isPending}
        onConfirm={handleArchive}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف پروژه"
        description="این پروژه به سطل زباله منتقل می‌شود."
        confirmLabel="حذف"
        variant="destructive"
        loading={updateProject.isPending}
        onConfirm={handleDelete}
      />
    </DashboardShell>
  )
}
