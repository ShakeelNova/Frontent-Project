"use client";

import { queryKeys } from "@/api/query-keys";
import { getCurrentUser, signOut, type AuthUser } from "@/api/services/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** Alias kept for existing imports; canonical key lives in query-keys.ts. */
export const AUTH_ME_QUERY_KEY = queryKeys.auth.me;

/**
 * Session bootstrap hook. Server state lives in TanStack Query keyed by
 * ["auth","me"]; the actual session is the backend HttpOnly cookie — this
 * hook only mirrors "who am I" for display/redirects. Client role data is
 * NEVER trusted for authorization (backend enforces per request).
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const query = useQuery<AuthUser | null>({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: getCurrentUser,
    staleTime: 60_000,
    retry: false,
  });

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null);
      void queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY });
    },
  });

  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isAuthenticated: Boolean(query.data),
    signOut: signOutMutation.mutateAsync,
    isSigningOut: signOutMutation.isPending,
    /** Call after sign-in so headers/portals re-bootstrap immediately. */
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: AUTH_ME_QUERY_KEY }),
  };
}
