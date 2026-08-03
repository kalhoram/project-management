"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, Building2, ImagePlus } from "lucide-react"
import { OnboardingShell } from "@/components/features/onboarding/onboarding-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { COMPANY_SIZES, INDUSTRIES } from "@/lib/constants"
import { getOnboardingDraft, saveOnboardingDraft, slugify } from "@/lib/onboarding-storage"

const workspaceSchema = z.object({
  workspaceName: z.string().min(2, "نام فضای کاری الزامی است"),
  workspaceSlug: z
    .string()
    .min(2, "نامک الزامی است")
    .regex(/^[a-z0-9-]+$/, "فقط حروف کوچک انگلیسی، اعداد و خط تیره مجاز است"),
  companySize: z.string().min(1, "اندازه شرکت را انتخاب کنید"),
  industry: z.string().min(1, "صنعت را انتخاب کنید"),
})

type WorkspaceForm = z.infer<typeof workspaceSchema>

export default function OnboardingWorkspacePage() {
  const router = useRouter()
  const draft = getOnboardingDraft()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkspaceForm>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      workspaceName: draft.workspaceName ?? "",
      workspaceSlug: draft.workspaceSlug ?? "",
      companySize: draft.companySize ?? "",
      industry: draft.industry ?? "",
    },
  })

  const workspaceName = watch("workspaceName")

  useEffect(() => {
    if (workspaceName && !draft.workspaceSlug) {
      setValue("workspaceSlug", slugify(workspaceName), { shouldValidate: true })
    }
  }, [workspaceName, draft.workspaceSlug, setValue])

  function onSubmit(data: WorkspaceForm) {
    saveOnboardingDraft(data)
    router.push("/onboarding/invite")
  }

  return (
    <OnboardingShell
      currentStep={1}
      title="فضای کاری خود را بسازید"
      description="اینجا جایی است که تیم شما همکاری می‌کند"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-lg space-y-6">
        <Card>
          <CardContent className="space-y-5 p-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border-2 border-dashed border-border bg-muted">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">لوگوی فضای کاری</p>
                <p className="text-xs text-muted-foreground">اختیاری — می‌توانید بعداً اضافه کنید</p>
                <Button type="button" variant="outline" size="sm" className="mt-2" disabled>
                  بارگذاری لوگو
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceName">نام فضای کاری</Label>
              <div className="relative">
                <Building2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="workspaceName"
                  placeholder="شرکت نمونه"
                  className="pl-9"
                  {...register("workspaceName")}
                />
              </div>
              {errors.workspaceName ? (
                <p className="text-xs text-destructive">{errors.workspaceName.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspaceSlug">آدرس فضای کاری</Label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">yadbox.app/</span>
                <Input id="workspaceSlug" placeholder="acme-inc" {...register("workspaceSlug")} />
              </div>
              {errors.workspaceSlug ? (
                <p className="text-xs text-destructive">{errors.workspaceSlug.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>اندازه شرکت</Label>
                <Select
                  value={watch("companySize")}
                  onValueChange={(val) => setValue("companySize", val, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب اندازه" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.companySize ? (
                  <p className="text-xs text-destructive">{errors.companySize.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>صنعت</Label>
                <Select
                  value={watch("industry")}
                  onValueChange={(val) => setValue("industry", val, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب صنعت" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.industry ? (
                  <p className="text-xs text-destructive">{errors.industry.message}</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/onboarding")}>
            بازگشت
          </Button>
          <Button type="submit" className="flex-1">
            ادامه
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </OnboardingShell>
  )
}
