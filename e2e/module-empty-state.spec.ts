import { test, expect } from "@playwright/test"

const MODULE_PAGES = [
  { path: "sprints", api: "sprints", emptyText: /اسپرینتی وجود ندارد|اسپرینت/i },
  { path: "roadmap", api: "roadmap", emptyText: /موردی در نقشه راه نیست|نقشه راه/i },
  { path: "okr", api: "okrs", emptyText: /هدفی تعریف نشده|اهداف کلیدی/i },
  { path: "time-tracking", api: "time-entries", emptyText: /زمانی ثبت نشده|ردیابی زمان/i },
] as const

async function loginViaDemo(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.locator('[data-ready="true"]').waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: /ادمین سیستم/ }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 })
}

test.describe("advanced module pages network + UI", () => {
  test("capture API calls and visible state", async ({ page }, testInfo) => {
    await loginViaDemo(page)
    await page.goto("/workspaces", { waitUntil: "networkidle" })
    const workspaceHref = await page.locator('.grid a[href^="/workspaces/"]').first().getAttribute("href")
    expect(workspaceHref).toBeTruthy()
    const workspaceId = workspaceHref!.split("/workspaces/")[1]!.split("/")[0]!

    const evidence: string[] = []

    for (const mod of MODULE_PAGES) {
      const apiCalls: Array<{ url: string; status: number; count: number | null }> = []
      const handler = async (res: import("@playwright/test").Response) => {
        const url = res.url()
        if (url.includes(`/workspaces/${workspaceId}/${mod.api}`)) {
          let count: number | null = null
          try {
            const body = await res.json()
            count = Array.isArray(body) ? body.length : null
          } catch {
            count = null
          }
          apiCalls.push({ url, status: res.status(), count })
        }
      }
      page.on("response", handler)

      await page.goto(`/workspaces/${workspaceId}/${mod.path}`, { waitUntil: "networkidle" })
      await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 })

      const bodyText = await page.locator("main").innerText()
      const hasEmpty = /وجود ندارد|تعریف نشده|ثبت نشده|نیست/.test(bodyText)
      const tableRows = await page.locator("table tbody tr").count()
      const cards = await page.locator("main .rounded-sm.border, main [class*='Card']").count()

      evidence.push(
        [
          mod.path,
          `apiFired=${apiCalls.length > 0}`,
          `status=${apiCalls[0]?.status ?? "none"}`,
          `count=${apiCalls[0]?.count ?? "n/a"}`,
          `emptyState=${hasEmpty}`,
          `tableRows=${tableRows}`,
          `cards=${cards}`,
        ].join(" | ")
      )

      page.off("response", handler)
    }

    testInfo.attach("module-evidence.txt", {
      body: evidence.join("\n"),
      contentType: "text/plain",
    })

    for (const line of evidence) {
      expect(line).toMatch(/apiFired=true/)
      expect(line).toMatch(/status=200/)
    }
  })
})
