"use client"

import { Lock } from "lucide-react"
import { StatusPage } from "@/components/common/status-page"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral">
      <StatusPage
        icon={Lock}
        title="ورود لازم است"
        description="برای دسترسی به این صفحه باید وارد حساب کاربری خود شوید."
        primaryAction={{ label: "ورود", href: "/login" }}
        secondaryAction={{ label: "ایجاد حساب", href: "/signup" }}
      />
    </div>
  )
}
