"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { usePlans } from "@/hooks/queries"
import type { PlanInterval } from "@/lib/types"

function SelectPlanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plans = usePlans()
  const initialPlan = searchParams.get("plan") ?? "plan-pro"
  const initialInterval = (searchParams.get("interval") as PlanInterval) ?? "monthly"
  const [selectedPlan, setSelectedPlan] = useState(initialPlan)
  const [interval, setInterval] = useState<PlanInterval>(initialInterval)

  if (plans.isLoading) return <PageSkeleton />
  if (plans.isError) return <ErrorState onRetry={() => plans.refetch()} />

  const plan = (plans.data ?? []).find((p) => p.id === selectedPlan)

  return (
    <>
      <PageHeader title="انتخاب طرح" description="طرح و دوره صورتحساب خود را تأیید کنید" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">انتخاب طرح</CardTitle></CardHeader>
          <CardContent>
            <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan} className="space-y-3">
              {(plans.data ?? []).map((p) => (
                <div key={p.id} className="flex items-center space-x-2 rounded-sm border border-border p-3">
                  <RadioGroupItem value={p.id} id={p.id} />
                  <Label htmlFor={p.id} className="flex-1 cursor-pointer font-normal">
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-muted-foreground">
                      ${interval === "monthly" ? p.priceMonthly : p.priceYearly}/{interval === "monthly" ? "ماه" : "سال"}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">دوره صورتحساب</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={interval} onValueChange={(v) => setInterval(v as PlanInterval)}>
              <div className="flex items-center space-x-2"><RadioGroupItem value="monthly" id="monthly" /><Label htmlFor="monthly">ماهانه</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="yearly" id="yearly" /><Label htmlFor="yearly">سالانه (۱۷٪ تخفیف)</Label></div>
            </RadioGroup>
            {plan ? (
              <div className="rounded-sm bg-muted/50 p-4 text-sm">
                <p className="font-medium">{plan.name}</p>
                <p className="text-muted-foreground">{plan.description}</p>
                <p className="mt-2 text-lg font-semibold">
                  ${interval === "monthly" ? plan.priceMonthly : plan.priceYearly}
                  <span className="text-sm font-normal text-muted-foreground">/{interval === "monthly" ? "ماه" : "سال"}</span>
                </p>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" asChild><Link href="/billing/plans">بازگشت</Link></Button>
              <Button onClick={() => router.push(`/billing/payment?plan=${selectedPlan}&interval=${interval}`)}>
                ادامه به پرداخت
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function SelectPlanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SelectPlanContent />
    </Suspense>
  )
}
