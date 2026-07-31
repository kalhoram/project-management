const STORAGE_KEY = "yadbox.currentUserId"

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setSessionUserId(userId: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, userId)
  } catch {
    // ignore quota / private mode
  }
}

export function clearSessionUserId(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
