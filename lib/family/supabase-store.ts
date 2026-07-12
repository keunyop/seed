import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeParsePublicEnv } from "@/lib/env";
import { createEmptyFamilyOpenStore } from "@/lib/family/default-store";
import { normalizeFamilyOpenStore } from "@/lib/family/store-persistence";
import type {
  AttendanceMemo,
  AttendanceRecord,
  AttendanceSession,
  ChildGender,
  FamilyChild,
  FamilyClass,
  FamilyOpenStore,
  FamilyTeacher,
  ParentContact,
  ParentRelation,
} from "@/lib/family/types";
import type { Database } from "@/types/database.generated";

export const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
export const FAMILY_OPEN_APP_STATE_ID = "default";

type RemoteStoreResult =
  | { ok: true; store: FamilyOpenStore }
  | { ok: false; store: FamilyOpenStore; message: string };

type FamilySupabaseClient = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
type TeacherRow = Tables["teachers"]["Row"];
type ClassRow = Tables["classes"]["Row"];
type ChildRow = Tables["children"]["Row"];
type ParentRow = Tables["child_parents"]["Row"];
type AttendanceMemoRow = Tables["attendance_memos"]["Row"];
type AttendanceSessionRow = Tables["attendance_sessions"]["Row"];
type AttendanceRecordRow = Tables["attendance_records"]["Row"];
type RemoteWriteResult = { ok: true; message: "" } | { ok: false; message: string };

