import { expect, test } from "@playwright/test";

const ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

test("an existing child photo autosaves alone and can retry safely on mobile", async ({ page }) => {
  const mutations: Array<{ method: string; table: string; body: Record<string, unknown>; url: URL }> = [];
  let shouldFailPhotoSave = true;

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split("/").at(-1) ?? "";
    const method = request.method();
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });

    if (method === "GET") {
      if (table === "teachers") {
        return json([
          {
            id: "teacher-photo",
            organization_id: ORGANIZATION_ID,
            name: "사진 선생님",
            photo_data_url: null,
            birth_date: null,
            birth_month: 1,
            birth_day: 1,
            phone: null,
            is_admin: true,
            is_active: true,
            sort_order: 0,
            created_at: "2026-07-15T00:00:00.000Z",
            updated_at: "2026-07-15T00:00:00.000Z",
          },
        ]);
      }

      if (table === "classes") {
        return json([
          {
            id: "class-photo",
            organization_id: ORGANIZATION_ID,
            name: "새싹반",
            teacher_id: "teacher-photo",
            sort_order: 0,
            created_at: "2026-07-15T00:00:00.000Z",
            updated_at: "2026-07-15T00:00:00.000Z",
          },
        ]);
      }

      if (table === "children") {
        return json([
          {
            id: "child-photo",
            organization_id: ORGANIZATION_ID,
            class_id: "class-photo",
            name: "김새싹",
            photo_data_url: null,
            gender: "female",
            birth_date: "2018-05-06",
            birth_year: 2018,
            birth_month: 5,
            birth_day: 6,
            address: null,
            email: null,
            registered_at: "2026-07-01",
            notes: null,
            is_active: true,
            sort_order: 0,
            created_at: "2026-07-15T00:00:00.000Z",
            updated_at: "2026-07-15T00:00:00.000Z",
          },
        ]);
      }

      return json([]);
    }

    let body: Record<string, unknown> = {};
    try {
      body = request.postDataJSON() as Record<string, unknown>;
    } catch {
      body = {};
    }
    mutations.push({ method, table, body, url });

    if (method === "PATCH" && table === "children") {
      if (shouldFailPhotoSave) {
        shouldFailPhotoSave = false;
        return json({ message: "raw database failure" }, 500);
      }

      return json({ id: "child-photo" });
    }

    return json({ message: "unexpected mutation" }, 405);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/children");
  await expect(page.getByRole("heading", { name: "선생님 로그인" })).toBeVisible();
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.getByRole("heading", { name: "아이들" })).toBeVisible();

  await page.getByRole("button", { name: /김새싹/ }).click();
  const dialog = page.getByRole("dialog", { name: "김새싹 상세정보" });
  await dialog.getByLabel("이름", { exact: true }).fill("미저장 이름");
  await dialog.getByLabel("사진 찍기").setInputFiles({
    name: "camera.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("photo"),
  });

  await expect(dialog.getByRole("alert")).toContainText("네트워크 연결을 확인한 뒤 다시 저장해 주세요.");
  await expect(dialog.getByRole("alert")).not.toContainText("raw database failure");
  await expect(dialog.getByLabel("이름", { exact: true })).toHaveValue("미저장 이름");
  await expect(dialog.getByRole("button", { name: "미저장 이름 사진 크게 보기" })).toBeVisible();

  const firstPatch = mutations.find((mutation) => mutation.method === "PATCH" && mutation.table === "children");
  expect(firstPatch?.body).toEqual({ photo_data_url: "data:image/jpeg;base64,cGhvdG8=" });
  expect(firstPatch?.url.searchParams.get("organization_id")).toBe(`eq.${ORGANIZATION_ID}`);
  expect(firstPatch?.url.searchParams.get("id")).toBe("eq.child-photo");
  expect(Object.keys(firstPatch?.body ?? {})).toEqual(["photo_data_url"]);

  const retryBox = await dialog.getByRole("button", { name: "사진 다시 저장" }).boundingBox();
  expect(retryBox?.height).toBeGreaterThanOrEqual(44);
  await dialog.getByRole("button", { name: "사진 다시 저장" }).click();
  await expect(dialog.getByText(/사진만 바로 저장되었습니다/)).toBeVisible();
  await expect(dialog.getByLabel("사진 찍기")).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "수정 저장" })).toBeEnabled();

  const photoPatchMutations = mutations.filter(
    (mutation) => mutation.method === "PATCH" && mutation.table === "children",
  );
  expect(photoPatchMutations).toHaveLength(2);
  expect(mutations.some((mutation) => mutation.table !== "children")).toBe(false);

  const cameraBox = await dialog.getByLabel("사진 찍기").boundingBox();
  expect(cameraBox?.height).toBeGreaterThanOrEqual(44);

  await dialog.getByRole("button", { name: "취소" }).click();
  await expect(page.getByText("미저장 이름", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /김새싹/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "김새싹 아바타" }).locator("img")).toHaveAttribute(
    "src",
    "data:image/jpeg;base64,cGhvdG8=",
  );

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
