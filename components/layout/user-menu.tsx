"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { CreditCard, LogOut, Moon, Settings, User } from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser, useLogout } from "@/hooks/queries"
import { getRoleLabel, userHasPermission } from "@/lib/permissions"

export function UserMenu() {
  const router = useRouter()
  const { setTheme, theme } = useTheme()
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U"
  const canBilling = userHasPermission(user, "billing.manage")

  async function handleLogout() {
    await logout.mutateAsync()
    router.push("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="rounded-full">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span>{user?.name ?? "کاربر"}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {user?.email ?? ""}
            </span>
            {user?.role ? (
              <Badge variant="secondary" className="mt-1 w-fit">
                {getRoleLabel(user.role)}
              </Badge>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <User className="h-4 w-4" />
            پروفایل
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/account">
            <Settings className="h-4 w-4" />
            تنظیمات حساب
          </Link>
        </DropdownMenuItem>
        {canBilling ? (
          <DropdownMenuItem asChild>
            <Link href="/billing/subscription">
              <CreditCard className="h-4 w-4" />
              اشتراک
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Moon className="h-4 w-4" />
          تغییر پوسته
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          خروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
