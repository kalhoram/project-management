import { delay } from "@/lib/utils"
import { currentUser as defaultUser, mockUsers, mockSessions } from "@/lib/mock/data"
import {
  clearSessionUserId,
  getSessionUserId,
  setSessionUserId,
} from "@/lib/auth-session"
import type { User, Session } from "@/lib/types"

const MOCK_LATENCY = 350

function resolveUser(userId: string | null): User {
  if (userId) {
    const found = mockUsers.find((u) => u.id === userId)
    if (found) return found
  }
  return defaultUser
}

export async function login(email: string, password: string): Promise<User> {
  await delay(MOCK_LATENCY)
  if (!password) {
    throw new Error("Invalid email or password")
  }
  const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user || user.status === "suspended") {
    throw new Error("Invalid email or password")
  }
  setSessionUserId(user.id)
  return user
}

export async function logout(): Promise<{ success: boolean }> {
  await delay(150)
  clearSessionUserId()
  return { success: true }
}

export async function signup(data: {
  name: string
  email: string
  password: string
}): Promise<User> {
  await delay(MOCK_LATENCY)
  if (mockUsers.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error("An account with this email already exists")
  }
  return {
    id: `user-${Date.now()}`,
    name: data.name,
    email: data.email,
    status: "active",
    role: "member",
    createdAt: new Date().toISOString(),
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean }> {
  await delay(MOCK_LATENCY)
  if (!email) throw new Error("Email is required")
  return { success: true }
}

export async function resetPassword(_token: string, _password: string): Promise<{ success: boolean }> {
  await delay(MOCK_LATENCY)
  return { success: true }
}

export async function verifyEmail(token: string): Promise<{ success: boolean; expired?: boolean }> {
  await delay(MOCK_LATENCY)
  if (token === "expired") return { success: false, expired: true }
  if (!token) return { success: false }
  return { success: true }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean }> {
  await delay(MOCK_LATENCY)
  if (!email) throw new Error("Email is required")
  return { success: true }
}

export async function verifyTwoFactor(_code: string): Promise<{ success: boolean }> {
  await delay(MOCK_LATENCY)
  if (!_code || _code.length < 6) throw new Error("Invalid verification code")
  return { success: true }
}

export async function getCurrentUser(): Promise<User> {
  await delay(200)
  return resolveUser(getSessionUserId())
}

export async function connectGoogle(attempt = 1): Promise<{ success: boolean }> {
  await delay(1500)
  if (attempt === 1) {
    throw new Error("Could not connect your Google account. Please try again.")
  }
  return { success: true }
}

export async function getSessions(): Promise<Session[]> {
  await delay(200)
  return mockSessions
}

export async function revokeSession(sessionId: string): Promise<{ success: boolean }> {
  await delay(300)
  void sessionId
  return { success: true }
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  await delay(300)
  const user = resolveUser(getSessionUserId())
  return { ...user, ...data }
}

export async function changePassword(
  _currentPassword: string,
  _newPassword: string
): Promise<{ success: boolean }> {
  await delay(400)
  return { success: true }
}
