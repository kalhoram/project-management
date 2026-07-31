"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CreditCard, Lock } from "lucide-react"
import { PageHeader } from "@/components/common/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageSkeleton } from "@/components/common/loading-skeleton"

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get("plan") ?? "plan-pro"
  const interval = searchParams.get("interval") ?? "monthly"
  const [processing, setProcessing] = useState(false)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 1200))
    router.push(`/billing/result?status=success&plan=${planId}`)
  }

  return (
    <>
      <PageHeader title="پرداخت" description="اطلاعات پرداخت را به‌صورت امن وارد کنید" />
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              روش پرداخت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePay} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">نام روی کارت</Label>
                <Input id="name" placeholder="علی محمدی" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="card">شماره کارت</Label>
                <Input id="card" placeholder="4242 4242 4242 4242" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exp">تاریخ انقضا</Label>
                  <Input id="exp" placeholder="۰۱/۲۶" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">کد امنیتی</Label>
                  <Input id="cvc" placeholder="123" required />
                </div>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                پرداخت‌ها رمزنگاری شده و امن هستند
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" type="button" asChild>
                  <Link href={`/billing/select-plan?plan=${planId}&interval=${interval}`}>بازگشت</Link>
                </Button>
                <Button type="submit" className="flex-1" disabled={processing}>
                  {processing ? "در حال پردازش…" : "پرداخت"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentContent />
    </Suspense>
  )
}
