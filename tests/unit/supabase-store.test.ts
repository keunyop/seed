import { describe, expect, it } from "vitest";
import {
  createAttendanceMemoInsertRow,
  createAttendanceRecordUpsertRow,
  createAttendanceRecordInsertRows,
  createAttendanceSessionUpsertRow,
  createAttendanceSessionTouchRow,
  DEFAULT_ORGANIZATION_ID,
  saveFamilyOpenStoreWithClient,
} from "@/lib/family/supabase-store";
import type { AttendanceSession, FamilyOpenStore } from "@/lib/family/types";

type RecordedMutation = {
  operation: "delete" | "insert" | "upsert";
  options?: unknown;
  table: string;
  value?: unknown;
};

function createSupabaseClientMock() {
  const mutations: RecordedMutation[] = [];
  const client = {
    from(table: string) {
      return {
        delete() {
          mutations.push({ operation: "delete", table });
          return {
            eq: async () => ({ data: null, error: null }),
          };
        },
        insert: async (value: unknown) => {
          mutations.push({ operation: "insert", table, value });
          return { data: null, error: null };
        },
        select() {
          return {
            eq: async () => ({ data: [], error: null }),
          };
        },
        upsert: async (value: unknown, options?: unknown) => {
          mutations.push({ operation: "upsert", options, table, value });
          return { data: null, error: null };
        },
      };
    },
  };

  return {
    client: client as unknown as Parameters<typeof saveFamilyOpenStoreWithClient>[0],
    mutations,
  };
}

describe("Supabase attendance write helpers", () => {
  it("builds one scoped attendance session row", () => {
    const session: AttendanceSession = {
      sessionDate: "2026-06-28",
      note: "이번 주 메모",
      shareWithPastor: true,
      savedAt: "2026-06-28T18:00:00.000Z",
      records: {},
    };

    expect(createAttendanceSessionUpsertRow(session)).toEqual({
      organization_id: DEFAULT_ORGANIZATION_ID,
      session_date: "2026-06-28",
      note: "이번 주 메모",
      share_with_pastor: true,
      saved_at: "2026-06-28T18:00:00.000Z",
    });
  });

  it("builds record rows only for the saved session", () => {
    const rows = createAttendanceRecordInsertRows("session-1", {
      "child-1": { status: "present", qtCompleted: true },
      "child-2": { qtCompleted: false },
    });

    expect(rows).toEqual([
      {
        organization_id: DEFAULT_ORGANIZATION_ID,
        session_id: "session-1",
        child_id: "child-1",
        status: "present",
        qt_completed: true,
      },
      {
        organization_id: DEFAULT_ORGANIZATION_ID,
        session_id: "session-1",
        child_id: "child-2",
        status: null,
        qt_completed: false,
      },
    ]);
  });

  it("builds a session touch row without memo fields", () => {
    expect(createAttendanceSessionTouchRow("2026-06-28", "2026-06-28T19:00:00.000Z")).toEqual({
      organization_id: DEFAULT_ORGANIZATION_ID,
      session_date: "2026-06-28",
      saved_at: "2026-06-28T19:00:00.000Z",
    });
  });

  it("builds one record upsert row", () => {
    expect(createAttendanceRecordUpsertRow("session-1", "child-1", { status: "present", qtCompleted: true })).toEqual({
      organization_id: DEFAULT_ORGANIZATION_ID,
      session_id: "session-1",
      child_id: "child-1",
      status: "present",
      qt_completed: true,
    });
  });

  it("builds one attendance memo insert row", () => {
    expect(
      createAttendanceMemoInsertRow({
        id: "11111111-1111-4111-8111-111111111111",
        sessionDate: "2026-06-28",
        classId: "class-1",
        teacherId: "teacher-1",
        note: "반 메모",
        isSecret: true,
        savedAt: "2026-06-28T20:00:00.000Z",
      }),
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      organization_id: DEFAULT_ORGANIZATION_ID,
      session_date: "2026-06-28",
      class_id: "class-1",
      teacher_id: "teacher-1",
      note: "반 메모",
      is_secret: true,
      saved_at: "2026-06-28T20:00:00.000Z",
    });
  });

  it("upserts known memos without deleting memos created by another client", async () => {
    const { client, mutations } = createSupabaseClientMock();
    const store: FamilyOpenStore = {
      version: 1,
      teachers: [],
      classes: [],
      children: [],
      attendanceByDate: {},
      attendanceMemos: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          sessionDate: "2026-06-28",
          classId: "class-1",
          teacherId: "teacher-1",
          note: "기존 store에 있는 메모",
          isSecret: false,
          savedAt: "2026-06-28T20:00:00.000Z",
        },
      ],
    };

    await expect(saveFamilyOpenStoreWithClient(client, store)).resolves.toEqual({ ok: true, message: "" });

    expect(
      mutations.some((mutation) => mutation.table === "attendance_memos" && mutation.operation === "delete"),
    ).toBe(false);
    expect(
      mutations.find((mutation) => mutation.table === "attendance_memos" && mutation.operation === "upsert"),
    ).toEqual({
      operation: "upsert",
      options: { onConflict: "id" },
      table: "attendance_memos",
      value: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          organization_id: DEFAULT_ORGANIZATION_ID,
          session_date: "2026-06-28",
          class_id: "class-1",
          teacher_id: "teacher-1",
          note: "기존 store에 있는 메모",
          is_secret: false,
          saved_at: "2026-06-28T20:00:00.000Z",
        },
      ],
    });
  });
});
