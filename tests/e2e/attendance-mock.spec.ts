import { expect, test } from "@playwright/test";

const ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

test("mobile WebKit saves attendance rows immediately and memo separately", async ({ page }) => {
  const mutations: Array<{ method: string; table: string; body: unknown }> = [];
  let shouldFailRecordUpsert = true;
  let shouldFailNoteUpsert = true;

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
            is_admin: true,
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
          {
            id: "class-other",
            organization_id: ORGANIZATION_ID,
            name: "다른반",
            teacher_id: null,
            sort_order: 1,
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

      if (table === "attendance_memos") {
        return json([]);
      }

      return json([]);
    }

    if (table === "attendance_sessions" && method === "POST") {
      return json({ id: "11111111-1111-4111-8111-111111111111" }, 201);
    }

    const isNoteOnlyRecordUpsert =
      table === "attendance_records" &&
      method === "POST" &&
      typeof body === "object" &&
      body !== null &&
      "note" in body;

    if (isNoteOnlyRecordUpsert && shouldFailNoteUpsert) {
      shouldFailNoteUpsert = false;
      return json({ message: "temporary note failure" }, 500);
    }

    if (table === "attendance_records" && method === "POST" && shouldFailRecordUpsert) {
      shouldFailRecordUpsert = false;
      return json({ message: "temporary failure" }, 500);
    }

    return json([], method === "POST" ? 201 : 200);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/attendance");
  await expect(page.getByRole("heading", { name: "선생님 로그인" })).toBeVisible();
  await expect(page.getByLabel("비밀번호")).toBeDisabled();
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "출석 체크" })).toBeVisible();

  const classSelect = page.getByRole("combobox", { name: "반", exact: true });
  await expect(classSelect).toHaveClass(/border-duo-green/);
  await expect(page.getByText("현재 선택 반", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "이번 주 메모" })).toHaveCount(0);

  const row = page.locator("article").filter({ hasText: "아이폰테스트" });
  await row.getByRole("button", { name: "출석" }).click();
  await expect(row.getByText("저장 실패")).toBeVisible();
  await expect(row.getByRole("button", { name: "출석" })).toHaveAttribute("aria-pressed", "true");

  await row.getByRole("button", { name: "다시 저장" }).click();
  await expect(row.getByText("저장됨")).toBeVisible();

  await row.getByRole("button", { name: "큐티" }).click();
  await expect(row.getByRole("button", { name: "큐티" })).toHaveAttribute("aria-pressed", "true");
  await expect(row.getByText("저장됨")).toBeVisible();

  const childNote = row.getByRole("textbox", { name: "아이 메모", exact: true });
  await childNote.fill("다음 주 교재 전달");
  await row.getByRole("button", { name: "아이폰테스트 아이 메모 저장" }).click();
  await expect(row.getByText("저장하지 못했습니다. 입력 내용은 남아 있습니다.")).toBeVisible();
  await expect(childNote).toHaveValue("다음 주 교재 전달");
  await row.getByRole("button", { name: "아이폰테스트 아이 메모 다시 저장" }).click();
  await expect(row.getByText("아이 메모 저장됨")).toBeVisible();

  const savedNoteInsert = mutations
    .filter(
      (item) =>
        item.method === "POST" &&
        item.table === "attendance_records" &&
        typeof item.body === "object" &&
        item.body !== null &&
        "note" in item.body,
    )
    .at(-1);
  expect(savedNoteInsert?.body).toEqual({
    organization_id: ORGANIZATION_ID,
    session_id: "11111111-1111-4111-8111-111111111111",
    child_id: "child-ios",
    note: "다음 주 교재 전달",
  });

  const savedRecordInsert = mutations
    .filter(
      (item) =>
        item.method === "POST" &&
        item.table === "attendance_records" &&
        typeof item.body === "object" &&
        item.body !== null &&
        !("note" in item.body),
    )
    .at(-1);
  expect(savedRecordInsert?.body).toEqual({
    organization_id: ORGANIZATION_ID,
    session_id: "11111111-1111-4111-8111-111111111111",
    child_id: "child-ios",
    status: "present",
    qt_completed: true,
  });
  expect(mutations.some((item) => item.method !== "GET" && ["teachers", "classes", "children", "child_parents"].includes(item.table))).toBe(
    false,
  );

  const recordMutationCountBeforeMemoSave = mutations.filter(
    (item) => item.method === "POST" && item.table === "attendance_records",
  ).length;
  await classSelect.selectOption("class-ios");
  await expect(classSelect).toHaveValue("class-ios");
  const memoCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "이번 주 메모" }) });
  await memoCard.getByRole("textbox", { name: "이번 주 메모 내용" }).fill("아이폰반 작성 중");
  await classSelect.selectOption("all");
  await expect(classSelect).toHaveValue("all");
  await expect(page.getByRole("heading", { name: "이번 주 메모" })).toHaveCount(0);
  await classSelect.selectOption("class-other");
  await expect(classSelect).toHaveValue("class-other");
  await expect(memoCard.getByRole("textbox", { name: "이번 주 메모 내용" })).toHaveValue("");
  await memoCard.getByRole("textbox", { name: "이번 주 메모 내용" }).fill("다른반 작성 중");
  await classSelect.selectOption("class-ios");
  await expect(classSelect).toHaveValue("class-ios");
  await expect(memoCard.getByRole("textbox", { name: "이번 주 메모 내용" })).toHaveValue("아이폰반 작성 중");
  await classSelect.selectOption("class-other");
  await expect(memoCard.getByRole("textbox", { name: "이번 주 메모 내용" })).toHaveValue("다른반 작성 중");
  await classSelect.selectOption("class-ios");
  await memoCard.getByRole("textbox", { name: "이번 주 메모 내용" }).fill("메모만 저장");
  await memoCard.getByLabel("비밀").check();
  await memoCard.getByRole("button", { name: "저장" }).click();
  await expect(memoCard.getByText("메모 저장됨")).toBeVisible();

  const recordMutationCountAfterMemoSave = mutations.filter(
    (item) => item.method === "POST" && item.table === "attendance_records",
  ).length;
  expect(recordMutationCountAfterMemoSave).toBe(recordMutationCountBeforeMemoSave);
  expect(
    mutations
      .filter((item) => item.method === "POST" && item.table === "attendance_memos")
      .at(-1)?.body,
  ).toMatchObject({
    organization_id: ORGANIZATION_ID,
    class_id: "class-ios",
    teacher_id: "teacher-ios",
    note: "메모만 저장",
    is_secret: true,
  });

  await page.getByRole("button", { name: "월간 현황" }).click();
  await expect(page.getByRole("heading", { name: "주일별 한눈에 보기" })).toBeVisible();
  await page.getByRole("textbox", { name: "월", exact: true }).fill("2026-07");
  const monthlyChild = page.locator("details").filter({ hasText: "아이폰테스트" });
  await monthlyChild.locator("summary").click();
  const pastAttendanceButton = monthlyChild.getByRole("button", {
    name: "아이폰테스트 7월 5일 출석",
  });
  await pastAttendanceButton.click();
  await expect(pastAttendanceButton).toHaveAttribute("aria-pressed", "true");
  await expect(monthlyChild.getByText("저장됨").last()).toBeVisible();

  const monthlyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(monthlyOverflow).toBe(false);

  await page.getByRole("button", { name: /^7월 5일/ }).first().click();
  await expect(page.getByRole("textbox", { name: "날짜", exact: true })).toHaveValue("2026-07-05");
  await expect(page.getByRole("button", { name: "일별 체크" })).toHaveAttribute("aria-pressed", "true");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
