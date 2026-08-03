const ACCESS_TOKEN_KEY = "yadbox.accessToken"
const REFRESH_TOKEN_KEY = "yadbox.refreshToken"
const TOKEN_EXPIRES_KEY = "yadbox.tokenExpiresAt"

export interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
}

function canUseStorage(): boolean {
  return typeof window !== "undefined"
}

export function getStoredTokens(): StoredTokens | null {
  if (!canUseStorage()) return null
  try {
    const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!accessToken || !refreshToken) return null
    const rawExpires = window.localStorage.getItem(TOKEN_EXPIRES_KEY)
    const expiresAt = rawExpires ? Number(rawExpires) : null
    return {
      accessToken,
      refreshToken,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
    }
  } catch {
    return null
  }
}

export function setStoredTokens(tokens: {
  accessToken: string
  refreshToken: string
  expiresIn?: number | null
}): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
    if (tokens.expiresIn != null && tokens.expiresIn > 0) {
      const expiresAt = Date.now() + tokens.expiresIn * 1000
      window.localStorage.setItem(TOKEN_EXPIRES_KEY, String(expiresAt))
    } else {
      window.localStorage.removeItem(TOKEN_EXPIRES_KEY)
    }
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredTokens(): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(TOKEN_EXPIRES_KEY)
  } catch {
    // ignore
  }
}

export function isAccessTokenExpired(): boolean {
  const tokens = getStoredTokens()
  if (!tokens?.expiresAt) return false
  return Date.now() >= tokens.expiresAt - 30_000
}
