import { test, expect } from "@playwright/test"

async function loginViaDemo(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.locator('[data-ready="true"]').waitFor({ timeout: 30_000 })
  await page.getByRole("button", { name: /ادمین سیستم/ }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 25_000 })
}

const PLATFORM_FILES = [
  "مستند نیازمندی‌های پلتفرم یادباکس.pdf",
  "طرح معماری فنی پلتفرم یادباکس.pdf",
  "گزارش تست ماژول پروژه‌ها.xlsx",
  "راهنمای استقرار نسخه دمو.docx",
]

const MOBILE_FILES = [
  "وایرفریم اپلیکیشن موبایل یادباکس.fig",
  "سناریوهای تست ورود و ثبت‌نام.xlsx",
  "راهنمای طراحی رابط کاربری موبایل.pdf",
  "گزارش بازبینی نسخه آزمایشی.docx",
]

test("project files pages show seeded Persian filenames", async ({ page }) => {
  await loginViaDemo(page)
  await page.goto("/workspaces", { waitUntil: "networkidle" })
  const workspaceHref = await page.locator('.grid a[href^="/workspaces/"]').first().getAttribute("href")
  const workspaceId = workspaceHref!.split("/workspaces/")[1]!.split("/")[0]!

  await page.goto(`/workspaces/${workspaceId}/projects`, { waitUntil: "networkidle" })
  const platformLink = page.getByRole("link", { name: /پلتفرم یادباکس/ }).first()
  const mobileLink = page.getByRole("link", { name: /اپلیکیشن موبایل یادباکس/ }).first()
  await expect(platformLink).toBeVisible()
  await expect(mobileLink).toBeVisible()

  const platformHref = await platformLink.getAttribute("href")
  const mobileHref = await mobileLink.getAttribute("href")
  const platformProjectId = platformHref!.split("/projects/")[1]!.split("/")[0]!
  const mobileProjectId = mobileHref!.split("/projects/")[1]!.split("/")[0]!

  await page.goto(`/workspaces/${workspaceId}/projects/${platformProjectId}/files`, {
    waitUntil: "networkidle",
  })
  await expect(page.getByText("فایلی وجود ندارد")).not.toBeVisible()
  await expect(page.getByText("هنوز فایلی نیست")).not.toBeVisible()
  for (const name of PLATFORM_FILES) {
    await expect(page.getByText(name)).toBeVisible()
  }

  await page.goto(`/workspaces/${workspaceId}/projects/${mobileProjectId}/files`, {
    waitUntil: "networkidle",
  })
  await expect(page.getByText("فایلی وجود ندارد")).not.toBeVisible()
  await expect(page.getByText("هنوز فایلی نیست")).not.toBeVisible()
  for (const name of MOBILE_FILES) {
    await expect(page.getByText(name)).toBeVisible()
  }
})
