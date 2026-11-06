"use client";

import { PersistenceProvider } from "@/components/persistence/persistence-provider";
import { TenantProvider } from "@/components/tenant/tenant-provider";
import { ThemeProvider } from "@/components/theme/theme";
import { ToastProvider } from "@/components/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";

/**
 * App-wide client providers (mounted once in the root layout so every route
 * group — public / portal / student / admin — shares them):
 * - TanStack Query: server state. Retries stay conservative; auth errors
 *   (401/403) must never be retried blindly once API phases land.
 * - ThemeProvider: light/dark via CSS variables (white-first default).
 * - ToastProvider: polite-live-region notifications.
 * - MotionConfig: global reduced-motion + shared animation defaults.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <PersistenceProvider>
              <TenantProvider>{children}</TenantProvider>
            </PersistenceProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
