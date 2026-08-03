export type ApiErrorCategory =
  | "auth_required"
  | "permission_denied"
  | "validation_error"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "service_unavailable"
  | "network_failure"
  | "unexpected"

export interface ApiErrorBody {
  success?: boolean
  code?: string
  message?: string
  details?: Record<string, unknown>
  requestId?: string
}

export class ApiError extends Error {
  readonly category: ApiErrorCategory
  readonly status: number
  readonly code: string
  readonly details: Record<string, unknown>
  readonly requestId?: string

  constructor(
    message: string,
    {
      category,
      status,
      code,
      details = {},
      requestId,
    }: {
      category: ApiErrorCategory
      status: number
      code: string
      details?: Record<string, unknown>
      requestId?: string
    }
  ) {
    super(message)
    this.name = "ApiError"
    this.category = category
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

export function categorizeApiError(status: number, code?: string): ApiErrorCategory {
  if (status === 401 || code === "AUTH_REQUIRED" || code === "AUTH_INVALID") {
    return "auth_required"
  }
  if (status === 403 || code === "PERMISSION_DENIED") {
    return "permission_denied"
  }
  if (status === 404 || code === "NOT_FOUND") {
    return "not_found"
  }
  if (status === 409 || code === "CONFLICT") {
    return "conflict"
  }
  if (status === 422 || code === "VALIDATION_ERROR") {
    return "validation_error"
  }
  if (status === 429 || code === "RATE_LIMIT_EXCEEDED") {
    return "rate_limited"
  }
  if (status === 503 || code === "DATABASE_UNAVAILABLE" || code === "MAINTENANCE") {
    return "service_unavailable"
  }
  return "unexpected"
}

export function parseApiError(status: number, body: unknown): ApiError {
  const payload = (body ?? {}) as ApiErrorBody
  const code = payload.code ?? "HTTP_ERROR"
  const message =
    typeof payload.message === "string" && payload.message.length > 0
      ? payload.message
      : status >= 500
        ? "خطای داخلی سرور رخ داد."
        : "درخواست با خطا مواجه شد."
  return new ApiError(message, {
    category: categorizeApiError(status, code),
    status,
    code,
    details: payload.details ?? {},
    requestId: payload.requestId,
  })
}

export function networkApiError(cause?: unknown): ApiError {
  void cause
  return new ApiError("اتصال به سرور برقرار نشد. اتصال اینترنت را بررسی کنید.", {
    category: "network_failure",
    status: 0,
    code: "NETWORK_ERROR",
  })
}
