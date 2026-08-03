"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { TableSkeleton } from "@/components/common/loading-skeleton"
import { ProjectTabs } from "@/components/features/projects/project-tabs"
import { Button } from "@/components/ui/button"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProject, useWorkspace, useWorkspaceMembers } from "@/hooks/queries"
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants"
import type { WorkspaceRole } from "@/lib/types"

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function ProjectMembersPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const allMembers = useWorkspaceMembers(workspaceId)

  const [addOpen, setAddOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("member")

  const projectMembers = (project.data?.memberIds ?? [])
    .map((id) => (allMembers.data ?? []).find((member) => member.id === id))
    .filter(Boolean)

  const availableToAdd = (allMembers.data ?? []).filter(
    (m) => !project.data?.memberIds.includes(m.id)
  )

  function handleAdd() {
    if (!selectedUserId) {
      toast.error("یک عضو انتخاب کنید")
      return
    }
    toast.success("عضو به پروژه اضافه شد")
    setAddOpen(false)
    setSelectedUserId("")
  }

  if (project.isLoading || workspace.isLoading) {
    return (
      <DashboardShell>
        <PageHeader title="اعضای پروژه" />
        <TableSkeleton rows={5} />
      </DashboardShell>
    )
  }

  if (project.isError) {
    return (
      <DashboardShell>
        <ErrorState message="بارگذاری پروژه ممکن نشد." onRetry={() => project.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="اعضای پروژه"
        description={`مدیریت دسترسی به ${project.data?.name}`}
        breadcrumbs={[
          { label: "پروژه‌ها", href: `/workspaces/${workspaceId}/projects` },
          { label: project.data?.name ?? "پروژه", href: `/workspaces/${workspaceId}/projects/${projectId}` },
          { label: "اعضا" },
        ]}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            افزودن عضو
          </Button>
        }
      />

      <ProjectTabs workspaceId={workspaceId} projectId={projectId} />

      {projectMembers.length === 0 ? (
        <EmptyState
          title="عضوی نیست"
          description="اعضای فضای کاری را به این پروژه اضافه کنید."
          actionLabel="افزودن عضو"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="rounded-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عضو</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>عنوان شغلی</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectMembers.map((member) =>
                member ? (
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
                      <Badge variant="secondary">{ROLE_LABELS[member.role ?? "member"] ?? member.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.jobTitle ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "success" : "warning"}>
                        {USER_STATUS_LABELS[member.status] ?? member.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ) : null
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن عضو پروژه</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عضو</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب عضو" />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نقش در پروژه</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as WorkspaceRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                  <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                  <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleAdd}>افزودن عضو</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
