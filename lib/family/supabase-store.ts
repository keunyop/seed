import { createBrowserClient } from "@supabase/ssr";
import { safeParsePublicEnv } from "@/lib/env";
import { createDefaultFamilyOpenStore } from "@/lib/family/default-store";
import { normalizeFamilyOpenStore } from "@/lib/family/store-persistence";
import type { FamilyOpenStore } from "@/lib/family/types";
import type { Database, Json } from "@/types/database.generated";

export const FAMILY_OPEN_APP_STATE_ID = "default";

type RemoteStoreResult =
  | { ok: true; store: FamilyOpenStore }
  | { ok: false; store: FamilyOpenStore; message: string };

function createFamilyOpenSupabaseClient() {
  const env = safeParsePublicEnv();

  if (!env) {
    return null;
  }

  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function isFamilyOpenSupabaseConfigured() {
  return createFamilyOpenSupabaseClient() !== null;
}

export async function loadFamilyOpenStoreFromSupabase(fallbackStore?: FamilyOpenStore): Promise<RemoteStoreResult> {
  const fallback = fallbackStore ?? createDefaultFamilyOpenStore();
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      store: fallback,
      message: "Supabase 환경변수가 설정되지 않았습니다.",
    };
  }

  const { data, error } = await supabase
    .from("family_open_app_state")
    .select("state")
    .eq("id", FAMILY_OPEN_APP_STATE_ID)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      store: fallback,
      message: error.message,
    };
  }

  if (!data) {
    const saveResult = await saveFamilyOpenStoreToSupabase(fallback);
    return saveResult.ok ? { ok: true, store: fallback } : { ok: false, store: fallback, message: saveResult.message };
  }

  return { ok: true, store: normalizeFamilyOpenStore(data.state) };
}

export async function saveFamilyOpenStoreToSupabase(store: FamilyOpenStore) {
  const supabase = createFamilyOpenSupabaseClient();

  if (!supabase) {
    return { ok: false, message: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  const { error } = await supabase.from("family_open_app_state").upsert({
    id: FAMILY_OPEN_APP_STATE_ID,
    state: store as unknown as Json,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "" };
}
