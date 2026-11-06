import { AcademicsNav } from "./academics-nav";
import type { ReactNode } from "react";

export default function AcademicsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1>Academic structure</h1>
      <p className="mt-1 text-muted">
        Years, programs, classes and subjects that students enroll into.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-[14rem_1fr]">
        <AcademicsNav />
        <div className="min-w-0 rounded-lg border border-border bg-surface p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
