"use client"

import { toast } from "sonner"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAdminSettings } from "@/hooks/queries"
import { FEATURE_FLAG_LABELS } from "@/lib/constants"

export default function AdminSettingsPage() {
  const settings = useAdminSettings()

  if (settings.isLoading) return <PageSkeleton />
  if (settings.isError || !settings.data) return <ErrorState onRetry={() => settings.refetch()} />

  const s = settings.data

  return (
    <>
      <PageHeader title="تنظیمات مدیریت" description="پیکربندی پلتفرم و پرچم‌های قابلیت" />
      <div className="space-y-4">
        <SettingsSection title="حالت تعمیر و نگهداری" description="غیرفعال کردن دسترسی برای همه کاربران به‌جز مدیران" danger>
          <div className="flex items-center justify-between">
            <Label htmlFor="maintenance">فعال‌سازی حالت تعمیر و نگهداری</Label>
            <Switch id="maintenance" defaultChecked={s.maintenanceMode} />
          </div>
        </SettingsSection>

        <SettingsSection title="پرچم‌های قابلیت" description="فعال یا غیرفعال کردن قابلیت‌های پلتفرم">
          <div className="space-y-3">
            {Object.entries(s.featureFlags).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="font-normal">{FEATURE_FLAG_LABELS[key] ?? key}</Label>
                <Switch id={key} defaultChecked={enabled} />
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="عمومی">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support">ایمیل پشتیبانی</Label>
              <Input id="support" defaultValue={s.supportEmail} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload">حداکثر حجم آپلود (مگابایت)</Label>
              <Input id="upload" type="number" defaultValue={s.maxUploadMb} />
            </div>
            <Button onClick={() => toast.success("تنظیمات ذخیره شد")}>ذخیره تنظیمات</Button>
          </div>
        </SettingsSection>
      </div>
    </>
  )
}
