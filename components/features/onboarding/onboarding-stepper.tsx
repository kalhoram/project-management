"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export const ONBOARDING_STEPS = [
  { id: "welcome", label: "خوش‌آمدید", href: "/onboarding" },
  { id: "workspace", label: "فضای کاری", href: "/onboarding/workspace" },
  { id: "invite", label: "دعوت", href: "/onboarding/invite" },
  { id: "templates", label: "قالب", href: "/onboarding/templates" },
  { id: "guide", label: "شروع", href: "/onboarding/guide" },
] as const

interface OnboardingStepperProps {
  currentStep: number
  className?: string
}

export function OnboardingStepper({ currentStep, className }: OnboardingStepperProps) {
  return (
    <nav aria-label="پیشرفت راه‌اندازی" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between gap-2">
        {ONBOARDING_STEPS.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep

          return (
            <li key={step.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={cn(
                      "h-px flex-1",
                      isComplete || isCurrent ? "bg-primary" : "bg-border"
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 text-xs font-medium transition-colors",
                    isComplete && "border-primary bg-primary text-primary-foreground",
                    isCurrent && !isComplete && "border-primary bg-primary/10 text-primary",
                    !isComplete && !isCurrent && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < ONBOARDING_STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "h-px flex-1",
                      isComplete ? "bg-primary" : "bg-border"
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-center text-[11px] font-medium uppercase tracking-[0.08em] sm:block",
                  isCurrent ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
