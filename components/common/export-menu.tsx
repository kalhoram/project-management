"use client"

import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ExportFormat = "excel" | "csv" | "pdf"

interface ExportMenuProps {
  label?: string
  entityName?: string
}

export function ExportMenu({ label = "خروجی", entityName = "داده" }: ExportMenuProps) {
  function handleExport(format: ExportFormat) {
    const formatLabels: Record<ExportFormat, string> = {
      excel: "Excel",
      csv: "CSV",
      pdf: "PDF",
    }
    toast.success(`خروجی ${formatLabels[format]} آغاز شد`, {
      description: `فایل ${entityName} به‌زودی دانلود می‌شود.`,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="h-4 w-4" />
          خروجی Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="h-4 w-4" />
          خروجی CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4" />
          خروجی PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
