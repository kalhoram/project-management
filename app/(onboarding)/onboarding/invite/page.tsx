"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Copy, Mail, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import { OnboardingShell } from "@/components/features/onboarding/onboarding-shell"
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
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getOnboardingDraft, saveOnboardingDraft } from "@/lib/onboarding-storage"
import type { WorkspaceRole } from "@/lib/types"

interface InviteEntry {
  email: string
  role: WorkspaceRole
}

const ROLE_OPTIONS: { value: WorkspaceRole; label: string }[] = [
  { value: "admin", label: "مدیر" },
  { value: "member", label: "عضو" },
  { value: "guest", label: "مهمان" },
  { value: "viewer", label: "بیننده" },
]

const ROLE_LABELS = Object.fromEntries(
  ROLE_OPTIONS.map((opt) => [opt.value, opt.label])
) as Record<WorkspaceRole, string>

export default function OnboardingInvitePage() {
  const router = useRouter()
  const draft = getOnboardingDraft()
  const [emailInput, setEmailInput] = useState("")
  const [role, setRole] = useState<WorkspaceRole>("member")
  const [invites, setInvites] = useState<InviteEntry[]>(draft.invites ?? [])

  const inviteLink = `https://yadbox.app/join/${draft.workspaceSlug ?? "your-workspace"}`

  function addInvite() {
    const email = emailInput.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("یک آدرس ایمیل معتبر وارد کنید")
      return
    }
    if (invites.some((i) => i.email === email)) {
      toast.error("این ایمیل قبلاً در لیست است")
      return
    }
    setInvites((prev) => [...prev, { email, role }])
    setEmailInput("")
  }

  function removeInvite(email: string) {
    setInvites((prev) => prev.filter((i) => i.email !== email))
  }

  function handleContinue() {
    saveOnboardingDraft({ invites })
    router.push("/onboarding/templates")
  }

  function handleSkip() {
    saveOnboardingDraft({ invites: [] })
    router.push("/onboarding/templates")
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success("لینک دعوت کپی شد")
    } catch {
      toast.error("کپی لینک ممکن نشد")
    }
  }

  return (
    <OnboardingShell
      currentStep={2}
      title="تیم خود را دعوت کنید"
      description="هم‌تیمی‌ها را اضافه کنید یا لینک دعوت را به اشتراک بگذارید"
    >
      <div className="mx-auto w-full max-w-lg space-y-6">
        <Card>
          <CardContent className="space-y-4 p-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">آدرس‌های ایمیل</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    className="pl-9"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addInvite()
                      }
                    }}
                  />
                </div>
                <Select value={role} onValueChange={(val) => setRole(val as WorkspaceRole)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={addInvite}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {invites.length > 0 ? (
              <ul className="divide-y divide-border rounded-sm border border-border">
                {invites.map((invite) => (
                  <li
                    key={invite.email}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm">{invite.email}</span>
                      <Badge variant="default">{ROLE_LABELS[invite.role]}</Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeInvite(invite.email)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-sm border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                هنوز دعوتی نیست — ایمیل‌ها را بالا اضافه کنید یا لینک زیر را کپی کنید
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">لینک دعوت</p>
              <p className="truncate text-xs text-muted-foreground">{inviteLink}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              <Copy className="h-4 w-4" />
              کپی
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/onboarding/workspace")}>
            بازگشت
          </Button>
          <Button type="button" variant="ghost" onClick={handleSkip}>
            رد شدن
          </Button>
          <Button type="button" className="flex-1" onClick={handleContinue}>
            ادامه
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}
