import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createDefaultFamilyOpenStore } from "@/lib/family/default-store";
import { LEGACY_LOCAL_STORE_KEY } from "@/lib/family/store-persistence";
import { saveFamilyOpenStoreWithClient } from "@/lib/family/supabase-store";
import type { Database } from "@/types/database.generated";

test.beforeEach(async ({ page }) => {
  await resetRemoteStore();
  await page.goto("/dashboard");
  await page.evaluate((legacyLocalStoreKey) => {
    window.localStorage.clear();
    window.localStorage.setItem(legacyLocalStoreKey, "legacy");
  }, LEGACY_LOCAL_STORE_KEY);
  await page.reload();
  await loginAsFirstTeacher(page);
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
  const result = await saveFamilyOpenStoreWithClient(supabase, createDefaultFamilyOpenStore());

  if (!result.ok) {
    throw new Error(`Supabase 테스트 상태 초기화 실패: ${result.message}`);
  }
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
}

async function expectNoAppStateLocalStorage(page: import("@playwright/test").Page) {
  const storedState = await page.evaluate(
    (legacyLocalStoreKey) => window.localStorage.getItem(legacyLocalStoreKey),
    LEGACY_LOCAL_STORE_KEY,
  );
  expect(storedState).toBeNull();
}

async function expectTeacherLoginCached(page: import("@playwright/test").Page) {
  const cachedTeacherId = await page.evaluate(() => window.localStorage.getItem("seed-current-teacher-v1"));
  expect(cachedTeacherId).toBeTruthy();
}

async function loginAsFirstTeacher(page: import("@playwright/test").Page) {
  await expect(page.getByRole("heading", { name: "선생님 로그인" })).toBeVisible();
  await expect(page.getByLabel("비밀번호")).toBeDisabled();
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "선생님 로그인" })).toHaveCount(0);
}

