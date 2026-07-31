"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Globe,
  KeyRound,
  Link2,
  Monitor,
  Palette,
  User,
  UserCog,
} from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/settings/profile", label: "پروفایل", icon: User },
  { href: "/settings/account", label: "حساب کاربری", icon: UserCog },
  { href: "/settings/password", label: "رمز عبور", icon: KeyRound },
  { href: "/settings/sessions", label: "نشست‌ها", icon: Monitor },
  { href: "/settings/notifications", label: "اعلان‌ها", icon: Bell },
  { href: "/settings/language", label: "زبان", icon: Globe },
  { href: "/settings/appearance", label: "ظاهر", icon: Palette },
  { href: "/settings/google", label: "گوگل", icon: Link2 },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="w-full shrink-0 space-y-1 md:w-52">
      {links.map((link) => {
        const Icon = link.icon
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-accent",
              active && "border-s-2 border-primary bg-sidebar-accent text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
