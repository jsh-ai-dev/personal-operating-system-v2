import { Suspense } from "react";

import { Mk3NewsList } from "@/features/mk3/ui/Mk3NewsList";

export default function Mk3NewsPage() {
  return (
    <Suspense fallback={null}>
      <Mk3NewsList />
    </Suspense>
  );
}
