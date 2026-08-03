"use client"

import { useParams } from "next/navigation"
import { FileText, Folder } from "lucide-react"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageHeader } from "@/components/common/page-header"
import { ExportMenu } from "@/components/common/export-menu"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { PageSkeleton } from "@/components/common/loading-skeleton"
import { FileDownloadButton } from "@/components/features/files/file-download-button"
import { FileUploadButton } from "@/components/features/files/file-upload-button"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFolders, useProjects, useWorkspace, useWorkspaceFiles } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"
import { formatDate } from "@/lib/utils"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} بایت`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} کیلوبایت`
  return `${(bytes / 1048576).toFixed(1)} مگابایت`
}

export default function WorkspaceFilesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const workspace = useWorkspace(workspaceId)
  const files = useWorkspaceFiles(workspaceId)
  const folders = useFolders(workspaceId)
  const projects = useProjects(workspaceId)

  const projectNameById = new Map((projects.data ?? []).map((project) => [project.id, project.name]))

  if (workspace.isLoading || files.isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (files.isError) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => files.refetch()} />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <PageHeader
        title="فایل‌ها"
        description={`همه فایل‌های ${workspace.data?.name ?? "فضای کاری"}`}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: "فایل‌ها" },
        ]}
        actions={
          <div className="flex gap-2">
            <ExportMenu entityName="فایل‌ها" />
            <FileUploadButton workspaceId={workspaceId} />
          </div>
        }
      />

      {(folders.data ?? []).length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {(folders.data ?? []).map((folder) => (
            <Button key={folder.id} variant="outline" size="sm">
              <Folder className="h-4 w-4" />
              {folder.name}
            </Button>
          ))}
        </div>
      ) : null}

      {(files.data ?? []).length === 0 ? (
        <EmptyState
          icon={FileText}
          title="فایلی وجود ندارد"
          description="اسناد مشترک فضای کاری را آپلود کنید."
          action={<FileUploadButton workspaceId={workspaceId} label="آپلود فایل" />}
        />
      ) : (
        <div className="rounded-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>پروژه</TableHead>
                <TableHead>حجم</TableHead>
                <TableHead>آپلودکننده</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(files.data ?? []).map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {file.name}
                    </div>
                  </TableCell>
                  <TableCell>{file.projectId ? projectNameById.get(file.projectId) ?? "—" : "فضای کاری"}</TableCell>
                  <TableCell>{formatBytes(file.size)}</TableCell>
                  <TableCell>{lookupUser(file.uploadedById)?.name ?? "—"}</TableCell>
                  <TableCell>{formatDate(file.createdAt)}</TableCell>
                  <TableCell>
                    <FileDownloadButton fileId={file.id} filename={file.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardShell>
  )
}
