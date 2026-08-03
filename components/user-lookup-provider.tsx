"use client"

import { useEffect } from "react"
import { useWorkspaceMembers } from "@/hooks/queries"
import { useWorkspaceStore } from "@/stores/ui-store"
import { useAuth } from "@/components/auth-provider"
import type { User } from "@/lib/types"
import { clearUserRegistry, setUserRegistry } from "@/lib/user-registry"

/** Loads workspace members into the shared user registry for name/avatar lookups. */
export function UserLookupProvider() {
  const { status, user } = useAuth()
  const { currentWorkspaceId } = useWorkspaceStore()
  const { data: members } = useWorkspaceMembers(currentWorkspaceId ?? "")

  useEffect(() => {
    if (status !== "authenticated") {
      clearUserRegistry()
      return
    }
    const registryUsers: User[] = [...(members ?? [])]
    if (user && !registryUsers.some((member) => member.id === user.id)) {
      registryUsers.push(user)
    }
    setUserRegistry(registryUsers)
  }, [status, members, user])

  return null
}
