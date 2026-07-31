"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { PRIORITY_LABELS } from "@/lib/constants"

export default function RequestFormPage() {
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 600))
    toast.success("درخواست ارسال شد", { description: "درخواست شما برای تأیید ارسال شد." })
    setSubmitting(false)
  }

  return (
    <DashboardShell>
      <PageHeader
        title="فرم درخواست"
        description="ارسال درخواست‌های فضای کاری برای بررسی"
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <SettingsSection title="جزئیات درخواست" description="نیاز خود را شرح دهید">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>نوع درخواست</Label>
                  <Select defaultValue="access">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="access">درخواست دسترسی</SelectItem>
                      <SelectItem value="resource">تخصیص منابع</SelectItem>
                      <SelectItem value="budget">تأیید بودجه</SelectItem>
                      <SelectItem value="change">درخواست تغییر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان</Label>
                  <Input id="title" placeholder="خلاصه کوتاه" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="details">جزئیات</Label>
                  <Textarea id="details" placeholder="زمینه و توجیه را بنویسید" rows={4} required />
                </div>
                <div className="space-y-2">
                  <Label>اولویت</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{PRIORITY_LABELS.low}</SelectItem>
                      <SelectItem value="medium">{PRIORITY_LABELS.medium}</SelectItem>
                      <SelectItem value="high">{PRIORITY_LABELS.high}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingsSection>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "در حال ارسال…" : "ارسال درخواست"}
              </Button>
              <Button type="button" variant="outline" onClick={() => toast.info("پیش‌نویس ذخیره شد")}>
                ذخیره پیش‌نویس
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
