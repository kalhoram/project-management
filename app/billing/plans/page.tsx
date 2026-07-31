"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { PageHeader } from "@/components/common/page-header"
import { ErrorState } from "@/components/common/error-state"
import { CardGridSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { usePlans } from "@/hooks/queries"
import type { PlanInterval } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function BillingPlansPage() {
  const plans = usePlans()
  const [interval, setInterval] = useState<PlanInterval>("monthly")

  if (plans.isLoading) return <CardGridSkeleton count={4} />
  if (plans.isError) return <ErrorState onRetry={() => plans.refetch()} />

  return (
    <>
      <PageHeader
        title="طرح‌ها"
        description="طرح‌های یادباکس را مقایسه کنید و مناسب تیم خود را انتخاب کنید"
      />

      <div className="mb-6 flex items-center justify-center gap-3">
        <Label htmlFor="interval" className={cn(interval === "monthly" && "font-semibold text-foreground")}>
          ماهانه
        </Label>
        <Switch
          id="interval"
          checked={interval === "yearly"}
          onCheckedChange={(v) => setInterval(v ? "yearly" : "monthly")}
        />
        <Label htmlFor="interval" className={cn(interval === "yearly" && "font-semibold text-foreground")}>
          سالانه
          <Badge variant="success" className="ml-2">۱۷٪ تخفیف</Badge>
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(plans.data ?? []).map((plan) => (
          <Card
            key={plan.id}
            className={cn(plan.popular && "border-primary ring-1 ring-primary/20")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {plan.popular ? <Badge>محبوب</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-3xl font-bold">
                  ${interval === "monthly" ? plan.priceMonthly : Math.round(plan.priceYearly / 12)}
                </span>
                <span className="text-muted-foreground">/ماه</span>
                {interval === "yearly" && plan.priceYearly > 0 ? (
                  <p className="text-xs text-muted-foreground">${plan.priceYearly}/سال (پرداخت سالانه)</p>
                ) : null}
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                <Link href={`/billing/select-plan?plan=${plan.id}&interval=${interval}`}>
                  {plan.priceMonthly === 0 ? "شروع کنید" : "انتخاب طرح"}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}
