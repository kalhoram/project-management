"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { AuthShell } from "@/components/layout/auth-shell"
import { AuthFormCard } from "@/components/features/auth/auth-form-card"
import { AuthDivider } from "@/components/features/auth/auth-divider"
import { GoogleSignInButton } from "@/components/features/auth/google-sign-in-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { useLogin } from "@/hooks/queries"
import { DEMO_ACCOUNTS, getRoleLabel } from "@/lib/permissions"

const loginSchema = z.object({
  email: z.string().min(1, "نام کاربری یا ایمیل الزامی است"),
  password: z.string().min(1, "رمز عبور الزامی است"),
  remember: z.boolean(),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="خوش آمدید" subtitle="برای ادامه به یادباکس وارد شوید">
          <AuthFormCard>
            <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
          </AuthFormCard>
        </AuthShell>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const login = useLogin()

  function getRedirectPath(): string {
    const raw = searchParams.get("redirect")
    if (!raw) return "/dashboard"
    try {
      const decoded = decodeURIComponent(raw)
      if (decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.startsWith("/login")) {
        return decoded
      }
    } catch {
      // ignore malformed redirect
    }
    return "/dashboard"
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false, email: "", password: "" },
  })

  const remember = watch("remember")
  const [clientReady, setClientReady] = useState(false)

  useEffect(() => {
    setClientReady(true)
  }, [])

  // Browser autofill can populate inputs without firing onChange — sync into RHF state.
  useEffect(() => {
    function syncAutofill() {
      const emailInput = document.getElementById("email") as HTMLInputElement | null
      const passwordInput = document.getElementById("password") as HTMLInputElement | null
      if (emailInput?.value) {
        setValue("email", emailInput.value, { shouldValidate: true })
      }
      if (passwordInput?.value) {
        setValue("password", passwordInput.value, { shouldValidate: true })
      }
    }

    syncAutofill()
    const t1 = window.setTimeout(syncAutofill, 100)
    const t2 = window.setTimeout(syncAutofill, 500)
    window.addEventListener("focus", syncAutofill)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener("focus", syncAutofill)
    }
  }, [setValue])

  async function completeLogin() {
    await refreshUser()
    router.replace(getRedirectPath())
  }

  async function onSubmit(data: LoginForm) {
    try {
      await login.mutateAsync({ email: data.email, password: data.password })
      await completeLogin()
    } catch {
      // Error shown via login.isError
    }
  }

  async function loginAsDemo(email: string, password: string) {
    try {
      await login.mutateAsync({ email, password })
      await completeLogin()
    } catch {
      // Error shown via login.isError
    }
  }

  return (
    <AuthShell title="خوش آمدید" subtitle="برای ادامه به یادباکس وارد شوید">
      <AuthFormCard>
        <form
          data-testid="login-form"
          data-ready={clientReady ? "true" : undefined}
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit(onSubmit)(event)
          }}
          className="space-y-4"
          noValidate
          method="post"
          action="#"
        >
          {login.isError ? (
            <Alert variant="destructive">
              <AlertDescription>نام کاربری یا رمز عبور نامعتبر است. دوباره تلاش کنید.</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">نام کاربری یا ایمیل</Label>
            <Input
              id="email"
              type="text"
              placeholder="admin"
              autoComplete="username"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">رمز عبور</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                فراموشی رمز عبور؟
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="رمز عبور خود را وارد کنید"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) => setValue("remember", checked === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
              مرا به مدت ۳۰ روز به خاطر بسپار
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ورود…
              </>
            ) : (
              "ورود"
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            اکانت‌های دمو — روی هر مورد کلیک کنید
          </p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={login.isPending}
                onClick={() => loginAsDemo(account.email, account.password)}
                className="flex w-full items-start justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-start transition-colors hover:bg-accent disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {account.email} / {account.password}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{account.description}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {getRoleLabel(account.role)}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <AuthDivider />

        <GoogleSignInButton className="w-full" />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          حساب کاربری ندارید؟{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            ثبت‌نام
          </Link>
        </p>
      </AuthFormCard>
    </AuthShell>
  )
}
