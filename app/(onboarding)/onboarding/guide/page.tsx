"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Check,
  CheckCircle2,
  FolderPlus,
  ListTodo,
  Rocket,
  UserPlus,
} from "lucide-react"
import { OnboardingShell } from "@/components/features/onboarding/onboarding-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { clearOnboardingDraft, getOnboardingDraft } from "@/lib/onboarding-storage"
import { cn } from "@/lib/utils"

const CHECKLIST = [
  {
    id: "project",
    icon: FolderPlus,
    title: "اولین پروژه خود را بسازید",
    description: "پروژه‌ای از قالب انتخاب‌شده راه‌اندازی کنید",
    href: "/workspaces/ws-1/projects/new",
    cta: "ایجاد پروژه",
  },
  {
    id: "task",
    icon: ListTodo,
    title: "اولین وظیفه را اضافه کنید",
    description: "کار را به وظایف قابل پیگیری تقسیم کنید و مسئول تعیین کنید",
    href: "/workspaces/ws-1/projects/proj-1/tasks/new",
    cta: "افزودن وظیفه",
  },
  {
    id: "invite",
    icon: UserPlus,
    title: "یک هم‌تیمی دعوت کنید",
    description: "همکاری با کل تیم نتیجه بهتری می‌دهد",
    href: "/workspaces/ws-1/members",
    cta: "دعوت اعضا",
  },
]

export default function OnboardingGuidePage() {
  const router = useRouter()
  const draft = getOnboardingDraft()
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  function toggleComplete(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleFinish() {
    clearOnboardingDraft()
    router.push("/dashboard")
  }

  return (
    <OnboardingShell
      currentStep={4}
      title="همه چیز آماده است!"
      description={
        draft.workspaceName
          ? `${draft.workspaceName} آماده است — این گام‌ها را برای شروع تکمیل کنید`
          : "این گام‌ها را برای بهره‌گیری بیشتر از یادباکس انجام دهید"
      }
    >
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-3">
          {CHECKLIST.map((item) => {
            const done = completed.has(item.id)
            return (
              <Card
                key={item.id}
                className={cn("transition-shadow", done && "border-success/50 bg-success/5")}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <button
                    type="button"
                    onClick={() => toggleComplete(item.id)}
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border-2 transition-colors",
                      done
                        ? "border-success bg-success text-success-foreground"
                        : "border-input bg-background"
                    )}
                    aria-label={done ? "علامت‌گذاری به‌عنوان ناقص" : "علامت‌گذاری به‌عنوان تکمیل‌شده"}
                  >
                    {done ? <Check className="h-3 w-3" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-medium">{item.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <Button variant="link" className="mt-1 h-auto p-0" asChild>
                      <Link href={item.href}>{item.cta} →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">آماده شروع هستید؟</p>
              <p className="text-xs text-muted-foreground">
                به داشبورد بروید و مدیریت کار را آغاز کنید.
              </p>
            </div>
            <Button onClick={handleFinish}>
              <Rocket className="h-4 w-4" />
              پایان
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-start">
          <Button type="button" variant="outline" onClick={() => router.push("/onboarding/templates")}>
            بازگشت
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}
