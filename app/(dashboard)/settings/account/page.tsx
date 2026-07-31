"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrentUser } from "@/hooks/queries"
import * as authService from "@/lib/api/auth.service"

export default function AccountSettingsPage() {
  const user = useCurrentUser()
  const [email, setEmail] = useState("")
  const [timezone, setTimezone] = useState("America/New_York")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user.data) {
      setEmail(user.data.email)
      setTimezone(user.data.timezone ?? "America/New_York")
    }
  }, [user.data])

  if (user.isLoading) return <PageSkeleton />
  if (user.isError) return <ErrorState onRetry={() => user.refetch()} />

  async function handleSave() {
    setSaving(true)
    await authService.updateProfile({ email, timezone })
    toast.success("حساب کاربری به‌روزرسانی شد")
    setSaving(false)
  }

  return (
    <SettingsSection title="حساب کاربری" description="ایمیل و ترجیحات منطقه‌ای">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">آدرس ایمیل</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>منطقه زمانی</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">شرق (آمریکا)</SelectItem>
              <SelectItem value="America/Los_Angeles">غرب (آمریکا)</SelectItem>
              <SelectItem value="Europe/London">لندن</SelectItem>
              <SelectItem value="Asia/Tehran">تهران</SelectItem>
              <SelectItem value="UTC">هماهنگ جهانی (UTC)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره حساب"}</Button>
      </div>
    </SettingsSection>
  )
}
