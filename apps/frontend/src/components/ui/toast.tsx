"use client";

import { cn } from "@/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. 0 = sticky until dismissed. Default 5000. */
  duration?: number;
}

export interface ToastItem extends Required<Omit<ToastInput, "description">> {
  id: number;
  description?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const MAX_TOASTS = 5;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>.");
  }
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { bar: string; label: string }> = {
  success: { bar: "bg-success", label: "Success" },
  error: { bar: "bg-error", label: "Error" },
  warning: { bar: "bg-warning", label: "Warning" },
  info: { bar: "bg-info", label: "Information" },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    if (item.duration <= 0) return;
    const timer = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  const style = VARIANT_STYLES[item.variant];
  return (
    <div className="pointer-events-auto flex w-full gap-3 overflow-hidden rounded-lg border border-border bg-surface shadow-md">
      <span aria-hidden="true" className={cn("w-1.5 shrink-0", style.bar)} />
      <div className="min-w-0 flex-1 py-3">
        <p className="text-sm font-semibold text-text">
          <span className="sr-only">{style.label}: </span>
          {item.title}
        </p>
        {item.description ? (
          <p className="mt-0.5 text-sm text-muted">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label={`Dismiss notification: ${item.title}`}
        className="m-2 inline-flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-md text-muted hover:bg-surface-raised hover:text-text"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="currentColor">
          <path d="M6.3 5.2 10 8.9l3.7-3.7 1.1 1.1L11.1 10l3.7 3.7-1.1 1.1L10 11.1l-3.7 3.7-1.1-1.1 3.7-3.7-3.7-3.7 1.1-1.1z" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Central notification queue. Announcements go through a single polite
 * ARIA live region so screen readers hear toasts without focus theft.
 * Mounted once in the root Providers — available in every route group.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) =>
      [
        ...current,
        {
          id,
          title: input.title,
          description: input.description,
          variant: input.variant ?? "info",
          duration: input.duration ?? 5000,
        },
      ].slice(-MAX_TOASTS),
    );
    return id;
  }, []);

  const value = useMemo(
    () => ({ toasts, toast, dismiss }),
    [toasts, toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
