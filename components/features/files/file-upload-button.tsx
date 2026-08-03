"use client"

import { useRef } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useUploadFile } from "@/hooks/queries"
import { cn } from "@/lib/utils"

interface FileUploadButtonProps {
  workspaceId: string
  projectId?: string
  label?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "default" | "outline" | "ghost" | "secondary"
  className?: string
  accept?: string
}

export function FileUploadButton({
  workspaceId,
  projectId,
  label = "آپلود",
  size = "sm",
  variant = "default",
  className,
  accept,
}: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadFile(workspaceId, projectId)

  function openPicker() {
    inputRef.current?.click()
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      await upload.mutateAsync(file)
      toast.success(`«${file.name}» با موفقیت آپلود شد`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "آپلود فایل ناموفق بود"
      toast.error(message)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn(className)}
        disabled={upload.isPending}
        onClick={openPicker}
      >
        <Upload className="h-4 w-4" />
        {upload.isPending ? "در حال آپلود…" : label}
      </Button>
    </>
  )
}
