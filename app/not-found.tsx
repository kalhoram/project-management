"use client"

import { FileQuestion } from "lucide-react"
import { StatusPage } from "@/components/common/status-page"

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral">
      <StatusPage
        icon={FileQuestion}
        title="صفحه پیدا نشد"
        description="صفحه‌ای که دنبال آن هستید وجود ندارد یا ممکن است جابه‌جا شده باشد."
        primaryAction={{ label: "رفتن به داشبورد", href: "/dashboard" }}
        secondaryAction={{ label: "مشاهده فضاهای کاری", href: "/workspaces" }}
      />
    </div>
  )
}
