import { Suspense } from "react";

import { Mk3Summaries } from "@/features/mk3/ui/Mk3Summaries";

export default function Mk3SummariesPage() {
  return (
    <Suspense fallback={null}>
      <Mk3Summaries />
    </Suspense>
  );
}
