/**
 * Single source of truth for reading Supabase env vars.
 *
 * Throws an explicit, named error if a var is missing — the default
 * @supabase/ssr error "Your project's URL and Key are required to
 * create a Supabase client!" doesn't say WHICH var is missing or in
 * which runtime, which has burned us in production debugging before
 * (Sentry caught 9 events with no clear cause).
 *
 * Server-side: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *              for the anon client, plus SUPABASE_SERVICE_ROLE_KEY for
 *              the service-role admin client.
 * Browser-side: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *              (these are inlined by Next at build time, so a missing
 *              value means the build was run without them).
 */

function require_(name: string, value: string | undefined): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Missing required env var ${name}. ` +
        (name.startsWith("NEXT_PUBLIC_")
          ? "This is a build-time public var — set it on Vercel before the next deploy."
          : "This is a server-only var — set it on Vercel and redeploy."),
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return require_(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function getSupabaseAnonKey(): string {
  return require_(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseServiceRoleKey(): string {
  return require_(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
