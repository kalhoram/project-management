import { describe, expect, it } from "vitest"
import { selectProject, selectWorkspace, isValidUuid } from "@/lib/workspace-bootstrap"
import { categorizeApiError, parseApiError } from "@/lib/api/errors"

describe("workspace bootstrap", () => {
  const workspaces = [
    { id: "326613e1-f483-5194-9a8a-fd95e5560352", name: "A" },
    { id: "11111111-1111-4111-8111-111111111111", name: "B" },
  ] as Array<{ id: string; name: string }>

  it("prefers persisted workspace when still accessible", () => {
    expect(
      selectWorkspace(workspaces as never, "11111111-1111-4111-8111-111111111111")
    ).toBe("11111111-1111-4111-8111-111111111111")
  })

  it("falls back to first workspace when persisted id is stale", () => {
    expect(selectWorkspace(workspaces as never, "ws-1")).toBe(
      "326613e1-f483-5194-9a8a-fd95e5560352"
    )
  })

  it("selects project from persisted id when valid", () => {
    const projects = [{ id: "98a5a175-72f0-514e-9ca3-bd9ae2a019d8" }]
    expect(selectProject(projects, "98a5a175-72f0-514e-9ca3-bd9ae2a019d8")).toBe(
      "98a5a175-72f0-514e-9ca3-bd9ae2a019d8"
    )
  })

  it("rejects mock ids as uuid", () => {
    expect(isValidUuid("ws-1")).toBe(false)
    expect(isValidUuid("326613e1-f483-5194-9a8a-fd95e5560352")).toBe(true)
  })
})

describe("api errors", () => {
  it("maps 401 to auth_required", () => {
    expect(categorizeApiError(401, "AUTH_REQUIRED")).toBe("auth_required")
  })

  it("maps 403 to permission_denied", () => {
    expect(categorizeApiError(403, "PERMISSION_DENIED")).toBe("permission_denied")
  })

  it("parses backend error envelope", () => {
    const err = parseApiError(422, {
      success: false,
      code: "VALIDATION_ERROR",
      message: "اطلاعات نامعتبر",
    })
    expect(err.category).toBe("validation_error")
    expect(err.message).toBe("اطلاعات نامعتبر")
  })
})
