import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createDefaultFamilyOpenStore } from "@/lib/family/default-store";
import type { Database, Json } from "@/types/database.generated";

test.beforeEach(async ({ page }) => {
  await resetRemoteStore();
  await page.goto("/dashboard");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

function readLocalEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const [key, ...value] = line.split("=");
        return [key, value.join("=")];
      }),
  );
}

async function resetRemoteStore() {
  const localEnv = readLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await supabase.from("family_open_app_state").upsert({
    id: "default",
    state: createDefaultFamilyOpenStore() as unknown as Json,
  });

  if (error) {
    throw new Error(`Supabase 테스트 상태 초기화 실패: ${error.message}`);
  }
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
}

async function waitForSaved(page: import("@playwright/test").Page) {
  await expect(page.getByText("저장됨").first()).toBeVisible();
}

function acceptNextConfirm(page: import("@playwright/test").Page) {
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
}

async function deleteFromOpenDialog(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog");
  acceptNextConfirm(page);
  await dialog.locator("button").last().click();
}

async function fillTeacherDialog(
  page: import("@playwright/test").Page,
  input: { name: string; month: string; day: string; phone: string },
) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("이름").fill(input.name);
  await dialog.getByLabel("생일 월").selectOption(input.month);
  await dialog.getByLabel("생일 일").selectOption(input.day);
  await dialog.getByLabel("전화번호").fill(input.phone);
  await dialog.getByRole("button", { name: "선생님 저장" }).click();
}

async function addClass(
  page: import("@playwright/test").Page,
  input: { className: string; teacherName: string },
) {
  await page.getByLabel("반 이름").fill(input.className);
  await page.getByLabel("담임 선생님").selectOption({ label: input.teacherName });
  await page.getByRole("button", { name: "반 등록" }).click();
  await expect(page.getByRole("heading", { name: input.className })).toBeVisible();
}

test("dashboard opens without login and fits the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("a[href^='/attendance?classId=']")).toHaveCount(2);
  await expect(page.locator("nav")).toBeVisible();
  await expect(page.getByRole("heading", { name: "반 등록" })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("login route redirects to the dashboard", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator("a[href^='/attendance?classId=']")).toHaveCount(2);
});

