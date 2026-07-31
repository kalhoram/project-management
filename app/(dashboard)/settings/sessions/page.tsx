"use client"

import { toast } from "sonner"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSessions } from "@/hooks/queries"
import * as authService from "@/lib/api/auth.service"
import { formatDate } from "@/lib/utils"

export default function SessionsSettingsPage() {
  const sessions = useSessions()

  if (sessions.isLoading) return <PageSkeleton />
  if (sessions.isError) return <ErrorState onRetry={() => sessions.refetch()} />

  async function revokeSession(id: string) {
    await authService.revokeSession(id)
    toast.success("نشست لغو شد")
    sessions.refetch()
  }

  return (
    <SettingsSection title="نشست‌های فعال" description="دستگاه‌هایی که وارد شده‌اید">
      <ul className="divide-y divide-border">
        {(sessions.data ?? []).map((session) => (
          <li key={session.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{session.device}</p>
                {session.current ? <Badge variant="success">فعلی</Badge> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {session.browser} · {session.location} · {session.ip}
              </p>
              <p className="text-xs text-muted-foreground">
                آخرین فعالیت {formatDate(session.lastActiveAt, "MMM d, yyyy h:mm a")}
              </p>
            </div>
            {!session.current ? (
              <Button variant="outline" size="sm" onClick={() => revokeSession(session.id)}>
                لغو
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </SettingsSection>
  )
}
