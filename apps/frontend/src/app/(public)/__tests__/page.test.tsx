import LandingPage from "../page";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("LandingPage", () => {
  it("renders the premium hero and primary CTAs", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        name: /one calm workspace/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Request a pilot" })[0]).toHaveAttribute(
      "href",
      "/request-pilot",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  it("covers the four feature areas and the premium hero", () => {
    render(<LandingPage />);
    for (const title of [
      "Central operations & attendance",
      "Multi-branch visibility",
      "Students & staff, end to end",
      "Fee tracking & collections",
    ]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: /one calm workspace/i })).toBeInTheDocument();
  });
});
