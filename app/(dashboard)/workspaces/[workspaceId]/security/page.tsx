"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Key, Lock, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useWorkspace } from "@/hooks/queries"

export default function WorkspaceSecurityPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)

  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [ipAllowlist, setIpAllowlist] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState("8")

  function handleSave() {
    toast.success("تنظیمات امنیتی ذخیره شد")
  }

  if (workspace.isLoading) {
    return (
      <DashboardShell>
        <PageSkeleton />
      </DashboardShell>
    )
  }

  if (workspace.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری فضای کاری ممکن نشد." onRetry={() => workspace.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="امنیت"
        description="احراز هویت و کنترل دسترسی"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "امنیت" },
        ]}
      />

      <div className="space-y-6">
        <SettingsSection
          title="احراز هویت دو مرحله‌ای"
          description="الزام ۲FA برای همه اعضای فضای کاری"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="2fa">الزام ۲FA</Label>
                <p className="text-xs text-muted-foreground">
                  اعضا باید احراز هویت دو مرحله‌ای را فعال کنند
                </p>
              </div>
            </div>
            <Switch
              id="2fa"
              checked={twoFactorRequired}
              onCheckedChange={setTwoFactorRequired}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="ورود یکپارچه (SSO)"
          description="پیکربندی SAML یا OIDC برای ورود سازمانی"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="sso">فعال‌سازی SSO</Label>
                <p className="text-xs text-muted-foreground">
                  امکان ورود اعضا از طریق ارائه‌دهنده هویت سازمان
                </p>
              </div>
            </div>
            <Switch id="sso" checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
          </div>
          {ssoEnabled ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sso-url">آدرس SSO</Label>
                <Input id="sso-url" placeholder="https://idp.company.com/saml" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-id">شناسه موجودیت</Label>
                <Input id="entity-id" placeholder="teamblue-workspace" />
              </div>
            </div>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="نشست و شبکه"
          description="مدت نشست و محدودیت IP"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="ip">لیست مجاز IP</Label>
                  <p className="text-xs text-muted-foreground">
                    محدود کردن دسترسی به محدوده‌های IP تأییدشده
                  </p>
                </div>
              </div>
              <Switch id="ip" checked={ipAllowlist} onCheckedChange={setIpAllowlist} />
            </div>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="timeout">مدت نشست (ساعت)</Label>
              <Input
                id="timeout"
                type="number"
                min={1}
                max={72}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
              />
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <Button onClick={handleSave}>ذخیره تنظیمات امنیتی</Button>
        </div>
      </div>
    </DashboardShell>
  )
}
