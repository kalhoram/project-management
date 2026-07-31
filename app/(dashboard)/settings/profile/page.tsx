"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useCurrentUser } from "@/hooks/queries"
import * as authService from "@/lib/api/auth.service"

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function ProfileSettingsPage() {
  const user = useCurrentUser()
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user.data) {
      setName(user.data.name)
      setBio(user.data.bio ?? "")
      setJobTitle(user.data.jobTitle ?? "")
    }
  }, [user.data])

  if (user.isLoading) return <PageSkeleton />
  if (user.isError) return <ErrorState onRetry={() => user.refetch()} />

  async function handleSave() {
    setSaving(true)
    await authService.updateProfile({ name, bio, jobTitle })
    toast.success("پروفایل به‌روزرسانی شد")
    setSaving(false)
  }

  return (
    <SettingsSection title="پروفایل عمومی" description="نحوه نمایش شما در یادباکس">
      <div className="flex items-center gap-4 pb-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback>{initials((name || user.data?.name) ?? "?")}</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm" onClick={() => toast.info("آپلود آواتار به‌زودی")}>
          تغییر آواتار
        </Button>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">نام نمایشی</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">عنوان شغلی</Label>
          <Input id="title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">بیو</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </div>
        <Button onClick={handleSave} disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره پروفایل"}</Button>
      </div>
    </SettingsSection>
  )
}
