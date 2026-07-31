"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
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
import { useUpdateWorkspace, useWorkspace } from "@/hooks/queries"
import { COMPANY_SIZES, INDUSTRIES } from "@/lib/constants"
import type { ProjectVisibility } from "@/lib/types"

const visibilityLabels: Record<ProjectVisibility, string> = {
  private: "خصوصی",
  team: "تیمی",
  public: "عمومی",
}

export default function WorkspaceSettingsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const { data: workspace, isLoading, isError, refetch } = useWorkspace(workspaceId)
  const updateWorkspace = useUpdateWorkspace()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [timezone, setTimezone] = useState("")
  const [defaultVisibility, setDefaultVisibility] = useState<ProjectVisibility>("team")
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (workspace && !initialized) {
      setName(workspace.name)
      setDescription(workspace.description ?? "")
      setIndustry(workspace.industry ?? "")
      setCompanySize(workspace.companySize ?? "")
      setTimezone(workspace.timezone)
      setDefaultVisibility(workspace.defaultVisibility)
      setInitialized(true)
    }
  }, [workspace, initialized])

  async function handleSave() {
    try {
      await updateWorkspace.mutateAsync({
        workspaceId,
        data: { name, description, industry, companySize, timezone, defaultVisibility },
      })
      toast.success("تنظیمات فضای کاری ذخیره شد")
    } catch {
      toast.error("ذخیره تنظیمات ناموفق بود")
    }
  }

  if (isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (isError || !workspace) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری تنظیمات فضای کاری ممکن نشد." onRetry={() => refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="تنظیمات فضای کاری"
        description="پیکربندی عمومی فضای کاری"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.name, href: `/workspaces/${workspaceId}` },
          { label: "تنظیمات" },
        ]}
      />

      <div className="space-y-6">
        <SettingsSection title="عمومی" description="اطلاعات پایه فضای کاری">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">نام فضای کاری</Label>
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
              <Label>صنعت</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب صنعت" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اندازه شرکت</Label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب اندازه" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">منطقه زمانی</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>نمایش پیش‌فرض پروژه</Label>
              <Select
                value={defaultVisibility}
                onValueChange={(v) => setDefaultVisibility(v as ProjectVisibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{visibilityLabels.private}</SelectItem>
                  <SelectItem value="team">{visibilityLabels.team}</SelectItem>
                  <SelectItem value="public">{visibilityLabels.public}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateWorkspace.isPending}>
            {updateWorkspace.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </Button>
        </div>
      </div>
    </DashboardShell>
  )
}
