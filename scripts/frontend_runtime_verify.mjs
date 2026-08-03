/**
 * Runtime integration verifier — exercises auth, workspace/project bootstrap contracts
 * against the live FastAPI backend without printing secrets.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1"

async function request(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.body) headers["Content-Type"] = "application/json"

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
    body: options.body,
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : {}
  return { status: res.status, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function isUuid(value) {
  return /^[0-9a-f-]{36}$/i.test(value)
}

async function main() {
  const results = []

  async function step(name, fn) {
    try {
      await fn()
      results.push({ name, pass: true })
      console.log(`PASS ${name}`)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      results.push({ name, pass: false, detail })
      console.log(`FAIL ${name}: ${detail}`)
    }
  }

  let accessToken = ""
  let refreshToken = ""
  let workspaceId = ""
  let projectId = ""

  await step("backend health", async () => {
    const health = await fetch("http://127.0.0.1:8000/health")
    assert(health.ok, `health ${health.status}`)
    const ready = await fetch("http://127.0.0.1:8000/ready")
    assert(ready.ok, `ready ${ready.status}`)
  })

  await step("login returns tokens and user uuid", async () => {
    const identifier = process.env.VERIFY_LOGIN_IDENTIFIER ?? "admin"
    const password = process.env.VERIFY_LOGIN_PASSWORD ?? "123/321"
    const { status, body } = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    })
    assert(status === 200, `login status ${status}`)
    assert(!!body.accessToken && !!body.refreshToken, "missing tokens")
    assert(!!body.user?.id && isUuid(body.user.id), "invalid user id")
    accessToken = body.accessToken
    refreshToken = body.refreshToken
  })

  await step("auth/me with bearer", async () => {
    const { status, body } = await request("/auth/me", { token: accessToken })
    assert(status === 200, `me status ${status}`)
    assert(isUuid(body.id), "me id not uuid")
  })

  await step("refresh contract", async () => {
    const { status, body } = await request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    })
    assert(status === 200, "refresh failed")
    accessToken = body.accessToken
    refreshToken = body.refreshToken
  })

  await step("workspaces list uses real uuids", async () => {
    const { status, body } = await request("/workspaces", { token: accessToken })
    assert(status === 200, `workspaces ${status}`)
    assert(Array.isArray(body) && body.length > 0, "no workspaces")
    workspaceId = body[0].id
    assert(isUuid(workspaceId), `workspace not uuid: ${workspaceId}`)
    assert(!workspaceId.includes("ws-1"), "mock workspace id")
  })

  await step("projects list for workspace", async () => {
    const { status, body } = await request(
      `/workspaces/${workspaceId}/projects?scope=active`,
      { token: accessToken }
    )
    assert(status === 200, `projects ${status}`)
    assert(Array.isArray(body) && body.length > 0, "no projects")
    projectId = body[0].id
    assert(isUuid(projectId), "project not uuid")
    assert(!projectId.includes("proj-1"), "mock project id")
  })

  await step("tasks list for project", async () => {
    const { status, body } = await request(`/projects/${projectId}/tasks`, {
      token: accessToken,
    })
    assert(status === 200, `tasks ${status}`)
    assert(Array.isArray(body), "tasks not array")
  })

  await step("logout", async () => {
    const { status } = await request("/auth/logout", {
      method: "POST",
      token: accessToken,
    })
    assert(status === 200, `logout ${status}`)
  })

  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass)
  console.log(
    JSON.stringify({ passed, total: results.length, failed, workspaceId, projectId }, null, 2)
  )
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
