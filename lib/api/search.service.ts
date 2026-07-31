import { delay } from "@/lib/utils"
import {
  mockTasks,
  mockProjects,
  mockUsers,
  mockAttachments,
  mockComments,
} from "@/lib/mock/data"

const LATENCY = 300

export async function globalSearch(query: string) {
  await delay(LATENCY)
  const q = query.toLowerCase().trim()
  if (!q) {
    return { tasks: [], projects: [], users: [], files: [], comments: [] }
  }

  return {
    tasks: mockTasks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.key.toLowerCase().includes(q)
    ),
    projects: mockProjects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
    ),
    users: mockUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ),
    files: mockAttachments.filter((f) => f.name.toLowerCase().includes(q) && !f.deletedAt),
    comments: mockComments.filter((c) => c.body.toLowerCase().includes(q)),
  }
}
