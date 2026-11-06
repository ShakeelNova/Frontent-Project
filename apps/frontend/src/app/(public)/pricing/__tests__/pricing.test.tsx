import { PricingPlans } from "../pricing-plans";
import { getPublishedPlans } from "@/api/services/plans";
import { renderWithProviders } from "@/test-utils";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/services/plans", () => ({ getPublishedPlans: vi.fn() }));
const mocked = vi.mocked(getPublishedPlans);

describe("PricingPlans states", () => {
  it("renders published plans with API-formatted prices and allowances", async () => {
    mocked.mockResolvedValue({
      kind: "ok",
      plans: [
        {
          id: "p1",
          name: "Starter",
          priceMinor: 1900,
          currency: "USD",
          billingPeriod: "month",
          allowances: [{ label: "Active students", amount: 300, unit: "students" }],
        },
        {
          id: "p2",
          name: "Enterprise / Custom",
          priceMinor: null,
          currency: "USD",
          allowances: [{ label: "Active students", amount: null, unit: "custom" }],
        },
      ],
    });
    renderWithProviders(<PricingPlans />);
    expect(await screen.findByText("$19.00")).toBeInTheDocument();
    expect(screen.getByText("300 students")).toBeInTheDocument();
    expect(screen.getByText("Custom pricing")).toBeInTheDocument();
  });

  it("empty/unavailable shows the no-fabrication message with pilot CTA", async () => {
    mocked.mockResolvedValue({ kind: "unavailable" });
    renderWithProviders(<PricingPlans />);
    expect(await screen.findByText("Plans are being prepared")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a pilot" })).toHaveAttribute(
      "href",
      "/request-pilot",
    );
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("error shows retry", async () => {
    mocked.mockRejectedValue({ status: 503, requestId: "req-1" });
    renderWithProviders(<PricingPlans />);
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText("req-1")).toBeInTheDocument();
  });
});
