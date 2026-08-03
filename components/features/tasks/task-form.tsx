"use client"

import { useForm, Controller } from "react-hook-form"
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
import type { Label as TaskLabel, TaskPriority, TaskStatus } from "@/lib/types"
import { TASK_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants"
import { lookupUser } from "@/lib/user-registry"

const taskSchema = z.object({
  title: z.string().min(2, "عنوان باید حداقل ۲ کاراکتر باشد"),
  description: z.string().optional(),
  status: z.enum([
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "blocked",
    "cancelled",
  ]),
  priority: z.enum(["highest", "high", "medium", "low", "lowest"]),
  assigneeId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimateHours: z.coerce.number().optional(),
  storyPoints: z.coerce.number().optional(),
  labelIds: z.array(z.string()).optional(),
})

export type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormProps {
  defaultValues?: Partial<TaskFormValues>
  labels?: TaskLabel[]
  memberIds?: string[]
  submitLabel?: string
  loading?: boolean
  onSubmit: (values: TaskFormValues) => void
  onCancel?: () => void
}

const STATUS_OPTIONS = (Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((value) => ({
  value,
  label: TASK_STATUS_LABELS[value] ?? value,
}))

const PRIORITY_OPTIONS = (Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: PRIORITY_LABELS[value] ?? value,
}))

export function TaskForm({
  defaultValues,
  labels = [],
  memberIds = [],
  submitLabel = "ذخیره وظیفه",
  loading,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigneeId: "",
      startDate: "",
      dueDate: "",
      estimateHours: undefined,
      storyPoints: undefined,
      labelIds: [],
      ...defaultValues,
    },
  })

  const status = watch("status")
  const priority = watch("priority")
  const assigneeId = watch("assigneeId")
  const selectedLabels = watch("labelIds") ?? []

  const members = memberIds
    .map((id) => lookupUser(id))
    .filter((user): user is NonNullable<typeof user> => !!user)

  function toggleLabel(labelId: string) {
    const next = selectedLabels.includes(labelId)
      ? selectedLabels.filter((id) => id !== labelId)
      : [...selectedLabels, labelId]
    setValue("labelIds", next)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit(onSubmit)(event)
      }}
      className="space-y-6"
      noValidate
      method="post"
      action="#"
    >
      <SettingsSection title="جزئیات" description="اطلاعات اصلی وظیفه">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان</Label>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input
                  id="title"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  placeholder="چه کاری باید انجام شود؟"
                />
              )}
            />
            {errors.title ? (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">توضیحات</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="زمینه، معیار پذیرش یا لینک‌ها را اضافه کنید..."
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>وضعیت</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>اولویت</Label>
              <Select
                value={priority}
                onValueChange={(v) => setValue("priority", v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>مسئول</Label>
            <Select
              value={assigneeId || "unassigned"}
              onValueChange={(v) => setValue("assigneeId", v === "unassigned" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="بدون مسئول" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">بدون مسئول</SelectItem>
                {members.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="زمان‌بندی" description="تاریخ‌ها و برآوردها">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">تاریخ شروع</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">مهلت</Label>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimateHours">برآورد (ساعت)</Label>
            <Input id="estimateHours" type="number" min={0} step={0.5} {...register("estimateHours")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storyPoints">امتیاز داستان</Label>
            <Input id="storyPoints" type="number" min={0} {...register("storyPoints")} />
          </div>
        </div>
      </SettingsSection>

      {labels.length > 0 ? (
        <SettingsSection title="برچسب‌ها" description="دسته‌بندی این وظیفه">
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const selected = selectedLabels.includes(label.id)
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className="rounded-sm border px-2 py-1 text-xs font-bold uppercase transition-colors"
                  style={{
                    borderColor: label.color,
                    color: label.color,
                    backgroundColor: selected ? `${label.color}25` : "transparent",
                  }}
                >
                  {label.name}
                </button>
              )
            })}
          </div>
        </SettingsSection>
      ) : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            انصراف
          </Button>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
