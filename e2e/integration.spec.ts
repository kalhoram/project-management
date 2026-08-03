import { test, expect, type Page, type BrowserContext } from "@playwright/test"

const API = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8000/api/v1"
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

type TrackedRuntime = {
  consoleErrors: string[]
  failedRequests: string[]
}

function trackRuntime(page: Page): TrackedRuntime {
  const runtime: TrackedRuntime = { consoleErrors: [], failedRequests: [] }

  page.on("console", (msg) => {
    if (msg.type() === "error") runtime.consoleErrors.push(msg.text())
  })

  page.on("requestfailed", (req) => {
    runtime.failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? "failed"}`)
  })

  page.on("response", (res) => {
    const url = res.url()
    if (
      res.status() >= 400 &&
      url.includes("127.0.0.1:8000") &&
      !url.includes("/favicon")
    ) {
      runtime.failedRequests.push(`${res.request().method()} ${url} :: HTTP ${res.status()}`)
    }
  })

  return runtime
}

function assertCleanRuntime(runtime: TrackedRuntime) {
  const consoleIssues = runtime.consoleErrors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("404") &&
      !/hydration/i.test(e) &&
      !e.includes("Download the React DevTools")
  )
  expect(consoleIssues, `console errors: ${consoleIssues.join("; ")}`).toEqual([])

  const networkIssues = runtime.failedRequests.filter(
    (r) =>
      !r.includes("favicon") &&
      !r.includes("404") &&
      !r.includes("ERR_ABORTED")
  )
  expect(networkIssues, `failed requests: ${networkIssues.join("; ")}`).toEqual([])
}

async function loginViaDemo(page: Page, accountName: string) {
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.locator('[data-ready="true"]').waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: new RegExp(accountName) }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 })
  await expect(page.getByRole("heading", { name: "داشبورد" })).toBeVisible({ timeout: 15_000 })
}

async function logout(page: Page) {
  await page.getByRole("button").filter({ has: page.locator(".rounded-full") }).first().click()
  await page.getByRole("menuitem", { name: "خروج" }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
}

async function bootstrapWorkspaceAndProject(page: Page) {
  await page.goto("/workspaces", { waitUntil: "networkidle" })
  await expect(page.getByRole("heading", { name: "فضاهای کاری" })).toBeVisible({ timeout: 15_000 })

  const workspaceLink = page.locator('.grid a[href^="/workspaces/"]').first()
  await expect(workspaceLink).toBeVisible({ timeout: 15_000 })
  const workspaceHref = await workspaceLink.getAttribute("href")
  expect(workspaceHref).toMatch(new RegExp(`^/workspaces/${UUID_RE.source}`))
  const workspaceId = workspaceHref!.split("/workspaces/")[1]!.split("/")[0]!
  expect(workspaceId).not.toMatch(/ws-1|proj-1/)

  await page.goto(`/workspaces/${workspaceId}/projects`, { waitUntil: "networkidle" })
  const projectLinks = page.locator(`main a[href^="/workspaces/${workspaceId}/projects/"]`)
  const projectCount = await projectLinks.count()
  let projectHref: string | null = null
  for (let i = 0; i < projectCount; i++) {
    const href = await projectLinks.nth(i).getAttribute("href")
    if (href && /\/projects\/[0-9a-f-]{36}(?:\/|$)/i.test(href)) {
      projectHref = href
      break
    }
  }
  expect(projectHref, "expected a project card link with UUID").toBeTruthy()
  expect(projectHref).toMatch(/\/projects\/[0-9a-f-]{36}/i)
  const projectId = projectHref!.split("/projects/")[1]!.split("/")[0]!
  expect(projectId).not.toMatch(/proj-1/)

  return { workspaceId, projectId }
}

test.describe("real backend integration", () => {
  test("owner login, UUID bootstrap, protected reload, logout", async ({ page }) => {
    const runtime = trackRuntime(page)

    await loginViaDemo(page, "ادمین سیستم")
    const { workspaceId, projectId } = await bootstrapWorkspaceAndProject(page)

    const deepLink = `/workspaces/${workspaceId}/projects/${projectId}/list`
    await page.goto(deepLink, { waitUntil: "networkidle" })
    await expect(page).toHaveURL(new RegExp(deepLink.replace(/\//g, "\\/")))
    await page.reload({ waitUntil: "networkidle" })
    await expect(page).toHaveURL(new RegExp(deepLink.replace(/\//g, "\\/")))

    await page.screenshot({
      path: `e2e/screenshots/journey-owner-${test.info().project.name}.png`,
      fullPage: true,
    })

    await logout(page)
    await page.goto(deepLink)
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })

    assertCleanRuntime(runtime)
  })

  test("member task mutation succeeds; guest mutation denied", async ({ browser }) => {
    const memberContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const memberPage = await memberContext.newPage()
    const guestPage = await guestContext.newPage()
    const memberRuntime = trackRuntime(memberPage)

    await loginViaDemo(memberPage, "سارا رضایی")
    const { workspaceId, projectId } = await bootstrapWorkspaceAndProject(memberPage)

    await memberPage.goto(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/new`,
      { waitUntil: "networkidle" }
    )
    await expect(memberPage.getByRole("heading", { name: "ایجاد وظیفه" })).toBeVisible({
      timeout: 15_000,
    })
    const taskTitle = `E2E task ${Date.now()}`
    await memberPage.getByLabel("عنوان").fill(taskTitle)
    const createTaskResponse = memberPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/tasks") &&
        res.request().method() === "POST" &&
        res.status() < 500,
      { timeout: 20_000 }
    )
    await memberPage.getByRole("button", { name: "ایجاد وظیفه", exact: true }).click()
    const createResponse = await createTaskResponse
    expect(createResponse.ok(), `task create failed: HTTP ${createResponse.status()}`).toBeTruthy()
    await expect(memberPage).toHaveURL(
      new RegExp(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${UUID_RE.source}`),
      { timeout: 20_000 }
    )

    await loginViaDemo(guestPage, "کسری کریمی")
    await guestPage.goto(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/new`,
      { waitUntil: "networkidle" }
    )
    await guestPage.getByLabel("عنوان").fill(`Guest blocked ${Date.now()}`)
    const guestCreateResponse = guestPage.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/tasks") &&
        res.request().method() === "POST" &&
        res.status() < 500,
      { timeout: 15_000 }
    )
    await guestPage.getByRole("button", { name: "ایجاد وظیفه", exact: true }).click()
    const guestResponse = await guestCreateResponse
    expect(
      guestResponse.status(),
      `guest task create should be denied, got HTTP ${guestResponse.status()}`
    ).toBeGreaterThanOrEqual(403)

    await memberContext.close()
    await guestContext.close()
    assertCleanRuntime(memberRuntime)
  })

  test("workspace list uses backend UUIDs only", async ({ page, request }) => {
    const runtime = trackRuntime(page)
    await loginViaDemo(page, "ادمین سیستم")

    const token = await page.evaluate(() => localStorage.getItem("yadbox.accessToken"))
    expect(token).toBeTruthy()

    const apiWorkspaces = await request.get(`${API}/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(apiWorkspaces.ok()).toBeTruthy()
    const workspaces = (await apiWorkspaces.json()) as Array<{ id: string; name: string }>
    expect(workspaces.length).toBeGreaterThan(0)
    for (const ws of workspaces) {
      expect(ws.id).toMatch(UUID_RE)
      expect(ws.id).not.toMatch(/ws-1/)
    }

    if (workspaces.length >= 2) {
      await page.goto("/workspaces", { waitUntil: "networkidle" })
      await page.getByRole("button", { name: /فضای کاری|فضاهای کاری/i }).first().click()
      await page.getByRole("menuitem").filter({ hasText: workspaces[1]!.name }).click()
      await expect(page).toHaveURL(new RegExp(`/workspaces/${workspaces[1]!.id}`), {
        timeout: 15_000,
      })
    }

    assertCleanRuntime(runtime)
  })
})
