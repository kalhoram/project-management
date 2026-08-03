import { apiRequest } from "@/lib/api/client"
import type { SearchResults } from "@/lib/api/types"

export async function globalSearch(workspaceId: string, query: string): Promise<SearchResults> {
  return apiRequest<SearchResults>(`/workspaces/${workspaceId}/search`, {
    query: { q: query },
  })
}
