import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

export function parsePublicEnv(env: NodeJS.ProcessEnv = process.env) {
  return publicEnvSchema.parse(env);
}

