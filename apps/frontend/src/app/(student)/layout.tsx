import { StudentShell } from "@/components/student-portal/student-shell";
import { PageLoading } from "@/components/feedback/page-loading";
import { Suspense, type ReactNode } from "react";

/**
 * Student/parent experience — deliberately separate and simplified.
 * Only the signed-in user's LINKED students render here (backend-resolved
 * from the session); no management navigation or admin data, ever.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageLoading label="Loading…" />}>
      <StudentShell>{children}</StudentShell>
    </Suspense>
  );
}
