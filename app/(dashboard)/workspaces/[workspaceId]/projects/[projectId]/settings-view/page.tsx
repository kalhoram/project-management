"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { StatusBadge } from "@/components/common/status-badge"
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
import { Switch } from "@/components/ui/switch"
import { useProject, useUpdateProject, useWorkspace } from "@/hooks/queries"
import { PROJECT_STATUS_LABELS, VISIBILITY_LABELS } from "@/lib/constants"
import type { ProjectStatus, ProjectVisibility } from "@/lib/types"

export default function ProjectSettingsViewPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const updateProject = useUpdateProject()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<ProjectStatus>("active")
  const [visibility, setVisibility] = useState<ProjectVisibility>("team")
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

  if (workspace.isLoading || project.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (project.isError || !project.data) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => project.refetch()} />
      </DashboardShell>
    )
  }

  async function handleSave() {
    await updateProject.mutateAsync({
      projectId,
      data: { name, description, status, visibility },
    })
    toast.success("تنظیمات پروژه ذخیره شد")
  }

  return (
    <DashboardShell>
      <PageHeader
        title={project.data.name}
        description="پیکربندی پروژه"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: project.data.key, href: `/workspaces/${workspaceId}/projects/${projectId}` },
          { label: "تنظیمات" },
        ]}
      />
      <ProjectTabs workspaceId={workspaceId} projectId={projectId} />

      <div className="space-y-4">
        <SettingsSection title="عمومی" description="اطلاعات پایه پروژه">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">نام پروژه</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">توضیحات</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>وضعیت</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{PROJECT_STATUS_LABELS.active}</SelectItem>
                    <SelectItem value="on_hold">{PROJECT_STATUS_LABELS.on_hold}</SelectItem>
                    <SelectItem value="completed">{PROJECT_STATUS_LABELS.completed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>دسترسی</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as ProjectVisibility)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">{VISIBILITY_LABELS.private}</SelectItem>
                    <SelectItem value="team">{VISIBILITY_LABELS.team}</SelectItem>
                    <SelectItem value="public">{VISIBILITY_LABELS.public}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <StatusBadge status={visibility} />
            </div>
            <Button onClick={handleSave} disabled={updateProject.isPending}>
              {updateProject.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="اعلان‌ها" description="ترجیحات اعلان در سطح پروژه">
          <div className="space-y-3">
            {["تخصیص وظایف", "تغییر وضعیت", "نظرات جدید", "یادآوری مهلت"].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <Label className="font-normal">{item}</Label>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="منطقه خطر" description="اقدامات غیرقابل بازگشت پروژه" danger>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => toast.info("بایگانی به‌زودی")}>بایگانی پروژه</Button>
            <Button variant="destructive" onClick={() => toast.error("حذف نیاز به تأیید دارد")}>
              حذف پروژه
            </Button>
          </div>
        </SettingsSection>
      </div>
    </DashboardShell>
  )
}
