import { SignInForm } from "../sign-in-form";
import { __resetMockSession } from "@/api/mock/mock-api";
import { renderWithProviders } from "@/test-utils";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/auth/sign-in",
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  __resetMockSession();
  push.mockClear();
});

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm (mock transport)", () => {
  it("client validation blocks an invalid email before any submit", async () => {
    renderWithProviders(<SignInForm />);
    fillAndSubmit("not-an-email", "whatever");
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("demo owner signs in and is routed to organization selection (Phase 4)", async () => {
    renderWithProviders(<SignInForm />);
    fillAndSubmit("owner@demo.fluxeaze.test", "password123");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/auth/organizations"));
  });

  it("unverified email shows the verify-first alert with a resend action", async () => {
    renderWithProviders(<SignInForm />);
    fillAndSubmit("unverified@fluxeaze.test", "password123");
    expect(await screen.findByText("Please verify your email first")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resend verification email" }),
    ).toBeInTheDocument();
  });

  it("wrong credentials show a friendly invalid-credentials alert", async () => {
    renderWithProviders(<SignInForm />);
    fillAndSubmit("stranger@inbox.test", "password123");
    expect(
      await screen.findByText("Email or password is incorrect", undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
  });
});
