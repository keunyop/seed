import { expect, test } from "@playwright/test";

const ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

test("mobile WebKit keeps attendance edits after a failed scoped save and retries", async ({ page }) => {
  const mutations: Array<{ method: string; table: string; body: unknown }> = [];
  let shouldFailRecordInsert = true;

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1) ?? "";
    const method = request.method();
    let body: unknown = null;
    try {
      body = request.postDataJSON();
    } catch {
      body = null;
    }

    if (method !== "GET") {
      mutations.push({ method, table, body });
    }

    const json = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
      });

    if (method === "GET") {
      if (table === "teachers") {
        return json([
          {
            id: "teacher-ios",
            organization_id: ORGANIZATION_ID,
            name: "아이폰 선생님",
            photo_data_url: null,
            birth_date: null,
            birth_month: 1,
            birth_day: 1,
            phone: null,
            is_active: true,
            sort_order: 0,
            created_at: "2026-06-28T00:00:00.000Z",
            updated_at: "2026-06-28T00:00:00.000Z",
          },
        ]);
      }

      if (table === "classes") {
        return json([
          {
            id: "class-ios",
            organization_id: ORGANIZATION_ID,
            name: "아이폰반",
            teacher_id: "teacher-ios",
            sort_order: 0,
            created_at: "2026-06-28T00:00:00.000Z",
            updated_at: "2026-06-28T00:00:00.000Z",
          },
        ]);
      }

      if (table === "children") {
        return json([
          {
            id: "child-ios",
            organization_id: ORGANIZATION_ID,
            class_id: "class-ios",
            name: "아이폰테스트",
            photo_data_url: null,
            gender: "unspecified",
            birth_date: null,
            birth_year: null,
            birth_month: null,
            birth_day: null,
            address: null,
            email: null,
            registered_at: null,
            notes: null,
            is_active: true,
            sort_order: 0,
            created_at: "2026-06-28T00:00:00.000Z",
            updated_at: "2026-06-28T00:00:00.000Z",
          },
        ]);
      }

      return json([]);
    }

    if (table === "attendance_sessions" && method === "POST") {
      return json({ id: "11111111-1111-4111-8111-111111111111" }, 201);
    }

    if (table === "attendance_records" && method === "POST" && shouldFailRecordInsert) {
      shouldFailRecordInsert = false;
      return json({ message: "temporary failure" }, 500);
    }

    return json([], method === "POST" ? 201 : 200);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/attendance");
  await expect(page.getByRole("heading", { name: "출석 체크" })).toBeVisible();

  const row = page.locator("article").filter({ hasText: "아이폰테스트" });
  await row.getByRole("button", { name: "출석" }).click();
  await row.getByRole("button", { name: "큐티" }).click();
  await expect(page.getByText("변경 있음")).toBeVisible();

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장하지 못했습니다. 변경 내용은 남아 있습니다.")).toBeVisible();
  await expect(page.getByRole("button", { name: "저장" })).toBeEnabled();
  await expect(row.getByRole("button", { name: "출석" })).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByRole("button", { name: "큐티" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장됨")).toBeVisible();

  const savedRecordInsert = mutations
    .filter((item) => item.method === "POST" && item.table === "attendance_records")
    .at(-1);
  expect(savedRecordInsert?.body).toEqual([
    {
      organization_id: ORGANIZATION_ID,
      session_id: "11111111-1111-4111-8111-111111111111",
      child_id: "child-ios",
      status: "present",
      qt_completed: true,
    },
  ]);
  expect(mutations.some((item) => item.method !== "GET" && ["teachers", "classes", "children", "child_parents"].includes(item.table))).toBe(
    false,
  );

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
