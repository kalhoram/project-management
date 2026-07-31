"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { useLogin } from "@/hooks/queries"
import { DEMO_ACCOUNTS, getRoleLabel } from "@/lib/permissions"

const loginSchema = z.object({
  email: z.string().email("یک آدرس ایمیل معتبر وارد کنید"),
  password: z.string().min(1, "رمز عبور الزامی است"),
  remember: z.boolean(),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const login = useLogin()

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

  async function onSubmit(data: LoginForm) {
    try {
      await login.mutateAsync({ email: data.email, password: data.password })
      router.push("/dashboard")
    } catch {
      // Error shown via login.isError
    }
  }

  async function loginAsDemo(email: string) {
    setValue("email", email)
    setValue("password", "demo")
    try {
      await login.mutateAsync({ email, password: "demo" })
      router.push("/dashboard")
    } catch {
      // Error shown via login.isError
    }
  }

  return (
    <AuthShell title="خوش آمدید" subtitle="برای ادامه به یادباکس وارد شوید">
      <AuthFormCard>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {login.isError ? (
            <Alert variant="destructive">
              <AlertDescription>ایمیل یا رمز عبور نامعتبر است. دوباره تلاش کنید.</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              placeholder="owner@yadbox.app"
              autoComplete="email"
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
            اکانت‌های دمو — رمز همه: <span className="font-mono text-foreground">demo</span>
          </p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={login.isPending}
                onClick={() => loginAsDemo(account.email)}
                className="flex w-full items-start justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-start transition-colors hover:bg-accent disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {account.email}
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
