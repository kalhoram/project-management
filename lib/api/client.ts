import { API_BASE_URL } from "@/lib/config"
import {
  clearStoredTokens,
  getStoredTokens,
  isAccessTokenExpired,
  setStoredTokens,
} from "@/lib/auth-tokens"
import { ApiError, networkApiError, parseApiError } from "@/lib/api/errors"

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE"

export interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  auth?: boolean
  /** Skip automatic refresh retry (used internally for refresh itself). */
  skipRefresh?: boolean
  headers?: Record<string, string>
}

type TokenResponsePayload = {
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
}

let refreshPromise: Promise<boolean> | null = null

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalized}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function refreshAccessToken(): Promise<boolean> {
  const tokens = getStoredTokens()
  if (!tokens?.refreshToken) return false

  try {
    const response = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
    if (!response.ok) {
      clearStoredTokens()
      return false
    }
    const data = (await response.json()) as TokenResponsePayload
    if (!data.accessToken || !data.refreshToken) {
      clearStoredTokens()
      return false
    }
    setStoredTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    })
    return true
  } catch {
    clearStoredTokens()
    return false
  }
}

async function ensureFreshAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens?.accessToken) return null
  if (!isAccessTokenExpired()) return tokens.accessToken

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  const ok = await refreshPromise
  if (!ok) return null
  return getStoredTokens()?.accessToken ?? null
}

async function performFetch<T>(
  path: string,
  options: RequestOptions,
  retried: boolean
): Promise<T> {
  const { method = "GET", body, query, auth = true, skipRefresh = false, headers = {} } = options

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  }

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json"
  }

  if (auth) {
    const accessToken = skipRefresh
      ? getStoredTokens()?.accessToken ?? null
      : await ensureFreshAccessToken()
    if (!accessToken) {
      throw new ApiError("ورود به سیستم الزامی است.", {
        category: "auth_required",
        status: 401,
        code: "AUTH_REQUIRED",
      })
    }
    requestHeaders.Authorization = `Bearer ${accessToken}`
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw networkApiError()
  }

  if (response.status === 401 && auth && !skipRefresh && !retried) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }
    const refreshed = await refreshPromise
    if (refreshed) {
      return performFetch<T>(path, options, true)
    }
    clearStoredTokens()
    throw new ApiError("نشست شما منقضی شده است. لطفاً دوباره وارد شوید.", {
      category: "auth_required",
      status: 401,
      code: "AUTH_INVALID",
    })
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    throw parseApiError(response.status, payload)
  }

  return payload as T
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return performFetch<T>(path, options, false)
}

async function authorizedHeaders(contentType?: string): Promise<Record<string, string>> {
  const accessToken = await ensureFreshAccessToken()
  if (!accessToken) {
    throw new ApiError("ورود به سیستم الزامی است.", {
      category: "auth_required",
      status: 401,
      code: "AUTH_REQUIRED",
    })
  }
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  }
  if (contentType) headers["Content-Type"] = contentType
  return headers
}

/** Multipart upload — do not set Content-Type; browser sets boundary. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  let response: Response
  try {
    response = await fetch(buildUrl(path), {
      method: "POST",
      headers: await authorizedHeaders(),
      body: formData,
    })
  } catch {
    throw networkApiError()
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null
  if (!response.ok) {
    throw parseApiError(response.status, payload)
  }
  return payload as T
}

/** Download binary response and trigger browser save dialog. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(buildUrl(path), {
      method: "GET",
      headers: await authorizedHeaders(),
    })
  } catch {
    throw networkApiError()
  }

  if (!response.ok) {
    const text = await response.text()
    const payload = text ? (JSON.parse(text) as unknown) : null
    throw parseApiError(response.status, payload)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function saveAuthTokens(data: TokenResponsePayload): void {
  if (!data.accessToken || !data.refreshToken) return
  setStoredTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn,
  })
}

export function clearAuthSession(): void {
  clearStoredTokens()
}
