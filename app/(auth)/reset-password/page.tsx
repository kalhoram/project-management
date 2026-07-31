"use client"

import Link from "next/link"
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { AuthShell } from "@/components/layout/auth-shell"
import { AuthFormCard } from "@/components/features/auth/auth-form-card"
import { PasswordRules, meetsPasswordRules } from "@/components/features/auth/password-rules"
import { PasswordStrength } from "@/components/features/auth/password-strength"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useResetPassword } from "@/hooks/queries"

const resetSchema = z
  .object({
    password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "رمزهای عبور یکسان نیستند",
    path: ["confirmPassword"],
  })
  .refine((data) => meetsPasswordRules(data.password), {
    message: "رمز عبور همه الزامات را برآورده نمی‌کند",
    path: ["password"],
  })

type ResetForm = z.infer<typeof resetSchema>

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? "demo-token"
  const [success, setSuccess] = useState(false)
  const resetPassword = useResetPassword()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const password = watch("password") ?? ""

  async function onSubmit(data: ResetForm) {
    try {
      await resetPassword.mutateAsync({ token, password: data.password })
      setSuccess(true)
    } catch {
      // Error shown via resetPassword.isError
    }
  }

  if (success) {
    return (
      <AuthShell title="رمز عبور به‌روزرسانی شد" subtitle="رمز عبور شما با موفقیت بازنشانی شد">
        <AuthFormCard>
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-muted-foreground">
              اکنون می‌توانید با رمز عبور جدید وارد شوید.
            </p>
            <Button className="mt-6 w-full" asChild>
              <Link href="/login">ادامه به ورود</Link>
            </Button>
          </div>
        </AuthFormCard>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="رمز عبور جدید تنظیم کنید" subtitle="یک رمز عبور قوی برای حساب خود انتخاب کنید">
      <AuthFormCard>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {resetPassword.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {resetPassword.error instanceof Error
                  ? resetPassword.error.message
                  : "بازنشانی رمز عبور ممکن نشد"}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور جدید</Label>
            <Input
              id="password"
              type="password"
              placeholder="رمز عبور جدید را وارد کنید"
              autoComplete="new-password"
              {...register("password")}
            />
            <PasswordStrength password={password} />
            <PasswordRules password={password} />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأیید رمز عبور</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="رمز عبور جدید را تأیید کنید"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
            {resetPassword.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال به‌روزرسانی رمز عبور…
              </>
            ) : (
              "بازنشانی رمز عبور"
            )}
          </Button>
        </form>
      </AuthFormCard>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
