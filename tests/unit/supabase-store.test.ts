import { describe, expect, it } from "vitest";
import {
  createAttendanceRecordInsertRows,
  createAttendanceSessionUpsertRow,
  DEFAULT_ORGANIZATION_ID,
} from "@/lib/family/supabase-store";
import type { AttendanceSession } from "@/lib/family/types";

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
});
