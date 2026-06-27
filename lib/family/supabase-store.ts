import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeParsePublicEnv } from "@/lib/env";
import { createDefaultFamilyOpenStore } from "@/lib/family/default-store";
import { normalizeFamilyOpenStore } from "@/lib/family/store-persistence";
import type {
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
type AttendanceSessionRow = Tables["attendance_sessions"]["Row"];
type AttendanceRecordRow = Tables["attendance_records"]["Row"];

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

async function ensureDefaultOrganization(supabase: FamilySupabaseClient) {
  const { error } = await supabase.from("organizations").upsert({
    id: DEFAULT_ORGANIZATION_ID,
    slug: "default",
    name: "밴쿠버한인침례교회",
    department: "초등부",
  });

  return error;
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

  const sessionRows = sessions.map((session) => ({
    organization_id: DEFAULT_ORGANIZATION_ID,
    session_date: session.sessionDate,
    note: session.note,
    share_with_pastor: session.shareWithPastor ?? false,
    saved_at: optionalDate(session.savedAt),
  }));

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

    return Object.entries(session.records).map(([childId, record]) => ({
      organization_id: DEFAULT_ORGANIZATION_ID,
      session_id: sessionId,
      child_id: childId,
      status: record.status ?? null,
      qt_completed: record.qtCompleted,
    }));
  });

  if (recordRows.length === 0) {
    return null;
  }

  const { error } = await supabase.from("attendance_records").insert(recordRows);
  return error;
}

export function isFamilyOpenSupabaseConfigured() {
  return createFamilyOpenSupabaseClient() !== null;
}

export async function loadFamilyOpenStoreFromSupabase(): Promise<RemoteStoreResult> {
  const defaultStore = createDefaultFamilyOpenStore();
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      store: defaultStore,
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
  ]);

  const error = getFirstError([
    teachersResult.error,
    classesResult.error,
    parentsResult.error,
    childrenResult.error,
    attendanceSessionsResult.error,
    attendanceRecordsResult.error,
  ]);

  if (error) {
    return {
      ok: false,
      store: defaultStore,
      message: error.message,
    };
  }

  const hasNormalizedData =
    (teachersResult.data?.length ?? 0) > 0 ||
    (classesResult.data?.length ?? 0) > 0 ||
    (childrenResult.data?.length ?? 0) > 0 ||
    (attendanceSessionsResult.data?.length ?? 0) > 0;

  if (!hasNormalizedData) {
    const saveResult = await saveFamilyOpenStoreWithClient(supabase, defaultStore);
    return saveResult.ok
      ? { ok: true, store: defaultStore }
      : { ok: false, store: defaultStore, message: saveResult.message };
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

  return { ok: true, message: "" };
}

export async function saveFamilyOpenStoreToSupabase(store: FamilyOpenStore) {
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  return saveFamilyOpenStoreWithClient(supabase, store);
}
