"use client"

import Link from "next/link"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminUsers } from "@/hooks/queries"
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import type { UserStatus } from "@/lib/types"

const statusVariant: Record<UserStatus, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  invited: "warning",
  suspended: "destructive",
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export default function AdminUsersPage() {
  const users = useAdminUsers()

  if (users.isLoading) return <PageSkeleton />
  if (users.isError) return <ErrorState onRetry={() => users.refetch()} />

  return (
    <>
      <PageHeader title="کاربران" description="مدیریت همه کاربران پلتفرم" actions={<ExportMenu entityName="کاربران" />} />
      <div className="rounded-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>کاربر</TableHead>
              <TableHead>ایمیل</TableHead>
              <TableHead>نقش</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead>آخرین فعالیت</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users.data ?? []).map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link href={`/admin/users/${user.id}`} className="flex items-center gap-2 hover:text-primary">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </Link>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role ? (ROLE_LABELS[user.role] ?? user.role) : "—"}</TableCell>
                <TableCell><Badge variant={statusVariant[user.status]}>{USER_STATUS_LABELS[user.status] ?? user.status}</Badge></TableCell>
                <TableCell>{user.lastActiveAt ? formatDate(user.lastActiveAt) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