function createFamilyOpenSupabaseClient() {
  const env = safeParsePublicEnv();

  if (!env) {
    return null;
  }

  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function optionalText(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function optionalDate(value?: string) {
  return optionalText(value);
}

function fromNullableText(value: string | null) {
  return value ?? undefined;
}

function getFirstError(errors: Array<{ message: string } | null>) {
  return errors.find((error): error is { message: string } => error !== null) ?? null;
}

function mapTeacher(row: TeacherRow): FamilyTeacher {
  return {
    id: row.id,
    name: row.name,
    photoDataUrl: fromNullableText(row.photo_data_url),
    birthDate: fromNullableText(row.birth_date),
    birthMonth: row.birth_month ?? undefined,
    birthDay: row.birth_day ?? undefined,
    phone: fromNullableText(row.phone),
    isAdmin: row.is_admin ?? false,
    isActive: row.is_active,
  };
}

function mapClass(row: ClassRow): FamilyClass {
  return {
    id: row.id,
    name: row.name,
    teacherId: row.teacher_id ?? undefined,
  };
}

function mapChild(row: ChildRow, parentsByChildId: Map<string, ParentContact[]>): FamilyChild {
  return {
    id: row.id,
    name: row.name,
    classId: row.class_id ?? "",
    photoDataUrl: fromNullableText(row.photo_data_url),
    gender: row.gender as ChildGender,
    birthDate: fromNullableText(row.birth_date),
    birthYear: row.birth_year ?? undefined,
    birthMonth: row.birth_month ?? undefined,
    birthDay: row.birth_day ?? undefined,
    parents: parentsByChildId.get(row.id) ?? [],
    address: fromNullableText(row.address),
    email: fromNullableText(row.email),
    registeredAt: fromNullableText(row.registered_at),
    notes: fromNullableText(row.notes),
    isActive: row.is_active,
  };
}

function mapParent(row: ParentRow): ParentContact {
  return {
    id: row.id,
    relation: row.relation as ParentRelation,
    name: row.name,
    phone: row.phone,
  };
}

function mapAttendanceMemo(row: AttendanceMemoRow): AttendanceMemo {
  return {
    id: row.id,
    sessionDate: row.session_date,
    classId: row.class_id ?? undefined,
    teacherId: row.teacher_id ?? undefined,
    note: row.note,
    isSecret: row.is_secret,
    acknowledgedAt: fromNullableText(row.acknowledged_at),
    acknowledgedByTeacherId: fromNullableText(row.acknowledged_by_teacher_id),
    savedAt: row.saved_at,
  };
}

function buildAttendanceByDate(sessions: AttendanceSessionRow[], records: AttendanceRecordRow[]) {
  const recordsBySessionId = new Map<string, Record<string, AttendanceRecord>>();

  for (const record of records) {
    const sessionRecords = recordsBySessionId.get(record.session_id) ?? {};
    sessionRecords[record.child_id] = {
      status: record.status ?? undefined,
      qtCompleted: record.qt_completed,
    };
    recordsBySessionId.set(record.session_id, sessionRecords);
  }

  return Object.fromEntries(
    sessions.map((session) => [
      session.session_date,
      {
        sessionDate: session.session_date,
        records: recordsBySessionId.get(session.id) ?? {},
        note: session.note,
        shareWithPastor: session.share_with_pastor,
        savedAt: session.saved_at ?? session.updated_at,
      } satisfies AttendanceSession,
    ]),
  );
}

export function createAttendanceSessionUpsertRow(session: AttendanceSession) {
  return {
    organization_id: DEFAULT_ORGANIZATION_ID,
    session_date: session.sessionDate,
    note: session.note,
    share_with_pastor: session.shareWithPastor ?? false,
    saved_at: optionalDate(session.savedAt),
  };
}

export function createAttendanceRecordInsertRows(sessionId: string, records: AttendanceSession["records"]) {
  return Object.entries(records).map(([childId, record]) => ({
    organization_id: DEFAULT_ORGANIZATION_ID,
    session_id: sessionId,
    child_id: childId,
    status: record.status ?? null,
    qt_completed: record.qtCompleted,
  }));
}

export function createAttendanceSessionTouchRow(sessionDate: string, savedAt: string) {
  return {
    organization_id: DEFAULT_ORGANIZATION_ID,
    session_date: sessionDate,
    saved_at: optionalDate(savedAt),
  };
}

export function createAttendanceRecordUpsertRow(sessionId: string, childId: string, record: AttendanceRecord) {
  return {
    organization_id: DEFAULT_ORGANIZATION_ID,
    session_id: sessionId,
    child_id: childId,
    status: record.status ?? null,
    qt_completed: record.qtCompleted,
  };
}

export function createAttendanceMemoInsertRow(memo: AttendanceMemo) {
  return {
    id: memo.id,
    organization_id: DEFAULT_ORGANIZATION_ID,
    session_date: memo.sessionDate,
    class_id: optionalText(memo.classId),
    teacher_id: optionalText(memo.teacherId),
    note: memo.note,
    is_secret: memo.isSecret,
    saved_at: memo.savedAt,
  };
}

async function ensureDefaultOrganization(supabase: FamilySupabaseClient) {
  const { error } = await supabase.from("organizations").upsert({
    id: DEFAULT_ORGANIZATION_ID,
    slug: "default",
    name: "밴쿠버한인침례교회",
    department: "초등부",
  });

  return error;
}

async function upsertAttendanceSessionForDate(
  supabase: FamilySupabaseClient,
  sessionDate: string,
  savedAt: string,
) {
  return supabase
    .from("attendance_sessions")
    .upsert(createAttendanceSessionTouchRow(sessionDate, savedAt), { onConflict: "organization_id,session_date" })
    .select("id")
    .single();
}

async function deleteMissingClasses(supabase: FamilySupabaseClient, nextClassIds: Set<string>) {
  const { data, error } = await supabase
    .from("classes")
    .select("id")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);

  if (error) {
    return error;
  }

  const staleClassIds = (data ?? []).map((item) => item.id).filter((id) => !nextClassIds.has(id));
  for (const classId of staleClassIds) {
    const { error: deleteError } = await supabase
      .from("classes")
      .delete()
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .eq("id", classId);

    if (deleteError) {
      return deleteError;
    }
  }

  return null;
}

async function deleteMissingTeachers(supabase: FamilySupabaseClient, nextTeacherIds: Set<string>) {
  const { data, error } = await supabase
    .from("teachers")
    .select("id")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);

  if (error) {
    return error;
  }

  const staleTeacherIds = (data ?? []).map((item) => item.id).filter((id) => !nextTeacherIds.has(id));
  for (const teacherId of staleTeacherIds) {
    const { error: deleteError } = await supabase
      .from("teachers")
      .delete()
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .eq("id", teacherId);

    if (deleteError) {
      return deleteError;
    }
  }

  return null;
}

async function deleteMissingChildren(supabase: FamilySupabaseClient, nextChildIds: Set<string>) {
  const { data, error } = await supabase
    .from("children")
    .select("id")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);

  if (error) {
    return error;
  }

  const staleChildIds = (data ?? []).map((item) => item.id).filter((id) => !nextChildIds.has(id));
  for (const childId of staleChildIds) {
    const { error: deleteError } = await supabase
      .from("children")
      .delete()
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .eq("id", childId);

    if (deleteError) {
      return deleteError;
    }
  }

  return null;
}

