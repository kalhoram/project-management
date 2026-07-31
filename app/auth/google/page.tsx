"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { AuthShell } from "@/components/layout/auth-shell"
import { AuthFormCard } from "@/components/features/auth/auth-form-card"
import { ErrorState } from "@/components/common/error-state"
import { Button } from "@/components/ui/button"
import { useConnectGoogle } from "@/hooks/queries"

export default function GoogleAuthPage() {
  const router = useRouter()
  const connectGoogle = useConnectGoogle()
  const [attempt, setAttempt] = useState(1)

  useEffect(() => {
    connectGoogle.mutate(attempt, {
      onSuccess: () => {
        router.push("/dashboard")
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  function handleRetry() {
    setAttempt(2)
  }

  if (connectGoogle.isError) {
    return (
      <AuthShell title="ورود با گوگل" subtitle="حساب گوگل خود را متصل کنید">
        <AuthFormCard>
          <ErrorState
            title="اتصال ناموفق بود"
            message={
              connectGoogle.error instanceof Error
                ? connectGoogle.error.message
                : "اتصال حساب گوگل ممکن نشد."
            }
            onRetry={handleRetry}
            className="py-6"
          />
          <div className="mt-4 text-center">
            <Button variant="ghost" asChild>
              <Link href="/login">بازگشت به ورود</Link>
            </Button>
          </div>
        </AuthFormCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="در حال اتصال به گوگل" subtitle="لطفاً تا اتصال حساب صبر کنید">
      <AuthFormCard>
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {connectGoogle.isPending ? "در حال اتصال به گوگل…" : "در حال انتقال…"}
          </p>
        </div>
      </AuthFormCard>
    </AuthShell>
  )
}
