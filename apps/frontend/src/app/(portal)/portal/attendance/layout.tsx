import { AttendanceNav } from "./attendance-nav";
import { HelpButton } from "@/components/help/help-button";
import type { ReactNode } from "react";

export default function AttendanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Attendance</h1>
          <p className="mt-1 text-muted">
            Manual marking and QR check-ins work with or without attendance
            devices. Statuses and flags come from the backend.
          </p>
        </div>
        <HelpButton featureId="attendance" featureLabel="Attendance" />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[14rem_1fr]">
        <AttendanceNav />
        <div className="min-w-0 rounded-lg border border-border bg-surface p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
