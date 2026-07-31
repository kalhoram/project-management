"use client"

import { ServerCrash } from "lucide-react"
import { StatusPage } from "@/components/common/status-page"

export default function ServerErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral">
      <StatusPage
        icon={ServerCrash}
        title="مشکلی پیش آمد"
        description="خطای غیرمنتظره‌ای رخ داد. لطفاً چند دقیقه دیگر دوباره تلاش کنید."
        primaryAction={{ label: "رفتن به داشبورد", href: "/dashboard" }}
        secondaryAction={{ label: "تلاش مجدد", href: "/" }}
      />
    </div>
  )
}
