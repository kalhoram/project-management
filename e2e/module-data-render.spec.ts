import { test, expect } from "@playwright/test"

async function loginViaDemo(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.locator('[data-ready="true"]').waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: /ادمین سیستم/ }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 })
}

test("sprints and time-tracking render API records when present", async ({ page }) => {
  await loginViaDemo(page)
  await page.goto("/workspaces", { waitUntil: "networkidle" })
  const workspaceHref = await page.locator('.grid a[href^="/workspaces/"]').first().getAttribute("href")
  const workspaceId = workspaceHref!.split("/workspaces/")[1]!.split("/")[0]!

  await page.goto(`/workspaces/${workspaceId}/sprints`, { waitUntil: "networkidle" })
  await expect(page.getByRole("heading", { name: "اسپرینت‌ها" })).toBeVisible()
  const sprintEmpty = page.getByText("اسپرینتی وجود ندارد")
  const sprintTable = page.locator("table tbody tr")
  const hasSprintData = (await sprintTable.count()) > 0
  const hasSprintEmpty = await sprintEmpty.isVisible().catch(() => false)
  expect(hasSprintData || hasSprintEmpty).toBe(true)
  if (hasSprintData) {
    await expect(sprintTable.first()).toBeVisible()
  }

  await page.goto(`/workspaces/${workspaceId}/time-tracking`, { waitUntil: "networkidle" })
  await expect(page.getByRole("heading", { name: "ردیابی زمان" })).toBeVisible()
  const timeEmpty = page.getByText("زمانی ثبت نشده")
  const timeTable = page.locator("table tbody tr")
  const hasTimeData = (await timeTable.count()) > 0
  const hasTimeEmpty = await timeEmpty.isVisible().catch(() => false)
  expect(hasTimeData || hasTimeEmpty).toBe(true)
})
