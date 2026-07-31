"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Bug,
  Columns3,
  FilePlus,
  Map,
  Megaphone,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OnboardingShell } from "@/components/features/onboarding/onboarding-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PROJECT_TEMPLATES } from "@/lib/constants"
import { getOnboardingDraft, saveOnboardingDraft } from "@/lib/onboarding-storage"

const ICON_MAP: Record<string, LucideIcon> = {
  Columns3,
  RefreshCw,
  Megaphone,
  Map,
  Bug,
  FilePlus,
}

export default function OnboardingTemplatesPage() {
  const router = useRouter()
  const draft = getOnboardingDraft()
  const [selected, setSelected] = useState<string | null>(draft.templateId ?? null)

  function handleContinue() {
    if (selected) {
      saveOnboardingDraft({ templateId: selected })
    }
    router.push("/onboarding/guide")
  }

  return (
    <OnboardingShell
      currentStep={3}
      title="یک قالب انتخاب کنید"
      description="از ساختار آماده شروع کنید یا با پروژه خالی آغاز کنید"
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {PROJECT_TEMPLATES.map((template) => {
            const Icon = ICON_MAP[template.icon] ?? FilePlus
            const isSelected = selected === template.id

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelected(template.id)}
                className="text-left"
              >
                <Card
                  className={cn(
                    "h-full transition-all hover:shadow-level-1",
                    isSelected && "border-primary ring-2 ring-primary/20"
                  )}
                >
                  <CardContent className="flex gap-3 p-4">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">{template.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/onboarding/invite")}>
            بازگشت
          </Button>
          <Button type="button" className="flex-1" onClick={handleContinue} disabled={!selected}>
            ادامه
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}
