import type { ReactNode } from "react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  danger?: boolean
  className?: string
  actions?: ReactNode
}

export function SettingsSection({
  title,
  description,
  children,
  danger,
  className,
  actions,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "rounded-sm border bg-card p-4",
        danger ? "border-destructive/40" : "border-border",
        className
      )}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h5 className={cn(danger && "text-destructive")}>{title}</h5>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <Separator className="mb-4" />
      {children}
    </section>
  )
}
