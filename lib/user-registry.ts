import type { User } from "@/lib/types"

let usersById = new Map<string, User>()

export function setUserRegistry(users: User[]): void {
  usersById = new Map(users.map((user) => [user.id, user]))
}

export function clearUserRegistry(): void {
  usersById = new Map()
}

export function lookupUser(userId: string): User | undefined {
  return usersById.get(userId)
}

export function mergeUsersIntoRegistry(users: User[]): void {
  for (const user of users) {
    usersById.set(user.id, user)
  }
}
