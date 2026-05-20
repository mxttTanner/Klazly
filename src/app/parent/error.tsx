"use client";

import { SegmentErrorBoundary } from "@/components/segment-error-boundary";

export default function ParentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentErrorBoundary {...props} segment="parent" />;
}
