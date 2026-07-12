import { expect, test } from "@playwright/test";

const ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

test("reports show accessible bar details, avatar/list views, and integrated memos", async ({ page }) => {
  const unexpectedMutations: string[] = [];
  const memoPatches: Array<Record<string, unknown>> = [];
  await page.clock.setFixedTime(new Date("2026-07-11T12:00:00-07:00"));

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1) ?? "";
    const json = (value: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(value),
      });

    if (request.method() === "PATCH" && table === "attendance_memos") {
      memoPatches.push(request.postDataJSON() as Record<string, unknown>);
      return route.fulfill({ status: 204, body: "" });
    }

    if (request.method() !== "GET") {
      unexpectedMutations.push(`${request.method()} ${table}`);
      return route.fulfill({ status: 405, contentType: "application/json", body: '{"message":"read only"}' });
    }

    if (table === "teachers") {
      return json([
        {
          id: "teacher-current",
          organization_id: ORGANIZATION_ID,
          name: "가람 선생님",
          photo_data_url: null,
          birth_date: null,
          birth_month: 3,
          birth_day: 4,
          phone: null,
          is_admin: false,
          is_active: true,
          sort_order: 0,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "teacher-admin",
          organization_id: ORGANIZATION_ID,
          name: "하늘 관리자",
          photo_data_url: null,
          birth_date: null,
          birth_month: 5,
          birth_day: 6,
          phone: null,
          is_admin: true,
          is_active: true,
          sort_order: 1,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    }

    if (table === "classes") {
      return json([
        {
          id: "class-seed",
          organization_id: ORGANIZATION_ID,
          name: "새싹반",
          teacher_id: "teacher-current",
          sort_order: 0,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    }

    if (table === "children") {
      return json([
        {
          id: "child-present",
          organization_id: ORGANIZATION_ID,
          class_id: "class-seed",
          name: "김출석",
          photo_data_url: null,
          gender: "female",
          birth_date: "2018-07-15",
          birth_year: 2018,
          birth_month: 7,
          birth_day: 15,
          address: null,
          email: null,
          registered_at: null,
          notes: null,
          is_active: true,
          sort_order: 0,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "child-absent",
          organization_id: ORGANIZATION_ID,
          class_id: "class-seed",
          name: "박큐티",
          photo_data_url: null,
          gender: "male",
          birth_date: "2018-08-20",
          birth_year: 2018,
          birth_month: 8,
          birth_day: 20,
          address: null,
          email: null,
          registered_at: null,
          notes: null,
          is_active: true,
          sort_order: 1,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "child-missing-birthday",
          organization_id: ORGANIZATION_ID,
          class_id: "class-seed",
          name: "최생일미정",
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
          sort_order: 2,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    }

    if (table === "attendance_sessions") {
      return json([
        {
          id: "session-current",
          organization_id: ORGANIZATION_ID,
          session_date: "2026-07-12",
          note: "",
          share_with_pastor: false,
          saved_at: "2026-07-12T18:00:00.000Z",
          created_at: "2026-07-12T18:00:00.000Z",
          updated_at: "2026-07-12T18:00:00.000Z",
        },
        {
          id: "session-july-five",
          organization_id: ORGANIZATION_ID,
          session_date: "2026-07-05",
          note: "",
          share_with_pastor: false,
          saved_at: "2026-07-05T18:00:00.000Z",
          created_at: "2026-07-05T18:00:00.000Z",
          updated_at: "2026-07-05T18:00:00.000Z",
        },
        {
          id: "session-july-one",
          organization_id: ORGANIZATION_ID,
          session_date: "2026-07-01",
          note: "",
          share_with_pastor: false,
          saved_at: "2026-07-01T18:00:00.000Z",
          created_at: "2026-07-01T18:00:00.000Z",
          updated_at: "2026-07-01T18:00:00.000Z",
        },
      ]);
    }

    if (table === "attendance_records") {
      return json([
        {
          id: "record-present",
          organization_id: ORGANIZATION_ID,
          session_id: "session-current",
          child_id: "child-present",
          status: "present",
          qt_completed: true,
          created_at: "2026-07-12T18:00:00.000Z",
          updated_at: "2026-07-12T18:00:00.000Z",
        },
        {
          id: "record-absent",
          organization_id: ORGANIZATION_ID,
          session_id: "session-current",
          child_id: "child-absent",
          status: "absent",
          qt_completed: true,
          created_at: "2026-07-12T18:00:00.000Z",
          updated_at: "2026-07-12T18:00:00.000Z",
        },
        {
          id: "record-present-july-five",
          organization_id: ORGANIZATION_ID,
          session_id: "session-july-five",
          child_id: "child-present",
          status: "present",
          qt_completed: true,
          created_at: "2026-07-05T18:00:00.000Z",
          updated_at: "2026-07-05T18:00:00.000Z",
        },
        {
          id: "record-present-july-one",
          organization_id: ORGANIZATION_ID,
          session_id: "session-july-one",
          child_id: "child-present",
          status: "present",
          qt_completed: true,
          created_at: "2026-07-01T18:00:00.000Z",
          updated_at: "2026-07-01T18:00:00.000Z",
        },
        {
          id: "record-absent-july-five",
          organization_id: ORGANIZATION_ID,
          session_id: "session-july-five",
          child_id: "child-absent",
          status: "absent",
          qt_completed: false,
          created_at: "2026-07-05T18:00:00.000Z",
          updated_at: "2026-07-05T18:00:00.000Z",
        },
      ]);
    }

    if (table === "attendance_memos") {
      return json([
        {
          id: "memo-secret",
          organization_id: ORGANIZATION_ID,
          session_date: "2026-07-12",
          class_id: "class-seed",
          teacher_id: "teacher-admin",
          note: "관리자만 볼 비밀 내용",
          is_secret: true,
          acknowledged_at: null,
          acknowledged_by_teacher_id: null,
          saved_at: "2026-07-12T20:00:00.000Z",
          created_at: "2026-07-12T20:00:00.000Z",
          updated_at: "2026-07-12T20:00:00.000Z",
        },
        {
          id: "memo-public",
          organization_id: ORGANIZATION_ID,
          session_date: "2026-07-05",
          class_id: "class-seed",
          teacher_id: "teacher-current",
          note: "함께 확인할 공개 메모",
          is_secret: false,
          acknowledged_at: null,
          acknowledged_by_teacher_id: null,
          saved_at: "2026-07-05T20:00:00.000Z",
          created_at: "2026-07-05T20:00:00.000Z",
          updated_at: "2026-07-05T20:00:00.000Z",
        },
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `memo-older-${index + 1}`,
          organization_id: ORGANIZATION_ID,
          session_date: `2026-07-0${4 - index}`,
          class_id: "class-seed",
          teacher_id: "teacher-current",
          note: index === 3 ? "가장 오래된 메모" : `이전 공개 메모 ${index + 1}`,
          is_secret: false,
          acknowledged_at: null,
          acknowledged_by_teacher_id: null,
          saved_at: `2026-07-0${4 - index}T20:00:00.000Z`,
          created_at: `2026-07-0${4 - index}T20:00:00.000Z`,
          updated_at: `2026-07-0${4 - index}T20:00:00.000Z`,
        })),
      ]);
    }

    return json([]);
  });

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "선생님 로그인" })).toBeVisible();
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page.getByRole("heading", { name: "통계" })).toBeVisible();
  await expect(page.getByText("주간 출석 기준일")).toHaveCount(0);
  await expect(page.getByText("생일/큐티 월")).toHaveCount(0);
  const weeklyChart = page.getByRole("group", { name: "주별 출석자 막대그래프" });
  const qtChart = page.getByRole("group", { name: "월별 큐티 완료자 막대그래프" });
  const birthdayChart = page.getByRole("group", { name: "월별 생일자 막대그래프" });
  await expect(weeklyChart).toBeVisible();
  await expect(weeklyChart.getByRole("button")).toHaveCount(4);
  await expect(qtChart.getByRole("button")).toHaveCount(4);
  await expect(birthdayChart.getByRole("button")).toHaveCount(4);

  const attendanceCard = page.getByRole("heading", { name: "주별 출석자" }).locator("..").locator("..");
  await attendanceCard.getByRole("button", { name: "전체", exact: true }).click();
  await expect(attendanceCard.getByRole("img", { name: "주별 출석자 라인 그래프" })).toBeVisible();
  await expect(attendanceCard.getByRole("listitem")).toHaveCount(52);
  await expect(attendanceCard.getByRole("button", { name: /상세 보기/ })).toHaveCount(0);
  await expect(qtChart).toBeVisible();
  await attendanceCard.getByRole("button", { name: "최근", exact: true }).click();

  const qtCard = page.getByRole("heading", { name: "월별 큐티 완료자" }).locator("..").locator("..");
  await qtCard.getByRole("button", { name: "전체", exact: true }).click();
  await expect(qtCard.getByRole("img", { name: "월별 큐티 완료자 라인 그래프" })).toBeVisible();
  await expect(qtCard.getByRole("listitem")).toHaveCount(12);
  await expect(birthdayChart).toBeVisible();
  await qtCard.getByRole("button", { name: "최근", exact: true }).click();

  const birthdayCard = page.getByRole("heading", { name: "월별 생일자" }).locator("..").locator("..");
  await birthdayCard.getByRole("button", { name: "전체", exact: true }).click();
  await expect(birthdayCard.getByRole("img", { name: "월별 생일자 라인 그래프" })).toBeVisible();
  await expect(birthdayCard.getByRole("listitem")).toHaveCount(12);
  await birthdayCard.getByRole("button", { name: "최근", exact: true }).click();

  const attendanceTrigger = page.getByRole("button", { name: "2026년 7월 12일 출석자 1명, 상세 보기" });
  await attendanceTrigger.focus();
  await page.keyboard.press("Enter");
  let dialog = page.getByRole("dialog", { name: "2026년 7월 12일 출석자" });
  const closeButton = dialog.getByRole("button", { name: "통계 상세 닫기" });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "목록" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await expect(dialog.getByRole("img", { name: "김출석 아바타" })).toBeVisible();
  await expect(dialog.getByText("김출석", { exact: true })).toHaveCount(0);
  await expect(dialog.getByText("박큐티", { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "아바타" })).toHaveAttribute("aria-pressed", "true");
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.getByRole("button", { name: "목록" }).click();
  await expect(dialog.getByRole("button", { name: "목록" })).toHaveAttribute("aria-pressed", "true");
  await closeButton.click();
  await expect(attendanceTrigger).toBeFocused();

  await page.getByRole("button", { name: "2026년 7월 큐티 완료자 1명, 상세 보기" }).click();
  dialog = page.getByRole("dialog", { name: "2026년 7월 큐티 완료자" });
  await expect(dialog.getByText("1명 · 총 3회 완료")).toBeVisible();
  await expect(dialog.getByRole("img", { name: "김출석 아바타" })).toBeVisible();
  await expect(dialog.getByText("박큐티", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "통계 상세 닫기" }).click();

  await page.getByRole("button", { name: "7월 생일자 1명, 상세 보기" }).click();
  dialog = page.getByRole("dialog", { name: "7월 생일자" });
  await expect(dialog.getByRole("img", { name: "김출석 아바타" })).toBeVisible();
  await dialog.getByRole("button", { name: "통계 상세 닫기" }).click();

  await page.getByRole("button", { name: "생일 미입력 1명" }).click();
  dialog = page.getByRole("dialog", { name: "생일 미입력 아이" });
  await expect(dialog.getByRole("button", { name: "목록" })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "최생일미정" }).click();
  await expect(page.getByRole("dialog", { name: "최생일미정 상세 정보" })).toBeVisible();
  await page.getByRole("button", { name: "최생일미정 상세 정보 닫기" }).click();
  await dialog.getByRole("button", { name: "통계 상세 닫기" }).click();

  const memos = page.getByRole("region", { name: "선생님 통합 메모" });
  await expect(memos.getByText("함께 확인할 공개 메모")).toBeVisible();
  await expect(memos.getByText("비밀 메모입니다.")).toBeVisible();
  await expect(memos.getByText("관리자만 볼 비밀 내용")).toHaveCount(0);
  await expect(memos.locator("article")).toHaveCount(5);
  await expect(memos.locator("article").first()).toContainText("비밀 메모입니다.");
  await memos.getByRole("button", { name: "다음" }).click();
  await expect(memos.getByText("가장 오래된 메모")).toBeVisible();

  await page.evaluate(() => window.localStorage.setItem("seed-current-teacher-v1", "teacher-admin"));
  await page.reload();
  const adminMemos = page.getByRole("region", { name: "선생님 통합 메모" });
  await expect(adminMemos.getByText("관리자만 볼 비밀 내용")).toBeVisible();
  await expect(adminMemos.getByText("미확인 6개")).toBeVisible();
  await adminMemos
    .getByRole("checkbox", { name: "2026년 7월 12일 새싹반 하늘 관리자 메모 확인" })
    .click();
  await expect(adminMemos.getByText("미확인 5개")).toBeVisible();
  expect(memoPatches).toHaveLength(1);
  expect(memoPatches[0]).toMatchObject({ acknowledged_by_teacher_id: "teacher-admin" });
  expect(typeof memoPatches[0].acknowledged_at).toBe("string");

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
  expect(unexpectedMutations).toEqual([]);
});
