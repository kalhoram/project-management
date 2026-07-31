"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { PageHeader } from "@/components/common/page-header"
import { SettingsSection } from "@/components/common/settings-section"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { useAdminUser } from "@/hooks/queries"
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function AdminUserDetailsPage() {
  const params = useParams()
  const userId = params.userId as string
  const { data, isLoading, isError, refetch } = useAdminUser(userId)

  if (isLoading) return <PageSkeleton />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const { user, workspaces, projects } = data

  return (
    <>
      <PageHeader
        title={user.name}
        description={user.email}
        breadcrumbs={[
          { label: "مدیریت", href: "/admin" },
          { label: "کاربران", href: "/admin/users" },
          { label: user.name },
        ]}
      />

      <div className="mb-6 flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex gap-2">
            <Badge variant="success">{USER_STATUS_LABELS[user.status] ?? user.status}</Badge>
            {user.role ? <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{user.jobTitle ?? "بدون عنوان شغلی"}</p>
          <p className="text-xs text-muted-foreground">عضویت از {formatDate(user.createdAt)}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsSection title="فضاهای کاری" description="فضاهای کاری که این کاربر عضو آن‌هاست">
          <ul className="space-y-2">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link href={`/admin/workspaces/${ws.id}`} className="text-sm font-medium text-primary hover:underline">
                  {ws.name}
                </Link>
              </li>
            ))}
          </ul>
        </SettingsSection>

        <SettingsSection title="پروژه‌های مالک" description="پروژه‌هایی که کاربر مالک آن‌هاست">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">پروژه‌ای به‌عنوان مالک ندارد</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id} className="text-sm">{p.name} <span className="text-muted-foreground">({p.key})</span></li>
              ))}
            </ul>
          )}
        </SettingsSection>
      </div>

      {user.bio ? (
        <Card className="mt-4">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{user.bio}</p>
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
