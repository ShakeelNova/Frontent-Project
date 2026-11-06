import { PilotForm } from "../pilot-form";
import { renderWithProviders } from "@/test-utils";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/request-pilot",
}));

function fillRequired(email = "ayesha@sunrise-academy.test") {
  fireEvent.change(screen.getByLabelText(/Organization name/), {
    target: { value: "Sunrise Academy" },
  });
  fireEvent.change(screen.getByLabelText(/Contact person/), {
    target: { value: "Ayesha Khan" },
  });
  fireEvent.change(screen.getByLabelText(/Work email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Country/), { target: { value: "Pakistan" } });
}

describe("PilotForm (mock transport)", () => {
  it("valid submission reaches the success panel with next steps", async () => {
    renderWithProviders(<PilotForm />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Request a pilot" }));
    expect(
      await screen.findByRole("heading", { name: /Request received/i }, { timeout: 10000 }),
    ).toBeInTheDocument();
  });

  it("server field error lands on the field and preserves entries", async () => {
    renderWithProviders(<PilotForm />);
    // fireEvent sets the value directly (client regex would also flag the
    // domain only if format were invalid — it is well-formed, so the
    // server-side rule is what rejects it).
    fillRequired("ops@example.invalid");
    fireEvent.click(screen.getByRole("button", { name: "Request a pilot" }));
    expect(
      await screen.findByText(/can't receive mail/i, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization name/)).toHaveValue("Sunrise Academy");
  });

  it("required-field validation renders field errors without submitting", async () => {
    renderWithProviders(<PilotForm />);
    fireEvent.click(screen.getByRole("button", { name: "Request a pilot" }));
    expect(
      await screen.findByText("Enter your organization's name."),
    ).toBeInTheDocument();
  });
});
