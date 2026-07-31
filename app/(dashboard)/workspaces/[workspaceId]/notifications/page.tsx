"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Bell } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWorkspace } from "@/hooks/queries"

interface NotificationPref {
  id: string
  label: string
  description: string
  email: boolean
  inApp: boolean
}

const defaultPrefs: NotificationPref[] = [
  {
    id: "mentions",
    label: "منشن‌ها",
    description: "وقتی کسی شما را در نظر یا وظیفه منشن کند",
    email: true,
    inApp: true,
  },
  {
    id: "assignments",
    label: "محول‌شدن وظایف",
    description: "وقتی وظیفه‌ای به شما محول شود",
    email: true,
    inApp: true,
  },
  {
    id: "deadlines",
    label: "یادآوری سررسید",
    description: "سررسیدهای پیش‌رو و گذشته وظایف",
    email: true,
    inApp: true,
  },
  {
    id: "status",
    label: "تغییر وضعیت",
    description: "وقتی وضعیت وظایف یا پروژه‌های دنبال‌شده تغییر کند",
    email: false,
    inApp: true,
  },
  {
    id: "comments",
    label: "نظرات",
    description: "نظرات جدید روی وظایف تحت نظارت شما",
    email: false,
    inApp: true,
  },
  {
    id: "weekly",
    label: "خلاصه هفتگی",
    description: "خلاصه فعالیت فضای کاری هر دوشنبه",
    email: true,
    inApp: false,
  },
]

export default function WorkspaceNotificationsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [digestFrequency, setDigestFrequency] = useState("weekly")

  function togglePref(id: string, channel: "email" | "inApp") {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [channel]: !p[channel] } : p))
    )
  }

  function handleSave() {
    toast.success("ترجیحات اعلان ذخیره شد")
  }

  if (workspace.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (workspace.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری فضای کاری ممکن نشد." onRetry={() => workspace.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="اعلان‌ها"
        description="پیکربندی نحوه دریافت به‌روزرسانی‌ها توسط تیم"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "اعلان‌ها" },
        ]}
      />

      <div className="space-y-6">
        <SettingsSection
          title="ترجیحات پیش‌فرض اعلان"
          description="این تنظیمات به‌صورت پیش‌فرض برای همه اعضای فضای کاری اعمال می‌شود"
        >
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_80px] gap-4 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
              <span>نوع اعلان</span>
              <span className="text-center">ایمیل</span>
              <span className="text-center">درون‌برنامه</span>
            </div>
            {prefs.map((pref) => (
              <div
                key={pref.id}
                className="grid grid-cols-[1fr_80px_80px] items-center gap-4 border-b border-border py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.email}
                    onCheckedChange={() => togglePref(pref.id, "email")}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={pref.inApp}
                    onCheckedChange={() => togglePref(pref.id, "inApp")}
                  />
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="بسامد خلاصه" description="دفعات ارسال خلاصه فعالیت">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <Select value={digestFrequency} onValueChange={setDigestFrequency}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">خلاصه روزانه</SelectItem>
                <SelectItem value="weekly">خلاصه هفتگی</SelectItem>
                <SelectItem value="never">هرگز</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <Button onClick={handleSave}>ذخیره ترجیحات</Button>
        </div>
      </div>
    </DashboardShell>
  )
}