async function replaceChildParents(supabase: FamilySupabaseClient, store: FamilyOpenStore) {
  const { error: deleteError } = await supabase
    .from("child_parents")
    .delete()
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);

  if (deleteError) {
    return deleteError;
  }

  const parentRows = store.children.flatMap((child, childIndex) =>
    (child.parents ?? []).map((parent, parentIndex) => ({
      id: parent.id,
      organization_id: DEFAULT_ORGANIZATION_ID,
      child_id: child.id,
      relation: parent.relation,
      name: parent.name,
      phone: parent.phone,
      sort_order: childIndex * 1000 + parentIndex,
    })),
  );

  if (parentRows.length === 0) {
    return null;
  }

  const { error } = await supabase.from("child_parents").insert(parentRows);
  return error;
}

async function replaceAttendance(supabase: FamilySupabaseClient, store: FamilyOpenStore) {
  const sessions = Object.values(store.attendanceByDate);

  if (sessions.length === 0) {
    const { error } = await supabase
      .from("attendance_sessions")
      .delete()
      .eq("organization_id", DEFAULT_ORGANIZATION_ID);
    return error;
  }

  const sessionRows = sessions.map(createAttendanceSessionUpsertRow);

  const { error: upsertSessionsError } = await supabase
    .from("attendance_sessions")
    .upsert(sessionRows, { onConflict: "organization_id,session_date" });

  if (upsertSessionsError) {
    return upsertSessionsError;
  }

  const nextSessionDates = new Set(sessions.map((session) => session.sessionDate));
  const { data: existingSessions, error: existingSessionsError } = await supabase
    .from("attendance_sessions")
    .select("id, session_date")
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);

  if (existingSessionsError) {
    return existingSessionsError;
  }

  for (const session of existingSessions ?? []) {
    if (nextSessionDates.has(session.session_date)) {
      continue;
    }

    const { error: deleteSessionError } = await supabase
      .from("attendance_sessions")
      .delete()
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .eq("id", session.id);

    if (deleteSessionError) {
      return deleteSessionError;
    }
  }

  const sessionIdByDate = new Map(
    (existingSessions ?? [])
      .filter((session) => nextSessionDates.has(session.session_date))
      .map((session) => [session.session_date, session.id]),
  );

  const { error: deleteRecordsError } = await supabase
    .from("attendance_records")
    .delete()
    .eq("organization_id", DEFAULT_ORGANIZATION_ID);

  if (deleteRecordsError) {
    return deleteRecordsError;
  }

  const recordRows = sessions.flatMap((session) => {
    const sessionId = sessionIdByDate.get(session.sessionDate);
    if (!sessionId) {
      return [];
    }

    return createAttendanceRecordInsertRows(sessionId, session.records);
  });

  if (recordRows.length === 0) {
    return null;
  }

  const { error } = await supabase.from("attendance_records").insert(recordRows);
  return error;
}

async function upsertAttendanceMemos(supabase: FamilySupabaseClient, store: FamilyOpenStore) {
  const memoRows = store.attendanceMemos.map(createAttendanceMemoInsertRow);
  if (memoRows.length === 0) {
    return null;
  }

  const { error } = await supabase.from("attendance_memos").upsert(memoRows, { onConflict: "id" });
  return error;
}

export async function saveAttendanceSessionWithClient(
  supabase: FamilySupabaseClient,
  session: AttendanceSession,
): Promise<RemoteWriteResult> {
  const organizationError = await ensureDefaultOrganization(supabase);

  if (organizationError) {
    return { ok: false, message: organizationError.message };
  }

  const { data: savedSession, error: sessionError } = await supabase
    .from("attendance_sessions")
    .upsert(createAttendanceSessionUpsertRow(session), { onConflict: "organization_id,session_date" })
    .select("id")
    .single();

  if (sessionError) {
    return { ok: false, message: sessionError.message };
  }

  if (!savedSession) {
    return { ok: false, message: "출석 세션을 저장하지 못했습니다." };
  }

  const { error: deleteRecordsError } = await supabase
    .from("attendance_records")
    .delete()
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .eq("session_id", savedSession.id);

  if (deleteRecordsError) {
    return { ok: false, message: deleteRecordsError.message };
  }

  const recordRows = createAttendanceRecordInsertRows(savedSession.id, session.records);
  if (recordRows.length === 0) {
    return { ok: true, message: "" };
  }

  const { error: recordsError } = await supabase.from("attendance_records").insert(recordRows);

  if (recordsError) {
    return { ok: false, message: recordsError.message };
  }

  return { ok: true, message: "" };
}

