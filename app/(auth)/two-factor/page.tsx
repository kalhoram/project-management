"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { AuthShell } from "@/components/layout/auth-shell"
import { AuthFormCard } from "@/components/features/auth/auth-form-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useVerifyTwoFactor } from "@/hooks/queries"

export default function TwoFactorPage() {
  const router = useRouter()
  const verify = useVerifyTwoFactor()
  const [code, setCode] = useState("")
  const [useRecovery, setUseRecovery] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState("")

  async function handleVerifyOtp() {
    try {
      await verify.mutateAsync(code)
      router.push("/dashboard")
    } catch {
      // Error shown via verify.isError
    }
  }

  async function handleVerifyRecovery() {
    try {
      await verify.mutateAsync(recoveryCode)
      router.push("/dashboard")
    } catch {
      // Error shown via verify.isError
    }
  }

  return (
    <AuthShell title="احراز هویت دو مرحله‌ای" subtitle="کد اپلیکیشن احراز هویت را وارد کنید">
      <AuthFormCard>
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>

        {verify.isError ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {verify.error instanceof Error
                ? verify.error.message
                : "کد تأیید نامعتبر است. دوباره تلاش کنید."}
            </AlertDescription>
          </Alert>
        ) : null}

        {!useRecovery ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-center block">کد ۶ رقمی</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={code.length < 6 || verify.isPending}
              onClick={handleVerifyOtp}
            >
              {verify.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال تأیید…
                </>
              ) : (
                "تأیید"
              )}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-primary hover:underline"
              onClick={() => setUseRecovery(true)}
            >
              استفاده از کد بازیابی
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery">کد بازیابی</Label>
              <Input
                id="recovery"
                placeholder="کد بازیابی خود را وارد کنید"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                کدهای بازیابی کدهای پشتیبان یک‌بارمصرف از تنظیمات حساب شما هستند.
              </p>
            </div>

            <Button
              className="w-full"
              disabled={recoveryCode.length < 6 || verify.isPending}
              onClick={handleVerifyRecovery}
            >
              {verify.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال تأیید…
                </>
              ) : (
                "تأیید کد بازیابی"
              )}
            </Button>

            <button
              type="button"
              className="w-full text-center text-sm text-primary hover:underline"
              onClick={() => setUseRecovery(false)}
            >
              بازگشت به کد احراز هویت
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            بازگشت به ورود
          </Link>
        </p>
      </AuthFormCard>
    </AuthShell>
  )
}
