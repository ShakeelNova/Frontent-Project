import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AreaChart, BarChart, Donut, Sparkline } from "@/components/ui/charts";
import { FileUpload } from "@/components/ui/file-upload";
import { SearchInput, Switch } from "@/components/ui/input";
import { Breadcrumbs, Pagination, Tabs } from "@/components/ui/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const POINTS = [
  { label: "Mon", value: 62 },
  { label: "Tue", value: 74 },
  { label: "Wed", value: 68 },
  { label: "Thu", value: 82 },
];

describe("premium design system", () => {
  it("renders KPI cards, charts and a page header", () => {
    render(
      <div>
        <StatCard label="Total students" value="1,248" trend={12.5} spark={[1, 2, 3, 4]} />
        <AreaChart data={POINTS} />
        <BarChart data={POINTS} />
        <Donut value={94} label="94%" caption="this week" />
        <Sparkline data={[1, 2, 3]} />
        <PageHeader
          title="Students"
          description="Manage every student record."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Students" }]}
        />
      </div>,
    );
    expect(screen.getByText("Total students")).toBeInTheDocument();
    expect(screen.getByText("1,248")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Students" })).toBeInTheDocument();
    expect(screen.getByText("94%")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders navigation, controls and feedback primitives", () => {
    render(
      <div>
        <Tabs
          tabs={[
            { id: "all", label: "All", count: 12 },
            { id: "active", label: "Active", count: 8 },
          ]}
          value="all"
          onChange={() => undefined}
        />
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Students" }]} />
        <Pagination page={2} pageSize={10} total={42} onPageChange={() => undefined} />
        <Avatar name="Ayesha Khan" />
        <Progress value={72} label="Capacity used" />
        <Switch checked label="Email notifications" onCheckedChange={() => undefined} />
        <SearchInput placeholder="Search students" aria-label="Search students" />
        <FileUpload onFile={() => undefined} label="Upload CSV" />
        <Badge variant="success" dot>Active student</Badge>
        <Button>Continue</Button>
      </div>,
    );
    expect(screen.getByRole("tab", { name: /All/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Active/ })).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
    expect(screen.getByText("AK")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Email notifications" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search students")).toBeInTheDocument();
    expect(screen.getByText("Upload CSV")).toBeInTheDocument();
    expect(screen.getByText("Active student")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });
});
