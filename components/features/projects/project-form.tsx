"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingsSection } from "@/components/common/settings-section"
import { PROJECT_TEMPLATES } from "@/lib/constants"
import type { Project, ProjectCategory, ProjectVisibility } from "@/lib/types"

const projectSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  key: z
    .string()
    .min(2, "کلید باید حداقل ۲ کاراکتر باشد")
    .max(6, "کلید باید حداکثر ۶ کاراکتر باشد")
    .regex(/^[A-Z0-9]+$/, "کلید باید فقط حروف بزرگ و عدد باشد"),
  description: z.string().optional(),
  visibility: z.enum(["private", "team", "public"]),
  categoryId: z.string().optional(),
  templateId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>

const visibilityLabels: Record<ProjectVisibility, string> = {
  private: "خصوصی",
  team: "تیمی",
  public: "عمومی",
}

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>
  categories?: ProjectCategory[]
  submitLabel?: string
  loading?: boolean
  onSubmit: (values: ProjectFormValues) => void
  onCancel?: () => void
}

export function ProjectForm({
  defaultValues,
  categories = [],
  submitLabel = "ایجاد پروژه",
  loading,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      key: "",
      description: "",
      visibility: "team",
      categoryId: "",
      templateId: "kanban",
      startDate: "",
      dueDate: "",
      ...defaultValues,
    },
  })

  const visibility = watch("visibility")
  const categoryId = watch("categoryId")
  const templateId = watch("templateId")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <SettingsSection title="جزئیات پروژه" description="اطلاعات پایه پروژه">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">نام پروژه</Label>
            <Input id="name" placeholder="وب‌اپ یادباکس" {...register("name")} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">کلید پروژه</Label>
            <Input
              id="key"
              placeholder="YB"
              className="uppercase"
              {...register("key", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase()
                },
              })}
            />
            {errors.key ? (
              <p className="text-xs text-destructive">{errors.key.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>نمایش</Label>
            <Select
              value={visibility}
              onValueChange={(v) => setValue("visibility", v as ProjectVisibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">{visibilityLabels.private}</SelectItem>
                <SelectItem value="team">{visibilityLabels.team}</SelectItem>
                <SelectItem value="public">{visibilityLabels.public}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">توضیحات</Label>
            <Textarea
              id="description"
              placeholder="این پروژه درباره چیست؟"
              rows={3}
              {...register("description")}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="پیکربندی" description="قالب، دسته‌بندی و زمان‌بندی">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>قالب</Label>
            <Select value={templateId} onValueChange={(v) => setValue("templateId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>دسته‌بندی</Label>
            <Select
              value={categoryId ?? ""}
              onValueChange={(v) => setValue("categoryId", v === "none" ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون دسته‌بندی</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">تاریخ شروع</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">تاریخ پایان</Label>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </div>
        </div>
      </SettingsSection>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            انصراف
          </Button>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال ذخیره…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}

export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    key: project.key,
    description: project.description ?? "",
    visibility: project.visibility,
    categoryId: project.categoryId,
    templateId: project.templateId ?? "kanban",
    startDate: project.startDate ?? "",
    dueDate: project.dueDate ?? "",
  }
}
