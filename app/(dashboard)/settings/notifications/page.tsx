"use client"

import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"

const preferences = [
  { id: "assignments", label: "تخصیص وظایف", description: "وقتی به یک وظیفه اختصاص داده می‌شوید" },
  { id: "mentions", label: "منشن‌ها", description: "وقتی کسی شما را @منشن می‌کند" },
  { id: "comments", label: "نظرات", description: "پاسخ‌ها روی وظایفی که دنبال می‌کنید" },
  { id: "deadlines", label: "مهلت‌ها", description: "یادآوری قبل از سررسید" },
  { id: "status", label: "تغییر وضعیت", description: "وقتی وضعیت وظیفه به‌روز می‌شود" },
  { id: "weekly", label: "خلاصه هفتگی", description: "خلاصه هفته شما هر دوشنبه" },
]

export default function NotificationSettingsPage() {
  return (
    <SettingsSection title="اعلان‌های ایمیل" description="انتخاب موارد دریافتی از طریق ایمیل">
      <div className="space-y-4">
        {preferences.map((pref) => (
          <div key={pref.id} className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor={pref.id} className="font-medium">{pref.label}</Label>
              <p className="text-sm text-muted-foreground">{pref.description}</p>
            </div>
            <Switch id={pref.id} defaultChecked={pref.id !== "weekly"} />
          </div>
        ))}
        <Button onClick={() => toast.success("ترجیحات اعلان ذخیره شد")}>ذخیره ترجیحات</Button>
      </div>
    </SettingsSection>
  )
}
