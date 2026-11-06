"use client";

import { cn } from "@/lib/utils";
import { useRef, useState, type DragEvent } from "react";

/**
 * Accessible file dropzone with a real file input. The browser only hands
 * the file to the caller — nothing is uploaded or logged here.
 */
export function FileUpload({
  onFile,
  accept,
  label = "Upload a file",
  description,
  fileName,
  disabled,
  className,
}: {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
  description?: string;
  fileName?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && !disabled) onFile(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-5 py-8 text-center transition-colors",
        dragging ? "border-primary bg-primary-soft" : "border-input-border bg-surface-raised",
        disabled && "opacity-60",
        className,
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-primary shadow-sm">
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5" fill="currentColor">
          <path d="M10 3v8.2l2.8-2.8 1.1 1.1L10 14.4l-3.9-3.9 1.1-1.1L10 11.2V3h0ZM4 15h12v2H4v-2Z" />
        </svg>
      </span>
      <p className="text-sm font-medium text-text">{fileName ?? label}</p>
      {description ? <p className="max-w-sm text-caption text-faint">{description}</p> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-1 inline-flex min-h-8 items-center rounded-lg border border-border bg-surface px-3 text-caption font-medium text-text-secondary transition-colors hover:bg-surface-raised disabled:pointer-events-none disabled:opacity-60"
      >
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
