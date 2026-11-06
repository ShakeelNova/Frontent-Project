"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "fluxeaze-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>.");
  return ctx;
}

/**
 * The theme lives OUTSIDE React state: the source of truth is the
 * `data-theme` attribute on <html> (set pre-paint by THEME_INIT_SCRIPT),
 * observed via useSyncExternalStore — hydration-safe, no effect syncing.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(next: Theme): void {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* Storage unavailable (private mode etc.) — theme still applies. */
  }
  listeners.forEach((listener) => listener());
}

/**
 * Light/dark theme via CSS variables ([data-theme="dark"] in globals.css).
 * Preference persists in localStorage ONLY (a non-sensitive UI preference —
 * the single sanctioned use of web storage in this app; auth/session tokens
 * must never be stored there).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggleTheme = useCallback(() => {
    applyTheme(getThemeSnapshot() === "dark" ? "light" : "dark");
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Pre-paint script (root layout): stored choice → OS preference → light. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="light";}})();`;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border " +
        "bg-surface text-text hover:bg-surface-raised " +
        (className ?? "")
      }
    >
      {isDark ? (
        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true" fill="currentColor">
          <path d="M10 2a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm4 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm3-1h-1a1 1 0 1 1 0 2h1a1 1 0 1 1 0-2zM4 9H3a1 1 0 1 0 0 2h1a1 1 0 1 0 0-2zm9.2-4.2.7-.7a1 1 0 1 0-1.4-1.4l-.7.7a1 1 0 1 0 1.4 1.4zM8.2 15.6l-.7.7a1 1 0 1 0 1.4 1.4l.7-.7a1 1 0 1 0-1.4-1.4zm7.1 2.1a1 1 0 0 0 1.4-1.4l-.7-.7a1 1 0 1 0-1.4 1.4l.7.7zM6.8 4.8l-.7-.7A1 1 0 1 0 4.7 5.5l.7.7a1 1 0 1 0 1.4-1.4zM10 16a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1z" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true" fill="currentColor">
          <path d="M17.3 13.5A8.5 8.5 0 1 1 6.5 2.7a.6.6 0 0 1 .9.7 7 7 0 0 0 9.2 9.2.6.6 0 0 1 .7.9z" />
        </svg>
      )}
    </button>
  );
}