export async function saveAttendanceRecordWithClient(
  supabase: FamilySupabaseClient,
  sessionDate: string,
  childId: string,
  record: AttendanceRecord,
  savedAt: string,
): Promise<RemoteWriteResult> {
  const organizationError = await ensureDefaultOrganization(supabase);

  if (organizationError) {
    return { ok: false, message: organizationError.message };
  }

  const { data: savedSession, error: sessionError } = await upsertAttendanceSessionForDate(
    supabase,
    sessionDate,
    savedAt,
  );

  if (sessionError) {
    return { ok: false, message: sessionError.message };
  }

  if (!savedSession) {
    return { ok: false, message: "출석 세션을 저장하지 못했습니다." };
  }

  const { error: recordError } = await supabase
    .from("attendance_records")
    .upsert(createAttendanceRecordUpsertRow(savedSession.id, childId, record), { onConflict: "session_id,child_id" });

  if (recordError) {
    return { ok: false, message: recordError.message };
  }

  return { ok: true, message: "" };
}

export async function saveAttendanceMemoWithClient(
  supabase: FamilySupabaseClient,
  memo: AttendanceMemo,
): Promise<RemoteWriteResult> {
  const organizationError = await ensureDefaultOrganization(supabase);

  if (organizationError) {
    return { ok: false, message: organizationError.message };
  }

  const { error } = await supabase.from("attendance_memos").insert(createAttendanceMemoInsertRow(memo));

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "" };
}

export async function setAttendanceMemoAcknowledgementWithClient(
  supabase: FamilySupabaseClient,
  memoId: string,
  acknowledgedAt?: string,
  acknowledgedByTeacherId?: string,
): Promise<RemoteWriteResult> {
  const { error } = await supabase
    .from("attendance_memos")
    .update({
      acknowledged_at: optionalDate(acknowledgedAt),
      acknowledged_by_teacher_id: optionalText(acknowledgedByTeacherId),
    })
    .eq("organization_id", DEFAULT_ORGANIZATION_ID)
    .eq("id", memoId);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "" };
}

export function isFamilyOpenSupabaseConfigured() {
  return createFamilyOpenSupabaseClient() !== null;
}

export async function loadFamilyOpenStoreFromSupabase(): Promise<RemoteStoreResult> {
  const emptyStore = createEmptyFamilyOpenStore();
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      store: emptyStore,
      message: "Supabase 환경변수가 설정되지 않았습니다.",
    };
  }

  const [
    teachersResult,
    classesResult,
    parentsResult,
    childrenResult,
    attendanceSessionsResult,
    attendanceRecordsResult,
    attendanceMemosResult,
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .order("sort_order", { ascending: true }),
    supabase
      .from("classes")
      .select("*")
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .order("sort_order", { ascending: true }),
    supabase
      .from("child_parents")
      .select("*")
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .order("sort_order", { ascending: true }),
    supabase
      .from("children")
      .select("*")
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .order("sort_order", { ascending: true }),
    supabase
      .from("attendance_sessions")
      .select("*")
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .order("session_date", { ascending: true }),
    supabase.from("attendance_records").select("*").eq("organization_id", DEFAULT_ORGANIZATION_ID),
    supabase
      .from("attendance_memos")
      .select("*")
      .eq("organization_id", DEFAULT_ORGANIZATION_ID)
      .order("saved_at", { ascending: false }),
  ]);

  const error = getFirstError([
    teachersResult.error,
    classesResult.error,
    parentsResult.error,
    childrenResult.error,
    attendanceSessionsResult.error,
    attendanceRecordsResult.error,
    attendanceMemosResult.error,
  ]);

  if (error) {
    return {
      ok: false,
      store: emptyStore,
      message: error.message,
    };
  }

  const hasNormalizedData =
    (teachersResult.data?.length ?? 0) > 0 ||
    (classesResult.data?.length ?? 0) > 0 ||
    (childrenResult.data?.length ?? 0) > 0 ||
    (attendanceSessionsResult.data?.length ?? 0) > 0 ||
    (attendanceMemosResult.data?.length ?? 0) > 0;

  if (!hasNormalizedData) {
    return { ok: true, store: emptyStore };
  }

  const parentsByChildId = new Map<string, ParentContact[]>();
  for (const parent of parentsResult.data ?? []) {
    parentsByChildId.set(parent.child_id, [...(parentsByChildId.get(parent.child_id) ?? []), mapParent(parent)]);
  }

  const store: FamilyOpenStore = {
    version: 1,
    teachers: (teachersResult.data ?? []).map(mapTeacher),
    classes: (classesResult.data ?? []).map(mapClass),
    children: (childrenResult.data ?? []).map((child) => mapChild(child, parentsByChildId)),
    attendanceByDate: buildAttendanceByDate(attendanceSessionsResult.data ?? [], attendanceRecordsResult.data ?? []),
    attendanceMemos: (attendanceMemosResult.data ?? []).map(mapAttendanceMemo),
  };

  return { ok: true, store: normalizeFamilyOpenStore(store) };
}

