"use client"

import { Wrench } from "lucide-react"
import { StatusPage } from "@/components/common/status-page"

export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral">
      <StatusPage
        icon={Wrench}
        title="در حال نگهداری"
        description="یادباکس به‌طور موقت در دسترس نیست. به‌زودی برمی‌گردیم."
        primaryAction={{ label: "بررسی وضعیت", href: "/dashboard" }}
      />
    </div>
  )
}
