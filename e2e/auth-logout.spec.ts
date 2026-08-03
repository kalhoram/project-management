import { test, expect } from "@playwright/test"

const API = process.env.PLAYWRIGHT_API_URL ?? "http://127.0.0.1:8000/api/v1"

async function seedAuthSession(page: import("@playwright/test").Page) {
  const response = await page.request.post(`${API}/auth/login`, {
    data: { identifier: "admin", password: "123/321" },
  })
  expect(response.ok(), `login API failed: HTTP ${response.status()}`).toBeTruthy()
  const data = await response.json()
  const accessToken = data.accessToken as string
  const refreshToken = data.refreshToken as string
  const expiresIn = data.expiresIn as number | undefined
  const userId = data.user?.id as string | undefined

  await page.addInitScript(
    ({ accessToken, refreshToken, expiresIn, userId }) => {
      localStorage.setItem("yadbox.accessToken", accessToken)
      localStorage.setItem("yadbox.refreshToken", refreshToken)
      if (expiresIn) {
        localStorage.setItem("yadbox.tokenExpiresAt", String(Date.now() + expiresIn * 1000))
      }
      if (userId) {
        localStorage.setItem("yadbox.currentUserId", userId)
      }
    },
    { accessToken, refreshToken, expiresIn, userId }
  )
}

test.describe("auth logout", () => {
  test("dashboard logout redirects to login without error state", async ({ page }) => {
    await seedAuthSession(page)
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/v1/auth/me") && res.status() === 200,
        { timeout: 30_000 }
      ),
      page.goto("/dashboard", { waitUntil: "domcontentloaded" }),
    ])
    await expect(
      page.getByRole("button").filter({ has: page.locator(".rounded-full") }).first()
    ).toBeVisible({ timeout: 25_000 })

    await page.getByRole("button").filter({ has: page.locator(".rounded-full") }).first().click()
    await page.getByRole("menuitem", { name: "خروج" }).click()

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
    await expect(page.getByText("خطایی رخ داد")).toHaveCount(0)

    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })
})
