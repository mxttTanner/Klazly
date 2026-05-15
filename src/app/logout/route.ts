import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  // Use the incoming request's own URL as the base so the redirect
  // origin matches whichever host the user is on (production,
  // preview, or localhost). Avoids depending on a SITE_URL env var
  // that historically wasn't set on Vercel — and the old localhost
  // fallback was sending production users to http://localhost:3000.
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
