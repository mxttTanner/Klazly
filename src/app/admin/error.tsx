"use client";

import { SegmentErrorBoundary } from "@/components/segment-error-boundary";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentErrorBoundary {...props} segment="admin" />;
}
