"use client"

import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "حداقل ۸ کاراکتر", test: (p) => p.length >= 8 },
  { id: "upper", label: "یک حرف بزرگ", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "یک حرف کوچک", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "یک عدد", test: (p) => /[0-9]/.test(p) },
]

interface PasswordRulesProps {
  password: string
  className?: string
}

export function PasswordRules({ password, className }: PasswordRulesProps) {
  return (
    <ul className={cn("space-y-1.5", className)}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password)
        return (
          <li key={rule.id} className="flex items-center gap-2 text-xs">
            {passed ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={passed ? "text-foreground" : "text-muted-foreground"}>{rule.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function meetsPasswordRules(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}
