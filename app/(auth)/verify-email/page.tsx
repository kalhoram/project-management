"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react"
import { toast } from "sonner"
import { AuthShell } from "@/components/layout/auth-shell"
import { AuthFormCard } from "@/components/features/auth/auth-form-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useResendVerificationEmail, useVerifyEmail } from "@/hooks/queries"

type VerifyStatus = "loading" | "success" | "expired" | "pending"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email") ?? "you@company.com"
  const verifyEmail = useVerifyEmail()
  const resend = useResendVerificationEmail()
  const [status, setStatus] = useState<VerifyStatus>(token ? "loading" : "pending")
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!token) return

    verifyEmail.mutate(token, {
      onSuccess: (result) => {
        if (result.expired) {
          setStatus("expired")
        } else if (result.success) {
          setStatus("success")
        } else {
          setStatus("expired")
        }
      },
      onError: () => setStatus("expired"),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleResend() {
    try {
      const result = await resend.mutateAsync(email)
      if (result.emailDispatched) {
        setResent(true)
        const modeHint =
          result.deliveryMode === "console"
            ? " (حالت توسعه: لینک در لاگ سرور بک‌اند ثبت شد)"
            : ""
        toast.success(`ایمیل تأیید ارسال شد${modeHint}`)
      } else {
        toast.message("در صورت وجود حساب، ایمیل تأیید ارسال می‌شود.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ارسال مجدد ایمیل ممکن نشد")
    }
  }

  if (status === "loading" || verifyEmail.isPending) {
    return (
      <AuthShell title="در حال تأیید ایمیل" subtitle="لطفاً چند لحظه صبر کنید">
        <AuthFormCard>
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">در حال تأیید آدرس ایمیل شما…</p>
          </div>
        </AuthFormCard>
      </AuthShell>
    )
  }

  if (status === "success") {
    return (
      <AuthShell title="ایمیل تأیید شد" subtitle="حساب شما آماده استفاده است">
        <AuthFormCard>
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <Badge variant="success" className="mb-3">
              تأیید شده
            </Badge>
            <p className="text-sm text-muted-foreground">
              از تأیید{" "}
              <span className="font-medium text-foreground">{email}</span> متشکریم.
            </p>
            <Button className="mt-6 w-full" asChild>
              <Link href="/onboarding">ادامه راه‌اندازی</Link>
            </Button>
          </div>
        </AuthFormCard>
      </AuthShell>
    )
  }

  if (status === "expired") {
    return (
      <AuthShell title="لینک منقضی شده" subtitle="این لینک تأیید دیگر معتبر نیست">
        <AuthFormCard>
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <Badge variant="destructive" className="mb-3">
              منقضی شده
            </Badge>
            <p className="text-sm text-muted-foreground">
              برای ادامه، ایمیل تأیید جدید درخواست کنید.
            </p>
            <Button
              className="mt-6 w-full"
              onClick={handleResend}
              disabled={resend.isPending || resent}
            >
              {resend.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ارسال…
                </>
              ) : resent ? (
                "ایمیل ارسال شد"
              ) : (
                "ارسال مجدد ایمیل تأیید"
              )}
            </Button>
          </div>
        </AuthFormCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="ایمیل خود را تأیید کنید" subtitle="لینک تأیید را به صندوق ورودی شما ارسال کردیم">
      <AuthFormCard>
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <Badge variant="info" className="mb-3">
            در انتظار
          </Badge>
          <p className="text-sm text-muted-foreground">
            صندوق ورودی{" "}
            <span className="font-medium text-foreground">{email}</span> را بررسی کنید و روی
            لینک کلیک کنید تا حساب خود را تأیید کنید.
          </p>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={handleResend}
            disabled={resend.isPending || resent}
          >
            {resend.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ارسال…
              </>
            ) : resent ? (
              "ایمیل ارسال شد — صندوق ورودی را بررسی کنید"
            ) : (
              "ارسال مجدد ایمیل تأیید"
            )}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" asChild>
            <Link href="/login">بازگشت به ورود</Link>
          </Button>
        </div>
      </AuthFormCard>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
