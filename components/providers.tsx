"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState } from "react"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider, AuthGate } from "@/components/auth-provider"
import { WorkspaceBootstrap } from "@/components/workspace-bootstrap"
import { UserLookupProvider } from "@/components/user-lookup-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (error && typeof error === "object" && "category" in error) {
                const category = (error as { category?: string }).category
                if (category === "auth_required" || category === "permission_denied") {
                  return false
                }
              }
              return failureCount < 1
            },
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WorkspaceBootstrap />
          <UserLookupProvider />
          <AuthGate>
            <TooltipProvider delayDuration={100}>
              {children}
              <Toaster richColors position="top-left" closeButton dir="rtl" />
            </TooltipProvider>
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
