"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StatusPageProps {
  icon: LucideIcon
  title: string
  description: string
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  className?: string
}

export function StatusPage({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: StatusPageProps) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center px-4 text-center",
        className
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-8 w-8" />
      </div>
      <h1 className="text-[29px] font-bold tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {primaryAction ? (
          <Button asChild>
            <Link href={primaryAction.href}>{primaryAction.label}</Link>
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button variant="outline" asChild>
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
