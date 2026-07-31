import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageToolbarProps {
  left?: ReactNode
  right?: ReactNode
  className?: string
}

export function PageToolbar({ left, right, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-sm border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{left}</div>
      <div className="flex flex-wrap items-center gap-2">{right}</div>
    </div>
  )
}
