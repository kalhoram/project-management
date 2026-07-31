import { redirect } from "next/navigation"
import { DEFAULT_PROJECT_ID, DEFAULT_WORKSPACE_ID } from "@/lib/constants"

export default function KanbanRedirectPage() {
  redirect(`/workspaces/${DEFAULT_WORKSPACE_ID}/projects/${DEFAULT_PROJECT_ID}/kanban`)
}
