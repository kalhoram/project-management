const DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1"

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (!url) return DEFAULT_API_URL
  return url.replace(/\/$/, "")
}

export const API_BASE_URL = getApiBaseUrl()
