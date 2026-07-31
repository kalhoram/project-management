"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Mail, MoreHorizontal, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { PageToolbar } from "@/components/common/page-toolbar"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { TableSkeleton } from "@/components/common/loading-skeleton"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { ExportMenu } from "@/components/common/export-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWorkspace, useWorkspaceMembers } from "@/hooks/queries"
import type { WorkspaceRole } from "@/lib/types"
import { formatDate } from "@/lib/utils"

const roleVariant: Record<
  WorkspaceRole,
  "default" | "secondary" | "success" | "warning" | "purple"
> = {
  owner: "purple",
  admin: "default",
  member: "secondary",
  guest: "warning",
  viewer: "secondary",
}

const roleLabels: Record<WorkspaceRole, string> = {
  owner: "مالک",
  admin: "مدیر",
  member: "عضو",
  guest: "مهمان",
  viewer: "بیننده",
}

const memberStatusLabels: Record<string, string> = {
  active: "فعال",
  invited: "دعوت‌شده",
  inactive: "غیرفعال",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function WorkspaceMembersPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const members = useWorkspaceMembers(workspaceId)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member")
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filtered = (members.data ?? []).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  )

  function handleInvite() {
    if (!inviteEmail.includes("@")) {
      toast.error("یک آدرس ایمیل معتبر وارد کنید")
      return
    }
    toast.success(`دعوتنامه به ${inviteEmail} ارسال شد`)
    setInviteOpen(false)
    setInviteEmail("")
    setInviteRole("member")
  }

  function handleRemove() {
    toast.success("عضو از فضای کاری حذف شد")
    setRemoveId(null)
  }

  return (
    <DashboardShell>
      <PageHeader
        title="اعضا"
        description="مدیریت اعضا و دعوت‌نامه‌های فضای کاری"
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "اعضا" },
        ]}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            دعوت عضو
          </Button>
        }
      />

      <PageToolbar
        left={
          <Input
            placeholder="جستجوی اعضا…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        }
        right={<ExportMenu entityName="فهرست اعضا" />}
      />

      {members.isLoading ? <TableSkeleton rows={6} /> : null}

      {members.isError ? (
        <ErrorState message="بارگذاری اعضا ممکن نشد." onRetry={() => members.refetch()} />
      ) : null}

      {!members.isLoading && !members.isError && filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="عضوی یافت نشد"
          description={search ? "عبارت جستجوی دیگری امتحان کنید." : "اولین عضو تیم را دعوت کنید."}
          actionLabel="دعوت عضو"
          onAction={() => setInviteOpen(true)}
        />
      ) : null}

      {!members.isLoading && !members.isError && filtered.length > 0 ? (
        <div className="rounded-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عضو</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>آخرین فعالیت</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[member.role ?? "member"]}>
                      {roleLabels[member.role ?? "member"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === "active"
                          ? "success"
                          : member.status === "invited"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {memberStatusLabels[member.status] ?? member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.lastActiveAt ? formatDate(member.lastActiveAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>تغییر نقش</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setRemoveId(member.id)}
                        >
                          حذف عضو
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>دعوت عضو</DialogTitle>
            <DialogDescription>
              دعوتنامه‌ای برای پیوستن به این فضای کاری ارسال کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">آدرس ایمیل</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  className="pl-9"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>نقش</Label>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as WorkspaceRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                  <SelectItem value="member">{roleLabels.member}</SelectItem>
                  <SelectItem value="guest">{roleLabels.guest}</SelectItem>
                  <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleInvite}>ارسال دعوتنامه</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(open) => !open && setRemoveId(null)}
        title="حذف عضو"
        description="این عضو دسترسی به فضای کاری و همه پروژه‌های آن را از دست می‌دهد."
        confirmLabel="حذف"
        variant="destructive"
        onConfirm={handleRemove}
      />
    </DashboardShell>
  )
}
