import type { Permission, User, WorkspaceRole } from "@/lib/types"
import { mockPermissions } from "@/lib/mock/data"
import { ROLE_LABELS } from "@/lib/constants"

/** Permission keys granted to each workspace role (source of truth for demo RBAC). */
export const ROLE_PERMISSIONS: Record<WorkspaceRole, string[]> = {
  owner: mockPermissions.map((p) => p.key),
  admin: mockPermissions.filter((p) => p.key !== "billing.manage").map((p) => p.key),
  member: ["projects.create", "tasks.create", "reports.view", "files.upload"],
  guest: [],
  viewer: ["reports.view"],
}

export const DEMO_ACCOUNTS: Array<{
  email: string
  password: string
  role: WorkspaceRole
  name: string
  description: string
}> = [
  {
    email: "admin",
    password: "123/321",
    role: "owner",
    name: "ادمین سیستم",
    description: "دسترسی کامل مالک پروژه (user: admin)",
  },
  {
    email: "owner@yadbox.app",
    password: "demo",
    role: "owner",
    name: "علی محمدی",
    description: "دسترسی کامل + صورتحساب",
  },
  {
    email: "admin@yadbox.app",
    password: "demo",
    role: "admin",
    name: "جواد لی",
    description: "مدیریت اعضا و پروژه‌ها (بدون صورتحساب)",
  },
  {
    email: "member@yadbox.app",
    password: "demo",
    role: "member",
    name: "سارا رضایی",
    description: "ایجاد پروژه/وظیفه، گزارش و فایل",
  },
  {
    email: "guest@yadbox.app",
    password: "demo",
    role: "guest",
    name: "کسری کریمی",
    description: "فقط مشاهده داشبورد پایه",
  },
  {
    email: "viewer@yadbox.app",
    password: "demo",
    role: "viewer",
    name: "ریحانه چن",
    description: "فقط مشاهده گزارش‌ها",
  },
]

export function getPermissionsForRole(role: WorkspaceRole | undefined): string[] {
  if (!role) return []
  return ROLE_PERMISSIONS[role] ?? []
}

export function userHasPermission(
  user: User | null | undefined,
  permission: string
): boolean {
  return getPermissionsForRole(user?.role).includes(permission)
}

export function userHasAnyPermission(
  user: User | null | undefined,
  permissions: string[]
): boolean {
  if (permissions.length === 0) return true
  const granted = getPermissionsForRole(user?.role)
  return permissions.some((p) => granted.includes(p))
}

export function getRoleLabel(role: WorkspaceRole | undefined): string {
  if (!role) return "بدون نقش"
  return ROLE_LABELS[role] ?? role
}

export function listUserPermissions(user: User | null | undefined): Permission[] {
  const keys = new Set(getPermissionsForRole(user?.role))
  return mockPermissions.filter((p) => keys.has(p.key))
}
