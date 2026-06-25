import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard");
  await page.evaluate(() => window.localStorage.clear());
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
}

test("dashboard opens without login and fits the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "로그인 없이 바로 체크해요" })).toBeVisible();
  await expect(page.getByRole("link", { name: /출석 체크 시작/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("login route redirects to the dashboard", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "로그인 없이 바로 체크해요" })).toBeVisible();
});

test("local-first attendance flow persists and updates reports", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const now = new Date();
  const month = now.getMonth() + 1;
  const childName = `테스트아이${Date.now()}`;

  await page.goto("/children");
  await expect(page.getByText(/저장됨/).first()).toBeVisible();
  await page.getByLabel("이름").fill(childName);
  await page.getByLabel("생일 월").fill(String(month));
  await page.getByLabel("생일 일").fill("15");
  await page.getByRole("button", { name: "아이 저장" }).click();
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/attendance");
  await expect(page.getByText(/저장됨/).first()).toBeVisible();
  const row = page.locator("article").filter({ hasText: childName });
  await row.getByRole("button", { name: "출석" }).click();
  await row.getByRole("button", { name: "큐티" }).click();
  await expect(row.getByRole("button", { name: "출석" })).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByRole("button", { name: "큐티" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  const reloadedRow = page.locator("article").filter({ hasText: childName });
  await expect(reloadedRow.getByRole("button", { name: "출석" })).toHaveAttribute("aria-pressed", "true");
  await expect(reloadedRow.getByRole("button", { name: "큐티" })).toHaveAttribute("aria-pressed", "true");
  await expectNoHorizontalOverflow(page);

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: `${month}월 생일자` })).toBeVisible();
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();
  await expect(page.getByText("총 1회")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
