import type { WorkspaceRole } from "@/lib/types"

export interface OnboardingDraft {
  workspaceName?: string
  workspaceSlug?: string
  companySize?: string
  industry?: string
  invites?: Array<{ email: string; role: WorkspaceRole }>
  templateId?: string
}

const STORAGE_KEY = "yadbox-onboarding"
const LEGACY_STORAGE_KEY = "teamblue-onboarding"

export function getOnboardingDraft(): OnboardingDraft {
  if (typeof window === "undefined") return {}
  try {
    let raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      raw = sessionStorage.getItem(LEGACY_STORAGE_KEY)
      if (raw) {
        sessionStorage.setItem(STORAGE_KEY, raw)
        sessionStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    }
    return raw ? (JSON.parse(raw) as OnboardingDraft) : {}
  } catch {
    return {}
  }
}

export function saveOnboardingDraft(data: Partial<OnboardingDraft>): OnboardingDraft {
  const current = getOnboardingDraft()
  const next = { ...current, ...data }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function clearOnboardingDraft(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
}
