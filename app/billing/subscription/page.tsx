"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { useSubscription } from "@/hooks/queries"
import { useWorkspaceStore } from "@/stores/ui-store"
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/constants"
import type { Plan } from "@/lib/types"
import { formatDate } from "@/lib/utils"

export default function SubscriptionPage() {
  const { currentWorkspaceId } = useWorkspaceStore()
  const subscription = useSubscription(currentWorkspaceId ?? "")
  const [cancelOpen, setCancelOpen] = useState(false)

  if (subscription.isLoading) return <PageSkeleton />
  if (subscription.isError || !subscription.data) {
    return <ErrorState onRetry={() => subscription.refetch()} />
  }

  const sub = subscription.data
  const plan = sub.plan as Plan

  function handleCancel() {
    toast.success("اشتراک لغو شد", { description: "طرح شما تا تاریخ تمدید فعال باقی می‌ماند." })
    setCancelOpen(false)
  }

  return (
    <>
      <PageHeader
        title="اشتراک"
        description="مدیریت طرح فعلی و میزان مصرف"
        actions={
          <Button variant="outline" asChild>
            <Link href="/billing/plans">تغییر طرح</Link>
          </Button>
        }
      />

      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-lg font-semibold">{plan.name}</h5>
                <Badge variant="success">{SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-1 text-sm">تمدید در {formatDate(sub.renewalDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${plan.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/ماه</span></p>
            </div>
          </CardContent>
        </Card>

        <SettingsSection title="مصرف" description="محدودیت‌های طرح فعلی">
          <div className="space-y-4">
            {[
              { label: "اعضا", used: sub.usage.members, limit: plan.limits.members },
              { label: "پروژه‌ها", used: sub.usage.projects, limit: plan.limits.projects },
              { label: "فضای ذخیره (گیگابایت)", used: sub.usage.storageGb, limit: plan.limits.storageGb },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.used}{item.limit > 0 ? ` / ${item.limit}` : " (نامحدود)"}
                  </span>
                </div>
                <Progress value={item.limit > 0 ? (item.used / item.limit) * 100 : 30} />
              </div>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection title="لغو اشتراک" description="پایان اشتراک در تاریخ تمدید" danger>
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>لغو اشتراک</Button>
        </SettingsSection>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="لغو اشتراک؟"
        description="تا پایان دوره صورتحساب دسترسی خود را حفظ می‌کنید. این عمل تا آن زمان قابل بازگشت است."
        confirmLabel="لغو اشتراک"
        variant="destructive"
        onConfirm={handleCancel}
      />
    </>
  )
}
