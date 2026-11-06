import { THEME_STORAGE_KEY, ThemeProvider, ThemeToggle } from "../theme";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeToggle", () => {
  it("toggles data-theme, aria-pressed and persists to localStorage only", () => {
    document.documentElement.dataset.theme = "light";
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    const toggle = screen.getByRole("button", { name: /Switch to dark theme/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: /Switch to light theme/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