export async function saveFamilyOpenStoreWithClient(supabase: FamilySupabaseClient, store: FamilyOpenStore) {
  const normalizedStore = normalizeFamilyOpenStore(store);
  const organizationError = await ensureDefaultOrganization(supabase);

  if (organizationError) {
    return { ok: false, message: organizationError.message };
  }

  const teacherRows = normalizedStore.teachers.map((teacher, index) => ({
    id: teacher.id,
    organization_id: DEFAULT_ORGANIZATION_ID,
    name: teacher.name,
    photo_data_url: optionalText(teacher.photoDataUrl),
    birth_date: optionalDate(teacher.birthDate),
    birth_month: teacher.birthMonth ?? null,
    birth_day: teacher.birthDay ?? null,
    phone: optionalText(teacher.phone),
    is_admin: teacher.isAdmin,
    is_active: teacher.isActive,
    sort_order: index,
  }));

  if (teacherRows.length > 0) {
    const { error } = await supabase.from("teachers").upsert(teacherRows);
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  const classRows = normalizedStore.classes.map((item, index) => ({
    id: item.id,
    organization_id: DEFAULT_ORGANIZATION_ID,
    name: item.name,
    teacher_id: optionalText(item.teacherId),
    sort_order: index,
  }));

  if (classRows.length > 0) {
    const { error } = await supabase.from("classes").upsert(classRows);
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  const childRows = normalizedStore.children.map((child, index) => ({
    id: child.id,
    organization_id: DEFAULT_ORGANIZATION_ID,
    class_id: optionalText(child.classId),
    name: child.name,
    photo_data_url: optionalText(child.photoDataUrl),
    gender: child.gender ?? "unspecified",
    birth_date: optionalDate(child.birthDate),
    birth_year: child.birthYear ?? null,
    birth_month: child.birthMonth ?? null,
    birth_day: child.birthDay ?? null,
    address: optionalText(child.address),
    email: optionalText(child.email),
    registered_at: optionalDate(child.registeredAt),
    notes: optionalText(child.notes),
    is_active: child.isActive,
    sort_order: index,
  }));

  if (childRows.length > 0) {
    const { error } = await supabase.from("children").upsert(childRows);
    if (error) {
      return { ok: false, message: error.message };
    }
  }

  const deleteClassesError = await deleteMissingClasses(
    supabase,
    new Set(normalizedStore.classes.map((item) => item.id)),
  );
  if (deleteClassesError) {
    return { ok: false, message: deleteClassesError.message };
  }

  const deleteChildrenError = await deleteMissingChildren(
    supabase,
    new Set(normalizedStore.children.map((child) => child.id)),
  );
  if (deleteChildrenError) {
    return { ok: false, message: deleteChildrenError.message };
  }

  const deleteTeachersError = await deleteMissingTeachers(
    supabase,
    new Set(normalizedStore.teachers.map((teacher) => teacher.id)),
  );
  if (deleteTeachersError) {
    return { ok: false, message: deleteTeachersError.message };
  }

  const parentError = await replaceChildParents(supabase, normalizedStore);
  if (parentError) {
    return { ok: false, message: parentError.message };
  }

  const attendanceError = await replaceAttendance(supabase, normalizedStore);
  if (attendanceError) {
    return { ok: false, message: attendanceError.message };
  }

  const attendanceMemosError = await upsertAttendanceMemos(supabase, normalizedStore);
  if (attendanceMemosError) {
    return { ok: false, message: attendanceMemosError.message };
  }

  return { ok: true, message: "" };
}

export async function saveAttendanceSessionToSupabase(session: AttendanceSession) {
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  return saveAttendanceSessionWithClient(supabase, session);
}

export async function saveAttendanceRecordToSupabase(
  sessionDate: string,
  childId: string,
  record: AttendanceRecord,
  savedAt: string,
) {
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  return saveAttendanceRecordWithClient(supabase, sessionDate, childId, record, savedAt);
}

export async function saveAttendanceMemoToSupabase(memo: AttendanceMemo) {
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  return saveAttendanceMemoWithClient(supabase, memo);
}

export async function setAttendanceMemoAcknowledgementInSupabase(
  memoId: string,
  acknowledgedAt?: string,
  acknowledgedByTeacherId?: string,
) {
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  return setAttendanceMemoAcknowledgementWithClient(
    supabase,
    memoId,
    acknowledgedAt,
    acknowledgedByTeacherId,
  );
}

export async function saveFamilyOpenStoreToSupabase(store: FamilyOpenStore) {
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  return saveFamilyOpenStoreWithClient(supabase, store);
}
