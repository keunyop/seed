import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

type PublicEnvInput = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

function getPublicEnvInput(): PublicEnvInput {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

export function parsePublicEnv(env: PublicEnvInput = getPublicEnvInput()) {
  return publicEnvSchema.parse(env);
}

export function safeParsePublicEnv(env: PublicEnvInput = getPublicEnvInput()) {
  const parsed = publicEnvSchema.safeParse(env);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}
