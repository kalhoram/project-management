"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import * as fileService from "@/lib/api/file.service"

interface FileDownloadButtonProps {
  fileId: string
  filename: string
}

export function FileDownloadButton({ fileId, filename }: FileDownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      await fileService.downloadFile(fileId, filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : "دانلود فایل ناموفق بود"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={loading}
      onClick={handleDownload}
      aria-label={`دانلود ${filename}`}
    >
      <Download className="h-4 w-4" />
    </Button>
  )
}
