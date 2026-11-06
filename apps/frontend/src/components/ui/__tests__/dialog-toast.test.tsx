import { Button } from "../button";
import { Dialog } from "../dialog";
import { ToastProvider, useToast } from "../toast";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

function DialogHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        title="Test dialog"
        description="Dialog description"
        footer={<Button>Confirm action</Button>}
      >
        <p>Dialog body</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("exposes dialog semantics, traps initial focus, closes on Escape", () => {
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Test dialog" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Dialog body")).toBeInTheDocument();
    // First focusable (close button) receives focus on open.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close dialog" }),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on backdrop click but not on panel click", () => {
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByTestId("dialog-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cycles Tab focus from last back to first focusable", () => {
    render(<DialogHarness onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const closeBtn = screen.getByRole("button", { name: "Close dialog" });
    const confirmBtn = screen.getByRole("button", { name: "Confirm action" });
    confirmBtn.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);
  });
});

function ToastHarness() {
  const { toast } = useToast();
  return (
    <Button
      onClick={() =>
        toast({ title: "Saved", description: "All good", variant: "success", duration: 0 })
      }
    >
      Notify
    </Button>
  );
}

describe("ToastProvider", () => {
  it("queues a toast in the polite live region and supports dismissal", () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    const region = screen.getByRole("status", { name: "Notifications" });
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Saved")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Dismiss notification: Saved/ }));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("useToast throws outside the provider", () => {
    function Orphan() {
      useToast();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/ToastProvider/);
  });
});
