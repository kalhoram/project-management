"use client"

import { useState } from "react"
import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConnectGoogle } from "@/hooks/queries"

export default function GoogleSettingsPage() {
  const connectGoogle = useConnectGoogle()
  const [connected, setConnected] = useState(false)
  const [attempt, setAttempt] = useState(1)

  async function handleConnect() {
    try {
      await connectGoogle.mutateAsync(attempt)
      setConnected(true)
      toast.success("حساب گوگل متصل شد")
    } catch {
      setAttempt(2)
      toast.error("اتصال ناموفق بود. دوباره تلاش کنید.")
    }
  }

  function handleDisconnect() {
    setConnected(false)
    setAttempt(1)
    toast.success("حساب گوگل قطع شد")
  }

  return (
    <SettingsSection title="اتصال گوگل" description="ورود و همگام‌سازی با گوگل">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">وضعیت:</span>
          <Badge variant={connected ? "success" : "secondary"}>
            {connected ? "متصل" : "متصل نیست"}
          </Badge>
        </div>

        {connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              حساب گوگل شما متصل است. می‌توانید با گوگل وارد شوید و رویدادهای تقویم را وارد کنید.
            </p>
            <Button variant="outline" onClick={handleDisconnect}>قطع اتصال گوگل</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              حساب گوگل خود را برای ورود یکپارچه و یکپارچه‌سازی تقویم متصل کنید.
            </p>
            <Button variant="outline" onClick={handleConnect} disabled={connectGoogle.isPending}>
              {connectGoogle.isPending ? "در حال اتصال…" : "اتصال حساب گوگل"}
            </Button>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}
