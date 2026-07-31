"use client"

import { useCallback, useState } from "react"
import { FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onUpload?: (files: File[]) => void
  accept?: string
  className?: string
}

export function FileUploader({ onUpload, accept, className }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return
      const next = Array.from(list)
      setFiles(next)
      setUploading(true)
      setProgress(20)
      const timer = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(timer)
            setUploading(false)
            onUpload?.(next)
            return 100
          }
          return p + 20
        })
      }, 200)
    },
    [onUpload]
  )

  return (
    <div className={cn("space-y-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-sm border border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors",
          dragging && "border-primary bg-primary/5"
        )}
      >
        <FileUp className="mb-2 h-8 w-8 text-primary" />
        <p className="text-sm font-medium">فایل‌ها را اینجا بکشید و رها کنید</p>
        <p className="mt-1 text-xs text-muted-foreground">یا برای انتخاب کلیک کنید</p>
        <label className="mt-3">
          <input
            type="file"
            className="hidden"
            multiple
            accept={accept}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button type="button" variant="outline" size="sm" asChild>
            <span>انتخاب فایل</span>
          </Button>
        </label>
      </div>
      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.name}
              className="flex items-center justify-between rounded-sm border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setFiles((prev) => prev.filter((f) => f.name !== file.name))}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {uploading || progress === 100 ? <Progress value={progress} /> : null}
    </div>
  )
}
