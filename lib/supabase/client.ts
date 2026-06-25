import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.generated";
import { parsePublicEnv } from "@/lib/env";

export function createClient() {
  const env = parsePublicEnv();

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

