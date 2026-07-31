"use client"

import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import { AuthShell } from "@/components/layout/auth-shell"
import { AuthFormCard } from "@/components/features/auth/auth-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRequestPasswordReset } from "@/hooks/queries"

const forgotSchema = z.object({
  email: z.string().email("یک آدرس ایمیل معتبر وارد کنید"),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const resetRequest = useRequestPasswordReset()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  async function onSubmit(data: ForgotForm) {
    try {
      await resetRequest.mutateAsync(data.email)
      setSubmittedEmail(data.email)
    } catch {
      // Error shown via resetRequest.isError
    }
  }

  if (submittedEmail) {
    return (
      <AuthShell title="ایمیل خود را بررسی کنید" subtitle="دستورالعمل بازنشانی رمز عبور را ارسال کردیم">
        <AuthFormCard>
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              اگر حسابی برای{" "}
              <span className="font-medium text-foreground">{submittedEmail}</span> وجود داشته باشد،
              به زودی لینک بازنشانی دریافت خواهید کرد.
            </p>
            <Button variant="outline" className="mt-6 w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                بازگشت به ورود
              </Link>
            </Button>
          </div>
        </AuthFormCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="بازنشانی رمز عبور" subtitle="لینک بازنشانی را برایتان ایمیل می‌کنیم">
      <AuthFormCard>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {resetRequest.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {resetRequest.error instanceof Error
                  ? resetRequest.error.message
                  : "مشکلی پیش آمد"}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">آدرس ایمیل</Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                className="pl-9"
                {...register("email")}
              />
            </div>
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={resetRequest.isPending}>
            {resetRequest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ارسال لینک…
              </>
            ) : (
              "ارسال لینک بازنشانی"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            بازگشت به ورود
          </Link>
        </p>
      </AuthFormCard>
    </AuthShell>
  )
}
