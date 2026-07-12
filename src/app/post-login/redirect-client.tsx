"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side hop to the resolved dashboard. /post-login used to
 * redirect() server-side, but a server redirect chain skips the target
 * segment's loading.tsx during client navigations — users saw a blank
 * white screen for as long as the dashboard queries took. Navigating
 * from the client keeps the branded loader (rendered by the page around
 * this component) on screen, and the destination's own loading skeleton
 * shows while it streams in.
 */
export function PostLoginRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return null;
}
