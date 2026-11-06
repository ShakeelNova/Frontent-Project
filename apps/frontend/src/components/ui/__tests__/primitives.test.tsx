import { Badge } from "../badge";
import { Button } from "../button";
import { FormField } from "../form-field";
import { Input } from "../input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("Button", () => {
  it("defaults to type=button and fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    button.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("loading state disables, sets aria-busy and announces Loading", () => {
    render(<Button isLoading>Saving</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("applies destructive variant styling hook", () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain("bg-error");
  });
});

describe("FormField", () => {
  it("associates label, description and error with the control", () => {
    render(
      <FormField label="Email" description="Work email" error="Invalid email" required>
        <Input type="email" />
      </FormField>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toBeRequired();
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("-description");
    expect(describedBy).toContain("-error");
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email");
    expect(screen.getByText("(required)")).toBeInTheDocument();
  });

  it("omits error wiring when there is no error", () => {
    render(
      <FormField label="Name">
        <Input type="text" />
      </FormField>,
    );
    const input = screen.getByLabelText("Name");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Badge & Table", () => {
  it("renders badge text (never colour alone)", () => {
    render(<Badge variant="error">Not configured</Badge>);
    expect(screen.getByText("Not configured")).toBeInTheDocument();
  });

  it("renders a semantic table inside a labelled scroll region", () => {
    render(
      <Table aria-label="Students demo">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Alice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("region", { name: "Students demo" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("scope", "col");
    expect(screen.getByRole("cell", { name: "Alice" })).toBeInTheDocument();
  });
});
