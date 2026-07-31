"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AuthShell } from "@/components/layout/auth-shell"
import { AuthFormCard } from "@/components/features/auth/auth-form-card"
import { AuthDivider } from "@/components/features/auth/auth-divider"
import { GoogleSignInButton } from "@/components/features/auth/google-sign-in-button"
import { PasswordStrength } from "@/components/features/auth/password-strength"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSignup } from "@/hooks/queries"

const signupSchema = z
  .object({
    name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
    email: z.string().email("یک آدرس ایمیل معتبر وارد کنید"),
    password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, "باید شرایط را بپذیرید"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "رمزهای عبور یکسان نیستند",
    path: ["confirmPassword"],
  })

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const signup = useSignup()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { terms: false },
  })

  const password = watch("password") ?? ""
  const terms = watch("terms")

  async function onSubmit(data: SignupForm) {
    try {
      await signup.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      })
      toast.success("حساب ایجاد شد! لطفاً ایمیل خود را تأیید کنید.")
      router.push("/verify-email?email=" + encodeURIComponent(data.email))
    } catch (err) {
      const message = err instanceof Error ? err.message : "ثبت‌نام ناموفق بود"
      toast.error(message)
    }
  }

  return (
    <AuthShell title="حساب کاربری خود را بسازید" subtitle="مدیریت پروژه‌ها را با تیم خود آغاز کنید">
      <AuthFormCard>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {signup.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {signup.error instanceof Error ? signup.error.message : "ثبت‌نام ناموفق بود"}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">نام کامل</Label>
            <Input id="name" placeholder="علی محمدی" autoComplete="name" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">ایمیل کاری</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              placeholder="رمز عبور بسازید"
              autoComplete="new-password"
              {...register("password")}
            />
            <PasswordStrength password={password} />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأیید رمز عبور</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="رمز عبور را تأیید کنید"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={terms}
              onCheckedChange={(checked) => setValue("terms", checked === true, { shouldValidate: true })}
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug text-muted-foreground">
              با{" "}
              <Link href="/terms" className="text-primary hover:underline">
                شرایط استفاده
              </Link>{" "}
              و{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                سیاست حریم خصوصی
              </Link>{" "}
              موافقم
            </Label>
          </div>
          {errors.terms ? (
            <p className="text-xs text-destructive">{errors.terms.message}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={signup.isPending}>
            {signup.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال ایجاد حساب…
              </>
            ) : (
              "ایجاد حساب"
            )}
          </Button>
        </form>

        <AuthDivider />

        <GoogleSignInButton mode="signup" className="w-full" />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          قبلاً حساب دارید؟{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            ورود
          </Link>
        </p>
      </AuthFormCard>
    </AuthShell>
  )
}
