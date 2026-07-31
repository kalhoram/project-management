import Link from "next/link"
import { APP_NAME_FULL } from "@/lib/constants"
import { OnboardingStepper } from "./onboarding-stepper"

interface OnboardingShellProps {
  currentStep: number
  title: string
  description?: string
  children: React.ReactNode
}

export function OnboardingShell({
  currentStep,
  title,
  description,
  children,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-neutral dark:bg-background">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10">
        <header className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-semibold text-primary-foreground">
              YB
            </div>
            <span className="text-xl font-semibold tracking-[-0.02em]">{APP_NAME_FULL}</span>
          </Link>
        </header>

        <div className="mb-8">
          <OnboardingStepper currentStep={currentStep} />
        </div>

        <div className="flex flex-1 flex-col">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
            {description ? (
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  )
}
