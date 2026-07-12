import { describe, expect, it } from "vitest";
import { updateAttendanceDraftForContext } from "@/app/attendance/attendance-client";

function createDraft(sessionKey: string) {
  return {
    sessionDate: "2026-07-12",
    sessionKey,
    records: {},
    note: "",
    shareWithPastor: false,
    isMemoDirty: false,
  };
}

describe("attendance memo drafts", () => {
  it("keeps independently edited drafts for each date and class context", () => {
    const classAKey = "2026-07-12:class-a:ready";
    const classBKey = "2026-07-12:class-b:ready";
    const classADraft = createDraft(classAKey);
    const classBDraft = createDraft(classBKey);

    const withClassA = updateAttendanceDraftForContext({}, classAKey, classADraft, (draft) => ({
      ...draft,
      note: "A반 작성 중",
      isMemoDirty: true,
    }));
    const withBothClasses = updateAttendanceDraftForContext(withClassA, classBKey, classBDraft, (draft) => ({
      ...draft,
      note: "B반 작성 중",
      isMemoDirty: true,
    }));

    expect(withBothClasses[classAKey]?.note).toBe("A반 작성 중");
    expect(withBothClasses[classBKey]?.note).toBe("B반 작성 중");
  });
});
