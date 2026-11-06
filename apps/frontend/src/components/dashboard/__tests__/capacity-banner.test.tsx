import { CapacityBanner } from "@/components/dashboard/capacity-banner";
import { renderWithProviders } from "@/test-utils";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("CapacityBanner", () => {
  it("renders nothing below 80%", () => {
    renderWithProviders(
      <CapacityBanner capacity={{ activeStudents: 50, capacityLimit: 100, usagePercent: 50 }} />,
    );
    // (the ToastProvider viewport always renders; the banner itself must not)
    expect(screen.queryByText(/capacity/i)).not.toBeInTheDocument();
  });

  it("warns at 85% without blocking language", () => {
    renderWithProviders(
      <CapacityBanner capacity={{ activeStudents: 85, capacityLimit: 100, usagePercent: 85 }} />,
    );
    expect(screen.getByText(/capacity above 80%/i)).toBeInTheDocument();
  });

  it("at 100% says new enrollments blocked but existing records stay accessible", () => {
    renderWithProviders(
      <CapacityBanner capacity={{ activeStudents: 100, capacityLimit: 100, usagePercent: 100 }} />,
    );
    expect(screen.getByText(/new enrollments blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Existing records.*remain fully accessible/i)).toBeInTheDocument();
  });
});
