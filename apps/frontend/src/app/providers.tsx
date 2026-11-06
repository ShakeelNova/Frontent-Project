"use client";

import { TenantProvider } from "@/components/tenant/tenant-provider";
import { ThemeProvider } from "@/components/theme/theme";
import { ToastProvider } from "@/components/ui/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * App-wide client providers (mounted once in the root layout so every route
 * group — public / portal / student / admin — shares them):
 * - TanStack Query: server state. Retries stay conservative; auth errors
 *   (401/403) must never be retried blindly once API phases land.
 * - ThemeProvider: light/dark via CSS variables.
 * - ToastProvider: polite-live-region notifications.
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <TenantProvider>{children}</TenantProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
