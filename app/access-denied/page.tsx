"use client"

import { ShieldX } from "lucide-react"
import { StatusPage } from "@/components/common/status-page"

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral">
      <StatusPage
        icon={ShieldX}
        title="دسترسی مجاز نیست"
        description="شما اجازه مشاهده این منبع را ندارید. در صورت نیاز با مدیر فضای کاری تماس بگیرید."
        primaryAction={{ label: "رفتن به داشبورد", href: "/dashboard" }}
        secondaryAction={{ label: "تماس با پشتیبانی", href: "/settings/profile" }}
      />
    </div>
  )
}
