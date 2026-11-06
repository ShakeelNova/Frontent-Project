import { SettingsNav } from "./settings-nav";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Settings</h1>
        <p className="mt-1 text-muted">
          Organization configuration — guided setup steps live here too.
        </p>
      </div>
      <SettingsNav />
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}
