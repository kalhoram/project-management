"use client"

import { useState } from "react"
import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import * as authService from "@/lib/api/auth.service"

export default function PasswordSettingsPage() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      toast.error("رمزهای عبور یکسان نیستند")
      return
    }
    if (next.length < 8) {
      toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد")
      return
    }
    setSaving(true)
    await authService.changePassword(current, next)
    toast.success("رمز عبور به‌روزرسانی شد")
    setCurrent("")
    setNext("")
    setConfirm("")
    setSaving(false)
  }

  return (
    <SettingsSection title="رمز عبور" description="به‌روزرسانی رمز عبور حساب کاربری">
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">رمز عبور فعلی</Label>
          <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new">رمز عبور جدید</Label>
          <Input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">تأیید رمز عبور جدید</Label>
          <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <Button type="submit" disabled={saving}>{saving ? "در حال به‌روزرسانی…" : "به‌روزرسانی رمز عبور"}</Button>
      </form>
    </SettingsSection>
  )
}
