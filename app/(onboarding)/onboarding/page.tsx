"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, LayoutGrid, Users, Zap } from "lucide-react"
import { OnboardingShell } from "@/components/features/onboarding/onboarding-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const HIGHLIGHTS = [
  {
    icon: LayoutGrid,
    title: "کار را به سبک خود سازماندهی کنید",
    description: "بردهای کانبان، لیست‌ها، خط زمانی و بیشتر — نمای مناسب تیم خود را انتخاب کنید.",
  },
  {
    icon: Users,
    title: "همکاری در لحظه",
    description: "هم‌تیمی‌ها را دعوت کنید، وظایف را محول کنید و همه را روی اولویت‌ها همسو نگه دارید.",
  },
  {
    icon: Zap,
    title: "تحویل سریع‌تر",
    description: "قالب‌ها و گردش‌کارها از ایده تا تحویل بدون دردسر راه‌اندازی کمک می‌کنند.",
  },
]

export default function OnboardingWelcomePage() {
  const router = useRouter()

  return (
    <OnboardingShell
      currentStep={0}
      title="به یادباکس خوش آمدید"
      description="فضای کاری خود را در چند گام سریع راه‌اندازی کنیم"
    >
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-3">
          {HIGHLIGHTS.map((item) => (
            <Card key={item.title} className="transition-shadow hover:shadow-level-1">
              <CardContent className="flex gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button className="w-full" onClick={() => router.push("/onboarding/workspace")}>
            ادامه
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/dashboard">فعلاً رد شدن</Link>
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}
