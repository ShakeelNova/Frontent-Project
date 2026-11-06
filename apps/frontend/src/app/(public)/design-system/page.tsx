import { DialogDemo, FeedbackDemo, FormDemo, ToastDemo } from "./demos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Label } from "@/components/ui/form-field";
import { Checkbox, Input, Radio, Select, Textarea } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Design system" };

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mt-12">
      <h2 id={`${id}-heading`} className="text-h3">
        {title}
      </h2>
      {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const COLOR_TOKENS = [
  { name: "--color-bg", className: "bg-bg" },
  { name: "--color-surface", className: "bg-surface" },
  { name: "--color-primary", className: "bg-primary" },
  { name: "--color-secondary", className: "bg-secondary" },
  { name: "--color-border", className: "bg-border" },
  { name: "--color-text", className: "bg-text" },
  { name: "--color-muted", className: "bg-muted" },
  { name: "--color-error", className: "bg-error" },
  { name: "--color-warning", className: "bg-warning" },
  { name: "--color-success", className: "bg-success" },
  { name: "--color-info", className: "bg-info" },
];

/**
 * Living showcase of the Fluxeaze design system (internal tooling surface).
 * If a primitive renders wrong anywhere, it renders wrong here first.
 * Reference: docs/design-system.md
 */
export default function DesignSystemPage() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      <p className="text-caption font-semibold tracking-wide text-secondary uppercase">
        Internal · Phase 2
      </p>
      <h1 className="mt-2">Design system</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Tokens and accessible primitives every Fluxeaze screen is built from.
        Toggle the theme in the top bar — every value below follows CSS
        variables. Full guidance lives in{" "}
        <code className="font-mono text-sm">docs/design-system.md</code>.
      </p>

      <Section id="colors" title="Colour tokens" description="Defined as CSS variables in globals.css; dark theme overrides values only.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COLOR_TOKENS.map((token) => (
            <li key={token.name} className="rounded-lg border border-border bg-surface p-3">
              <span className={`block h-10 rounded-md border border-border ${token.className}`} aria-hidden="true" />
              <code className="mt-2 block font-mono text-caption break-all">{token.name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="typography" title="Typography">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
          <p className="text-h1">Heading 1 — text-h1</p>
          <p className="text-h2">Heading 2 — text-h2</p>
          <p className="text-h3">Heading 3 — text-h3</p>
          <p className="text-h4">Heading 4 — text-h4</p>
          <p className="text-h5">Heading 5 — text-h5</p>
          <p className="text-h6">Heading 6 — text-h6</p>
          <p className="text-body">Body text — text-body. Manage less. Accomplish more.</p>
          <p className="text-sm text-muted">Small / muted helper text — text-sm text-muted.</p>
          <p className="text-caption text-muted">Caption — text-caption.</p>
        </div>
      </Section>

      <Section id="buttons" title="Buttons" description="Variants × sizes, plus loading and disabled states. Every control must work, be disabled with reason, or say 'not enabled yet'.">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button isLoading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      <Section id="forms" title="Form controls" description="FormField wires label, description and errors (aria-describedby / aria-invalid) so forms cannot forget it.">
        <div className="grid gap-6 rounded-lg border border-border bg-surface p-5 lg:grid-cols-2">
          <FormDemo />
          <div className="flex flex-col gap-4">
            <FormField label="Password">
              <Input type="password" autoComplete="new-password" placeholder="••••••••" />
            </FormField>
            <FormField label="Organization type" description="Native select — keyboard and mobile friendly.">
              <Select defaultValue="school">
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="academy">Academy</option>
                <option value="coaching">Coaching centre</option>
                <option value="technical">Technical / vocational institute</option>
              </Select>
            </FormField>
            <FormField label="Notes">
              <Textarea placeholder="Multi-line text…" />
            </FormField>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Attendance mode (demo)</legend>
              <label className="flex items-center gap-2 text-sm" htmlFor="demo-radio-manual">
                <Radio id="demo-radio-manual" name="demo-mode" value="manual" defaultChecked /> Manual
              </label>
              <label className="flex items-center gap-2 text-sm" htmlFor="demo-radio-qr">
                <Radio id="demo-radio-qr" name="demo-mode" value="qr" /> QR session
              </label>
            </fieldset>
            <label className="flex items-center gap-2 text-sm" htmlFor="demo-checkbox">
              <Checkbox id="demo-checkbox" defaultChecked /> Email me receipts (demo)
            </label>
            <div>
              <Label htmlFor="demo-invalid">Invalid example</Label>
              <Input id="demo-invalid" invalid aria-invalid="true" defaultValue="bad-value" className="mt-1.5" />
            </div>
          </div>
        </div>
      </Section>

      <Section id="badges-cards" title="Badges & cards" description="Badges pair colour with text — never colour alone (e.g. device 'Not configured' states).">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="success">Connected</Badge>
          <Badge variant="warning">Pending verification</Badge>
          <Badge variant="error">Not configured</Badge>
          <Badge variant="info">Draft</Badge>
        </div>
        <Card className="mt-4 max-w-xl">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description in muted text.</CardDescription>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted">Card body content.</p>
          </CardBody>
          <CardFooter>
            <Button size="sm" variant="subtle">Cancel</Button>
            <Button size="sm">Save (demo)</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section id="table" title="Table" description="Semantic <table> inside a labelled, horizontally scrollable region for small screens. Rows below are layout samples only.">
        <Table aria-label="Design system sample table">
          <TableCaption>Sample rows for layout demonstration — not business data.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>States</TableHead>
              <TableHead>Accessible name from</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Button</TableCell>
              <TableCell>primary / secondary / subtle / destructive</TableCell>
              <TableCell>loading, disabled</TableCell>
              <TableCell>Visible text</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Input</TableCell>
              <TableCell>text / email / password</TableCell>
              <TableCell>invalid, disabled</TableCell>
              <TableCell>FormField label</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Dialog</TableCell>
              <TableCell>standard / confirm</TableCell>
              <TableCell>open, confirming</TableCell>
              <TableCell>aria-labelledby → heading</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section id="dialogs" title="Dialogs">
        <DialogDemo />
      </Section>

      <Section id="toasts" title="Toasts" description="Central queue via useToast(); a single polite live region announces them.">
        <ToastDemo />
      </Section>

      <Section id="feedback" title="Loading, empty & error states" description="Every data screen ships all of these (plus validation + 403 copy from normalizeApiError).">
        <FeedbackDemo />
      </Section>
    </div>
  );
}
