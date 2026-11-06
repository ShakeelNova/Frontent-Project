import { Alert } from "../alert";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Alert", () => {
  it("errors use role=alert and show the request ID", () => {
    render(
      <Alert variant="error" title="Failed" requestId="req-7">
        Details here.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    expect(screen.getByText("req-7")).toBeInTheDocument();
  });

  it("non-errors use role=status", () => {
    render(<Alert variant="success" title="Saved" />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});