test("Supabase-backed attendance flow supports teacher and class management", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const now = new Date();
  const month = now.getMonth() + 1;
  const stamp = Date.now();
  const unassignedChildName = `unassigned-child-${stamp}`;
  const unassignedClassName = `unassigned-class-${stamp}`;
  const childName = `테스트아이${stamp}`;
  const teacherName = `테스트선생님${stamp}`;
  const editedTeacherName = `수정선생님${stamp}`;
  const tempTeacherName = `삭제선생님${stamp}`;
  const className = `테스트반${stamp}`;
  const editedClassName = `수정반${stamp}`;
  const tempClassName = `삭제반${stamp}`;

  await page.goto("/teachers");
  await waitForSaved(page);

  await page.getByRole("button", { name: "선생님 등록" }).click();
  await fillTeacherDialog(page, { name: teacherName, month: "1", day: "10", phone: "604-000-0000" });
  await expect(page.getByRole("heading", { name: teacherName })).toBeVisible();
  await waitForSaved(page);

  await page.getByRole("button", { name: `${teacherName} 수정` }).click();
  await fillTeacherDialog(page, { name: editedTeacherName, month: "2", day: "20", phone: "604-111-1111" });
  await expect(page.getByRole("heading", { name: editedTeacherName })).toBeVisible();
  await expect(page.getByText("2월 20일 · 604-111-1111")).toBeVisible();

  await page.getByRole("button", { name: "선생님 등록" }).click();
  await fillTeacherDialog(page, { name: tempTeacherName, month: "3", day: "5", phone: "604-222-2222" });
  await expect(page.getByRole("heading", { name: tempTeacherName })).toBeVisible();
  await page.getByRole("button", { name: `${tempTeacherName} 수정` }).click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: tempTeacherName })).toHaveCount(0);

  await page.goto("/settings");
  await waitForSaved(page);
  const classForm = page.locator("form").first();
  await classForm.locator("input").fill(unassignedClassName);
  await classForm.locator("button[type='submit']").click();
  await expect(page.getByRole("heading", { name: unassignedClassName })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: unassignedClassName })).toBeVisible();
  await page.getByRole("button", { name: `${unassignedClassName} 수정` }).click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: unassignedClassName })).toHaveCount(0);

  await addClass(page, { className, teacherName: editedTeacherName });
  await waitForSaved(page);

  await page.getByRole("button", { name: `${className} 수정` }).click();
  const classDialog = page.getByRole("dialog");
  await classDialog.getByLabel("반 이름").fill(editedClassName);
  await classDialog.getByRole("button", { name: "반 저장" }).click();
  await expect(page.getByRole("heading", { name: editedClassName })).toBeVisible();

  await addClass(page, { className: tempClassName, teacherName: editedTeacherName });
  await page.getByRole("button", { name: `${tempClassName} 수정` }).click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: tempClassName })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: new RegExp(`${editedClassName}.*${editedTeacherName}`) }).click();
  await waitForSaved(page);

  await page.goto("/children");
  await waitForSaved(page);
  await page.locator("header button").click();
  const unassignedChildDialog = page.getByRole("dialog");
  await unassignedChildDialog.locator("input").nth(1).fill(unassignedChildName);
  await unassignedChildDialog.locator("select").nth(0).selectOption("female");
  await unassignedChildDialog.locator("input[type='date']").nth(0).fill(`2018-${String(month).padStart(2, "0")}-10`);
  await unassignedChildDialog.locator("button[type='submit']").click();
  await expect(page.getByRole("heading", { name: unassignedChildName })).toBeVisible();
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: unassignedChildName })).toBeVisible();
  await page.locator("button").filter({ hasText: unassignedChildName }).first().click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: unassignedChildName })).toHaveCount(0);
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: unassignedChildName })).toHaveCount(0);

  await page.locator("header button").click();
  const addChildDialog = page.getByRole("dialog");
  await addChildDialog.locator("input").nth(1).fill(childName);
  await addChildDialog.locator("select").nth(0).selectOption("female");
  await addChildDialog.locator("input[type='date']").nth(0).fill(`2018-${String(month).padStart(2, "0")}-15`);
  await addChildDialog.locator("input").nth(4).fill("테스트 보호자");
  await addChildDialog.locator("input").nth(5).fill("010-0000-0000");
  await addChildDialog.locator("input").nth(6).fill("테스트 주소");
  await addChildDialog.locator("input").nth(7).fill("parent@example.com");
  await addChildDialog.locator("textarea").fill("테스트 알러지 없음");
  await addChildDialog.locator("select").nth(1).selectOption({ label: editedClassName });
  await addChildDialog.locator("button[type='submit']").click();
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();
  await waitForSaved(page);

  await page.locator("button").filter({ hasText: childName }).first().click();
  const editChildDialog = page.getByRole("dialog");
  await editChildDialog.locator("textarea").fill("수정된 특이사항");
  await editChildDialog.locator("button[type='submit']").click();
  await expect(page.getByText("수정된 특이사항")).toBeVisible();
  await waitForSaved(page);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: new RegExp(editedClassName) }).click();
  await waitForSaved(page);
  const row = page.locator("article").filter({ hasText: childName });
  await expect(row.locator("button[aria-pressed]").nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(row.locator("button[aria-pressed]").nth(1)).toHaveAttribute("aria-pressed", "false");
  await row.locator("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await row.locator("button[aria-pressed]").nth(0).click();
  await row.locator("button[aria-pressed]").nth(1).click();
  await expect(row.locator("button[aria-pressed]").nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(row.locator("button[aria-pressed]").nth(1)).toHaveAttribute("aria-pressed", "true");
  await page.locator("input[type='checkbox']").check();
  await page.locator("main").locator("button").last().click();
  await waitForSaved(page);

  await page.reload();
  const reloadedRow = page.locator("article").filter({ hasText: childName });
  await expect(reloadedRow.locator("button[aria-pressed]").nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(reloadedRow.locator("button[aria-pressed]").nth(1)).toHaveAttribute("aria-pressed", "true");
  await expectNoHorizontalOverflow(page);

  await page.goto("/settings");
  await page.getByRole("button", { name: `${editedClassName} 수정` }).click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: editedClassName })).toHaveCount(0);
  await waitForSaved(page);
  await page.goto("/children");
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();
});
