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
import { ProjectTabs } from "@/components/features/projects/project-tabs"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFolders, useProject, useProjectFiles, useWorkspace } from "@/hooks/queries"
import { lookupUser } from "@/lib/user-registry"
import { formatDate } from "@/lib/utils"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} بایت`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} کیلوبایت`
  return `${(bytes / 1048576).toFixed(1)} مگابایت`
}

export default function ProjectFilesPage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const projectId = params.projectId as string
  const workspace = useWorkspace(workspaceId)
  const project = useProject(projectId)
  const files = useProjectFiles(projectId)
  const folders = useFolders(workspaceId, projectId)

  const isLoading = workspace.isLoading || project.isLoading || files.isLoading

  if (isLoading) {
    return <DashboardShell><PageSkeleton /></DashboardShell>
  }

  if (project.isError || !project.data) {
    return (
      <DashboardShell>
        <ErrorState onRetry={() => project.refetch()} />
      </DashboardShell>
    )
  }

  const p = project.data

  return (
    <DashboardShell>
      <PageHeader
        title={p.name}
        breadcrumbs={[
          { label: "فضاهای کاری", href: "/workspaces" },
          { label: workspace.data?.name ?? "فضای کاری", href: `/workspaces/${workspaceId}` },
          { label: p.key, href: `/workspaces/${workspaceId}/projects/${projectId}` },
          { label: "فایل‌ها" },
        ]}
        actions={
          <div className="flex gap-2">
            <ExportMenu entityName="فایل‌ها" />
            <FileUploadButton workspaceId={workspaceId} projectId={projectId} />
          </div>
        }
      />
      <ProjectTabs workspaceId={workspaceId} projectId={projectId} />

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
          title="هنوز فایلی نیست"
          description="دارایی‌های طراحی، مشخصات و اسناد این پروژه را آپلود کنید."
          action={<FileUploadButton workspaceId={workspaceId} projectId={projectId} label="آپلود فایل" />}
        />
      ) : (
        <div className="rounded-sm border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>حجم</TableHead>
                <TableHead>آپلودکننده</TableHead>
                <TableHead>نسخه</TableHead>
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
                  <TableCell>{formatBytes(file.size)}</TableCell>
                  <TableCell>{lookupUser(file.uploadedById)?.name ?? "—"}</TableCell>
                  <TableCell>v{file.version}</TableCell>
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
