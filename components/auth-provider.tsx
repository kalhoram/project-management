"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { getStoredTokens } from "@/lib/auth-tokens"
import { ApiError } from "@/lib/api/errors"
import * as authService from "@/lib/api/auth.service"
import type { User } from "@/lib/types"

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated" | "failed"

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/maintenance",
  "/500",
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function safeRedirectPath(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard"
  }
  if (isPublicPath(path)) return "/dashboard"
  return path
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>("initializing")
  const [user, setUser] = useState<User | null>(null)

  const bootstrap = useCallback(async () => {
    const tokens = getStoredTokens()
    if (!tokens) {
      setUser(null)
      setStatus("unauthenticated")
      return
    }
    try {
      const current = await authService.getCurrentUser()
      setUser(current)
      setStatus("authenticated")
      queryClient.setQueryData(["currentUser"], current)
    } catch (error) {
      setUser(null)
      setStatus(error instanceof ApiError && error.category === "auth_required" ? "unauthenticated" : "failed")
      queryClient.removeQueries({ queryKey: ["currentUser"] })
    }
  }, [queryClient])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (status === "initializing") return

    const onPublic = isPublicPath(pathname)

    if (status === "authenticated" && onPublic && pathname === "/login") {
      router.replace("/dashboard")
      return
    }

    if ((status === "unauthenticated" || status === "failed") && !onPublic && pathname !== "/") {
      const redirect = encodeURIComponent(safeRedirectPath(pathname))
      router.replace(`/login?redirect=${redirect}`)
    }
  }, [status, pathname, router])

  const refreshUser = useCallback(async () => {
    await bootstrap()
  }, [bootstrap])

  const signOut = useCallback(async () => {
    await authService.logout()
    setUser(null)
    setStatus("unauthenticated")
    queryClient.clear()
    router.replace("/login")
  }, [queryClient, router])

  const value = useMemo(
    () => ({ status, user, refreshUser, signOut }),
    [status, user, refreshUser, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const pathname = usePathname()

  if (isPublicPath(pathname) || pathname === "/") {
    return <>{children}</>
  }

  if (status === "initializing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      </div>
    )
  }

  if (status === "unauthenticated" || status === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">در حال هدایت به ورود…</p>
      </div>
    )
  }

  return <>{children}</>
}
