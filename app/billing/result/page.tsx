"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/common/page-header"
import { StatusPage } from "@/components/common/status-page"
import { PageSkeleton } from "@/components/common/loading-skeleton"

function ResultContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get("status") ?? "success"
  const plan = searchParams.get("plan") ?? "plan-pro"

  if (status === "failed") {
    return (
      <>
        <PageHeader title="پرداخت ناموفق" />
        <StatusPage
          icon={XCircle}
          title="پرداخت انجام نشد"
          description="کارت شما رد شد. لطفاً روش پرداخت دیگری امتحان کنید یا با بانک خود تماس بگیرید."
          primaryAction={{ label: "تلاش مجدد", href: `/billing/payment?plan=${plan}` }}
          secondaryAction={{ label: "مشاهده طرح‌ها", href: "/billing/plans" }}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader title="پرداخت موفق" />
      <StatusPage
        icon={CheckCircle2}
        title="همه چیز آماده است!"
        description="اشتراک شما فعال شد. می‌توانید هر زمان از حساب خود صورتحساب را مدیریت کنید."
        primaryAction={{ label: "مشاهده اشتراک", href: "/billing/subscription" }}
        secondaryAction={{ label: "رفتن به داشبورد", href: "/dashboard" }}
      />
    </>
  )
}

export default function BillingResultPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResultContent />
    </Suspense>
  )
}
