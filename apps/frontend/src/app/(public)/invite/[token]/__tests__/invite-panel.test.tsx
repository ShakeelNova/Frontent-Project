import { InvitePanel } from "../invite-panel";
import { renderWithProviders } from "@/test-utils";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navState = vi.hoisted(() => ({ token: "ready-token" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useParams: () => ({ token: navState.token }),
  usePathname: () => "/invite/x",
}));

describe("InvitePanel (mock transport)", () => {
  it("ready invite shows summary + password setup form", async () => {
    navState.token = "ready-token";
    renderWithProviders(<InvitePanel />);
    expect(await screen.findByText("Demo Academy (mock)")).toBeInTheDocument();
    expect(screen.getByLabelText(/Set your password/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept invitation" }),
    ).toBeInTheDocument();
  });

  it("pending-approval invite shows NO password setup", async () => {
    navState.token = "pending-token";
    renderWithProviders(<InvitePanel />);
    expect(
      await screen.findByText("Your invitation is being reviewed"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Set your password/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Accept invitation" }),
    ).not.toBeInTheDocument();
  });

  it("invalid invite shows the friendly dead-link state", async () => {
    navState.token = "bogus";
    renderWithProviders(<InvitePanel />);
    expect(
      await screen.findByText("This invite link is no longer valid"),
    ).toBeInTheDocument();
  });
});
