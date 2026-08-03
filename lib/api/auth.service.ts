import { apiRequest, clearAuthSession, saveAuthTokens } from "@/lib/api/client"
import { setSessionUserId, clearSessionUserId } from "@/lib/auth-session"
import type { User, Session } from "@/lib/types"

interface TokenResponse {
  accessToken: string | null
  refreshToken: string | null
  tokenType?: string
  expiresIn?: number | null
  user?: User | null
  requiresTwoFactor?: boolean
  twoFactorToken?: string | null
}

function persistLogin(response: TokenResponse): User {
  if (response.requiresTwoFactor) {
    throw new Error("Two-factor authentication required")
  }
  if (!response.user || !response.accessToken || !response.refreshToken) {
    throw new Error("Invalid email or password")
  }
  saveAuthTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresIn: response.expiresIn ?? undefined,
  })
  setSessionUserId(response.user.id)
  return response.user
}

export async function login(email: string, password: string): Promise<User> {
  const response = await apiRequest<TokenResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: { identifier: email, password },
  })
  return persistLogin(response)
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    await apiRequest<{ success?: boolean; message?: string }>("/auth/logout", {
      method: "POST",
    })
  } catch {
    // Clear local session even if backend logout fails
  }
  clearAuthSession()
  clearSessionUserId()
  return { success: true }
}

export async function signup(data: {
  name: string
  email: string
  password: string
}): Promise<User> {
  const response = await apiRequest<TokenResponse>("/auth/signup", {
    method: "POST",
    auth: false,
    body: data,
  })
  return persistLogin(response)
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  await apiRequest("/auth/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
  })
  return { success: true }
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean }> {
  await apiRequest("/auth/reset-password", {
    method: "POST",
    auth: false,
    body: { token, password },
  })
  return { success: true }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; expired?: boolean }> {
  try {
    await apiRequest("/auth/verify-email", {
      method: "POST",
      auth: false,
      body: { token },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; emailDispatched: boolean; deliveryMode?: string | null }> {
  const response = await apiRequest<{
    emailDispatched?: boolean
    deliveryMode?: string | null
  }>("/auth/resend-verification", {
    method: "POST",
    auth: false,
    body: { email },
  })
  return {
    success: true,
    emailDispatched: response.emailDispatched === true,
    deliveryMode: response.deliveryMode ?? null,
  }
}

export async function verifyTwoFactor(code: string, twoFactorToken?: string): Promise<{ success: boolean }> {
  await apiRequest<TokenResponse>("/auth/two-factor/verify", {
    method: "POST",
    auth: false,
    body: { code, twoFactorToken },
  })
  return { success: true }
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me")
}

export async function connectGoogle(_attempt = 1): Promise<{ success: boolean }> {
  await apiRequest("/settings/google/connect", { method: "POST" })
  return { success: true }
}

export async function getSessions(): Promise<Session[]> {
  return apiRequest<Session[]>("/auth/sessions")
}

export async function revokeSession(sessionId: string): Promise<{ success: boolean }> {
  await apiRequest(`/auth/sessions/${sessionId}`, { method: "DELETE" })
  return { success: true }
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  return apiRequest<User>("/auth/me", {
    method: "PATCH",
    body: {
      name: data.name,
      avatarUrl: data.avatarUrl,
      bio: data.bio,
      jobTitle: data.jobTitle,
      timezone: data.timezone,
      language: data.language,
    },
  })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean }> {
  await apiRequest("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  })
  return { success: true }
}
