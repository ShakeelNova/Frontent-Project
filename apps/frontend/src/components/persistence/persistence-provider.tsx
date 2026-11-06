"use client";

import {
  buildBackupJson,
  buildBackupText,
  downloadFile,
  backupFilename,
  hydrateFromStorage,
  importBackupJson,
  persistNow,
  resetLocalData,
} from "@/lib/persistence/snapshot";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface PersistenceContextValue {
  hydrated: boolean;
  lastSavedAt: string | null;
  error: string | null;
  saveNow: () => Promise<void>;
  downloadJson: () => void;
  downloadText: () => void;
  restoreFromFile: (file: File) => Promise<void>;
  resetData: () => Promise<void>;
}

const PersistenceContext = createContext<PersistenceContextValue | null>(null);

export function usePersistence(): PersistenceContextValue {
  const ctx = useContext(PersistenceContext);
  if (!ctx) throw new Error("usePersistence must be used within <PersistenceProvider>.");
  return ctx;
}

/**
 * Frontend-only persistence. Hydrates the mock state from IndexedDB on mount,
 * then auto-saves a snapshot every 2.5s and when the tab is hidden. The user
 * can download a JSON backup, download a readable text summary, restore from
 * a file, or reset to the seeded demo data.
 */
export function PersistenceProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    hydrateFromStorage()
      .then((restored) => {
        if (cancelled) return;
        setHydrated(true);
        if (restored) setLastSavedAt(new Date().toISOString());
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let stopped = false;

    const save = () => {
      if (stopped) return;
      persistNow()
        .then((snapshot) => {
          if (!stopped) {
            setLastSavedAt(snapshot.capturedAt);
            setError(null);
          }
        })
        .catch(() => {
          if (!stopped) setError("Could not save locally. Storage may be full or unavailable.");
        });
    };

    const interval = window.setInterval(save, 2500);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hydrated]);

  const saveNow = useCallback(async () => {
    const snapshot = await persistNow();
    setLastSavedAt(snapshot.capturedAt);
    setError(null);
  }, []);

  const downloadJson = useCallback(() => {
    downloadFile(backupFilename("json"), buildBackupJson(), "application/json");
  }, []);

  const downloadText = useCallback(() => {
    downloadFile(backupFilename("txt"), buildBackupText(), "text/plain");
  }, []);

  const restoreFromFile = useCallback(async (file: File) => {
    const text = await file.text();
    await importBackupJson(text);
    setLastSavedAt(new Date().toISOString());
    setError(null);
  }, []);

  const resetData = useCallback(async () => {
    await resetLocalData();
  }, []);

  const value = useMemo<PersistenceContextValue>(
    () => ({
      hydrated,
      lastSavedAt,
      error,
      saveNow,
      downloadJson,
      downloadText,
      restoreFromFile,
      resetData,
    }),
    [hydrated, lastSavedAt, error, saveNow, downloadJson, downloadText, restoreFromFile, resetData],
  );

  return <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>;
}
