"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { useCurrentUser } from "@/hooks/queries"
import { userHasAnyPermission, userHasPermission } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/common/loading-skeleton"

interface RequirePermissionProps {
  permission?: string
  anyOf?: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AccessDeniedCard({
  title = "دسترسی ندارید",
  description = "نقش فعلی شما اجازه مشاهده این بخش را نمی‌دهد. با یکی از اکانت‌های دمو وارد شوید.",
}: {
  title?: string
  description?: string
}) {
  return (
    <Card className="mx-auto max-w-lg shadow-none">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard">بازگشت به داشبورد</Link>
        </Button>
        <Button asChild>
          <Link href="/login">تعویض حساب</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function RequirePermission({
  permission,
  anyOf,
  children,
  fallback,
}: RequirePermissionProps) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) return <PageSkeleton />

  const allowed = permission
    ? userHasPermission(user, permission)
    : anyOf
      ? userHasAnyPermission(user, anyOf)
      : true

  if (!allowed) {
    return <>{fallback ?? <AccessDeniedCard />}</>
  }

  return <>{children}</>
}
