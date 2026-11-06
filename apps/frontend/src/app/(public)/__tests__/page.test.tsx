import LandingPage from "../page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("LandingPage", () => {
  it("renders the hero with both brand lines and primary CTAs", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /Education Operations OS for multi-branch institutes/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Make work flow easier\./)).toBeInTheDocument();
    expect(screen.getByText(/Manage less\. Accomplish more\./)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Request a pilot" })[0]).toHaveAttribute(
      "href",
      "/request-pilot",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  it("covers the four feature areas and makes no live claims for deferred integrations", () => {
    render(<LandingPage />);
    for (const title of [
      "Central operations & attendance",
      "Multi-branch visibility & dashboards",
      "Student & staff management",
      "Fee tracking & collections",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByText(/not live features —/i)).toBeInTheDocument();
  });
});
