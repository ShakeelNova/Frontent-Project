import { EmptyState } from "../empty-state";
import { ErrorState } from "../error-state";
import { PageLoading } from "../page-loading";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(
      <EmptyState
        title="No students yet"
        description="Import or add your first student."
        action={<button type="button">Add student</button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "No students yet" })).toBeInTheDocument();
    expect(screen.getByText("Import or add your first student.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add student" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("shows friendly 403 copy, preserves request ID, retries", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        error={{ status: 403, requestId: "req-abc-123" }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/permission/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc-123")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("explicit title/description override normalized copy", () => {
    render(<ErrorState title="Custom failure" description="Custom detail" />);
    expect(screen.getByText("Custom failure")).toBeInTheDocument();
    expect(screen.getByText("Custom detail")).toBeInTheDocument();
  });
});

describe("PageLoading", () => {
  it("announces loading via role=status", () => {
    render(<PageLoading label="Loading students…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading students…");
  });
});
