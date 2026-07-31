"use client"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { SettingsNav } from "@/components/layout/settings-nav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <PageHeader title="تنظیمات" description="مدیریت حساب کاربری و ترجیحات" />
      <div className="flex flex-col gap-6 md:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </DashboardShell>
  )
}