async function waitForSaved(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
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

test("dashboard opens after teacher login and fits the mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Seed" })).toBeVisible();
  await expect(page.getByText("Sunday School", { exact: true })).toHaveCount(0);
  await expect(page.locator("a[href^='/attendance?classId=']")).toHaveCount(2);
  await expect(page.locator("nav")).toBeVisible();
  await expect(page.getByRole("heading", { name: "반 등록" })).toHaveCount(0);
  await expectNoAppStateLocalStorage(page);
  await expectTeacherLoginCached(page);
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
  await expectNoAppStateLocalStorage(page);
  await expect(page.getByRole("heading", { name: "등록된 선생님 2명" })).toBeVisible();

  await page.getByRole("button", { name: "선생님 등록" }).click();
  await fillTeacherDialog(page, { name: teacherName, month: "1", day: "10", phone: "604-000-0000" });
  await expect(page.getByRole("heading", { name: teacherName })).toBeVisible();
  await waitForSaved(page);

  await page.getByRole("button", { name: `${teacherName} 상세정보 열기` }).click();
  await fillTeacherDialog(page, { name: editedTeacherName, month: "2", day: "20", phone: "604-111-1111" });
  await expect(page.getByRole("heading", { name: editedTeacherName })).toBeVisible();
  await expect(page.getByText("2월 20일 · 604-111-1111")).toBeVisible();

  await page.getByRole("button", { name: "선생님 등록" }).click();
  await fillTeacherDialog(page, { name: tempTeacherName, month: "3", day: "5", phone: "604-222-2222" });
  await expect(page.getByRole("heading", { name: tempTeacherName })).toBeVisible();
  await page.getByRole("button", { name: `${tempTeacherName} 상세정보 열기` }).click();
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
  await page.getByRole("button", { name: `${unassignedClassName} 상세정보 열기` }).click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: unassignedClassName })).toHaveCount(0);

  await addClass(page, { className, teacherName: editedTeacherName });
  await waitForSaved(page);

  await page.getByRole("button", { name: `${className} 상세정보 열기` }).click();
  const classDialog = page.getByRole("dialog");
  await classDialog.getByLabel("반 이름").fill(editedClassName);
  await classDialog.getByRole("button", { name: "반 저장" }).click();
  await expect(page.getByRole("heading", { name: editedClassName })).toBeVisible();

  await addClass(page, { className: tempClassName, teacherName: editedTeacherName });
  await page.getByRole("button", { name: `${tempClassName} 상세정보 열기` }).click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: tempClassName })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: new RegExp(`${editedClassName}.*${editedTeacherName}`) }).click();
  await waitForSaved(page);
  await page.getByLabel("반").selectOption("all");
  await expect(page.getByRole("option", { name: "전체" })).toBeAttached();

  await page.goto("/children");
  await waitForSaved(page);
  await page.locator("header button").click();
  const unassignedChildDialog = page.getByRole("dialog");
  await unassignedChildDialog.getByLabel("이름").fill(unassignedChildName);
  await unassignedChildDialog.getByLabel("성별").selectOption("female");
  await unassignedChildDialog.getByLabel("생년월일").fill(`2018-${String(month).padStart(2, "0")}-10`);
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
  await addChildDialog.getByLabel("이름").fill(childName);
  await addChildDialog.getByLabel("성별").selectOption("female");
  await addChildDialog.getByLabel("생년월일").fill(`2018-${String(month).padStart(2, "0")}-15`);
  await addChildDialog.getByLabel("관계").selectOption("mother");
  await addChildDialog.getByLabel("성함").fill("김나무");
  await addChildDialog.getByLabel("전화번호").fill("010-0000-0000");
  await addChildDialog.getByLabel("주소").fill("테스트 주소");
  await addChildDialog.getByLabel("이메일").fill("parent@example.com");
  await addChildDialog.getByLabel("특이사항").fill("테스트 알러지 없음");
  await addChildDialog.getByLabel("반").selectOption({ label: editedClassName });
  await addChildDialog.locator("button[type='submit']").click();
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();
  const childCard = page.locator("button").filter({ hasText: childName }).first();
  await expect(childCard.getByText("김나무", { exact: true })).toBeVisible();
  await expect(childCard.getByText("보호자 김나무", { exact: true })).toHaveCount(0);
  await expect(childCard.getByText("등록일")).toHaveCount(0);
  await expect(childCard.getByRole("img", { name: `${childName} 아바타` })).toHaveAttribute("data-gender", "female");
  await waitForSaved(page);

  await childCard.click();
  const editChildDialog = page.getByRole("dialog");
  await editChildDialog.locator("textarea").fill("수정된 특이사항");
  await editChildDialog.locator("button[type='submit']").click();
  await expect(page.getByText("수정된 특이사항")).toBeVisible();
  await waitForSaved(page);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: new RegExp(editedClassName) }).click();
  await waitForSaved(page);
  const row = page.locator("article").filter({ hasText: childName });
  await expect(row.getByRole("img", { name: `${childName} 아바타` })).toHaveAttribute("data-gender", "female");
  await expect(row.locator("button[aria-pressed]").nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(row.locator("button[aria-pressed]").nth(1)).toHaveAttribute("aria-pressed", "false");
  await row.locator("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await row.locator("button[aria-pressed]").nth(0).click();
  await expect(row.getByText("저장됨")).toBeVisible();
  await expect(row.locator("button[aria-pressed]").nth(1)).toBeEnabled();
  await row.locator("button[aria-pressed]").nth(1).click();
  await expect(row.locator("button[aria-pressed]").nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(row.locator("button[aria-pressed]").nth(1)).toHaveAttribute("aria-pressed", "true");
  await waitForSaved(page);
  await expect(page.locator("input[type='checkbox']")).not.toBeChecked();
  await page.locator("input[type='checkbox']").check();
  await page.getByRole("button", { name: "저장" }).click();
  await waitForSaved(page);

  await page.reload();
  const reloadedRow = page.locator("article").filter({ hasText: childName });
  await expect(reloadedRow.locator("button[aria-pressed]").nth(0)).toHaveAttribute("aria-pressed", "true");
  await expect(reloadedRow.locator("button[aria-pressed]").nth(1)).toHaveAttribute("aria-pressed", "true");
  await expectNoHorizontalOverflow(page);

  await page.goto("/settings");
  await page.getByRole("button", { name: `${editedClassName} 상세정보 열기` }).click();
  await deleteFromOpenDialog(page);
  await expect(page.getByRole("heading", { name: editedClassName })).toHaveCount(0);
  await waitForSaved(page);
  await page.goto("/children");
  await expect(page.getByRole("heading", { name: childName })).toBeVisible();
});
