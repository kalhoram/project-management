"use client"

import { cn } from "@/lib/utils"

export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong"

export interface PasswordStrengthResult {
  score: number
  label: string
  level: PasswordStrengthLevel
  color: string
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 15
  if (/[a-z]/.test(password)) score += 15
  if (/[A-Z]/.test(password)) score += 15
  if (/[0-9]/.test(password)) score += 15
  if (/[^A-Za-z0-9]/.test(password)) score += 15

  if (score <= 25) return { score, label: "ضعیف", level: "weak", color: "bg-destructive" }
  if (score <= 50) return { score, label: "متوسط", level: "fair", color: "bg-warning" }
  if (score <= 75) return { score, label: "خوب", level: "good", color: "bg-info" }
  return { score: Math.min(score, 100), label: "قوی", level: "strong", color: "bg-success" }
}

interface PasswordStrengthProps {
  password: string
  className?: string
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  if (!password) return null

  const strength = getPasswordStrength(password)

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">قدرت رمز عبور</span>
        <span
          className={cn(
            "font-medium",
            strength.level === "weak" && "text-destructive",
            strength.level === "fair" && "text-warning",
            strength.level === "good" && "text-info",
            strength.level === "strong" && "text-success"
          )}
        >
          {strength.label}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-surface">
        <div
          className={cn("h-full transition-all", strength.color)}
          style={{ width: `${strength.score}%` }}
        />
      </div>
    </div>
  )
}
