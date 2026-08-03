import { test, expect, type Page } from "@playwright/test"

const CRASH_TEXT = /couldn[\u2019']t load|Reload to try again|This page/i
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

type RuntimeTracker = {
  consoleErrors: string[]
  failedRequests: string[]
}

function trackRuntime(page: Page): RuntimeTracker {
  const runtime: RuntimeTracker = { consoleErrors: [], failedRequests: [] }

  page.on("console", (msg) => {
    if (msg.type() === "error") runtime.consoleErrors.push(msg.text())
  })

  page.on("requestfailed", (req) => {
    runtime.failedRequests.push(
      `${req.method()} ${req.url()} :: ${req.failure()?.errorText ?? "failed"}`
    )
  })

  page.on("response", (res) => {
    const url = res.url()
    if (
      res.status() >= 400 &&
      url.includes("127.0.0.1:8000") &&
      !url.includes("/favicon")
    ) {
      runtime.failedRequests.push(
        `${res.request().method()} ${url} :: HTTP ${res.status()}`
      )
    }
  })

  return runtime
}

function assertCleanRuntime(runtime: RuntimeTracker, route: string) {
  const consoleIssues = runtime.consoleErrors.filter(
    (entry) =>
      !entry.includes("favicon") &&
      !entry.includes("404") &&
      !/hydration/i.test(entry) &&
      !entry.includes("Download the React DevTools")
  )
  expect(consoleIssues, `[${route}] console: ${consoleIssues.join("; ")}`).toEqual([])

  const networkIssues = runtime.failedRequests.filter(
    (entry) =>
      !entry.includes("favicon") &&
      !entry.includes("404") &&
      !entry.includes("ERR_ABORTED")
  )
  expect(networkIssues, `[${route}] network: ${networkIssues.join("; ")}`).toEqual([])
}

async function loginViaDemo(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.locator('[data-ready="true"]').waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: /ادمین سیستم/ }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 })
}

async function bootstrapIds(page: Page) {
  await page.goto("/workspaces", { waitUntil: "networkidle" })
  const workspaceLink = page.locator('.grid a[href^="/workspaces/"]').first()
  await expect(workspaceLink).toBeVisible({ timeout: 15_000 })
  const workspaceHref = await workspaceLink.getAttribute("href")
  expect(workspaceHref).toMatch(new RegExp(`^/workspaces/${UUID_RE.source}`))
  const workspaceId = workspaceHref!.split("/workspaces/")[1]!.split("/")[0]!

  await page.goto(`/workspaces/${workspaceId}/projects`, { waitUntil: "networkidle" })
  const projectLinks = page.locator(`main a[href^="/workspaces/${workspaceId}/projects/"]`)
  const count = await projectLinks.count()
  let projectId = ""
  for (let i = 0; i < count; i++) {
    const href = await projectLinks.nth(i).getAttribute("href")
    if (href && /\/projects\/[0-9a-f-]{36}(?:\/|$)/i.test(href)) {
      projectId = href.split("/projects/")[1]!.split("/")[0]!
      break
    }
  }
  expect(projectId).toMatch(UUID_RE)
  return { workspaceId, projectId }
}

function buildRoutes(workspaceId: string, projectId: string) {
  return [
    { path: "/dashboard", label: "داشبورد" },
    { path: "/workspaces", label: "فضاهای کاری" },
    { path: `/workspaces/${workspaceId}`, label: "داشبورد فضای کاری" },
    { path: `/workspaces/${workspaceId}/capacity`, label: "ظرفیت" },
    { path: `/workspaces/${workspaceId}/approvals`, label: "تأییدها" },
    { path: `/workspaces/${workspaceId}/projects`, label: "پروژه‌ها" },
    { path: `/workspaces/${workspaceId}/members`, label: "اعضا" },
    { path: `/workspaces/${workspaceId}/files`, label: "فایل‌ها" },
    { path: `/workspaces/${workspaceId}/sprints`, label: "اسپرینت‌ها" },
    { path: `/workspaces/${workspaceId}/roadmap`, label: "نقشه راه" },
    { path: `/workspaces/${workspaceId}/okr`, label: "اهداف کلیدی" },
    { path: `/workspaces/${workspaceId}/time-tracking`, label: "ثبت زمان" },
    { path: `/workspaces/${workspaceId}/estimation`, label: "برآورد" },
    { path: `/workspaces/${workspaceId}/settings`, label: "تنظیمات" },
    { path: `/workspaces/${workspaceId}/projects/${projectId}`, label: "جزئیات پروژه" },
    { path: `/workspaces/${workspaceId}/projects/${projectId}/list`, label: "لیست وظایف" },
    { path: `/workspaces/${workspaceId}/projects/${projectId}/kanban`, label: "کانبان" },
    { path: `/workspaces/${workspaceId}/projects/${projectId}/reports`, label: "گزارش‌های پروژه" },
    { path: "/activity", label: "فعالیت‌ها" },
    { path: "/notifications", label: "اعلان‌ها" },
    { path: "/search", label: "جستجو" },
  ]
}

test.describe("page runtime smoke", () => {
  test("primary routes render without crash boundary", async ({ page }, testInfo) => {
    const runtime = trackRuntime(page)
    await loginViaDemo(page)
    const { workspaceId, projectId } = await bootstrapIds(page)
    const routes = buildRoutes(workspaceId, projectId)

    for (const route of routes) {
      await test.step(route.path, async () => {
        await page.goto(route.path, { waitUntil: "networkidle" })
        await expect(page.locator("body"), `${route.path} crash boundary`).not.toContainText(
          CRASH_TEXT
        )
        await expect(page.getByRole("main"), `${route.path} main landmark`).toBeVisible({
          timeout: 15_000,
        })

        const heading = page.getByRole("heading").first()
        await expect(heading, `${route.path} heading`).toBeVisible({ timeout: 15_000 })

        await page.screenshot({
          path: `e2e/screenshots/runtime-${route.path.replace(/\//g, "_")}-${testInfo.project.name}.png`,
          fullPage: true,
        })
      })
    }

    assertCleanRuntime(runtime, "all-routes")
  })
})
