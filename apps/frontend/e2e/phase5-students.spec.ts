import { signInAs } from "./helpers";
import { expect, test } from "@playwright/test";

/**
 * Phase 5 E2E (dev mock transport): student directory (search/filter/
 * paginate), creation, detail (guardians, duplicate enrollment, transfer),
 * capacity-full blocking, academic-structure CRUD + in-use delete,
 * timetable with org-timezone display, empty + 404 states.
 */

async function gotoStudents(page: import("@playwright/test").Page) {
  await page.locator("aside").getByRole("link", { name: "Students", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Students", exact: true })).toBeVisible();
}

test("directory: search narrows, pagination pages, status filter works", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await gotoStudents(page);

  await expect(page.getByText("32 student(s)")).toBeVisible();
  await expect(page.getByText(/Page 1 of 4/)).toBeVisible();

  await page.getByLabel("Search by name or student ID").fill("Ayesha");
  await expect(page.getByRole("link", { name: "Ayesha Khan", exact: true })).toBeVisible();
  await expect(page.getByText("SUN-1001")).toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText(/Page 1 of 4/)).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/Page 2 of 4/)).toBeVisible();

  await page.getByLabel("Status").selectOption("alumni");
  await expect(page.getByRole("table").getByText("Alumni").first()).toBeVisible();
});

test("add student: creates a record that shows up in the directory", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await gotoStudents(page);

  await page.getByRole("button", { name: "Add student" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Full name/).fill("Zara Test");
  await dialog.getByLabel(/Date of birth/).fill("2012-05-01");
  await dialog.getByRole("button", { name: "Add student" }).click();

  await expect(page.getByText("Zara Test added")).toBeVisible();
  await page.getByLabel("Search by name or student ID").fill("Zara Test");
  await expect(page.getByRole("link", { name: "Zara Test", exact: true })).toBeVisible();
});

test("detail: guardians, duplicate-enrollment message, branch transfer", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await gotoStudents(page);
  await page.getByLabel("Search by name or student ID").fill("Ayesha");
  // Wait for the debounced search + refetch to settle before clicking.
  await expect(page.getByText("2 student(s)")).toBeVisible();
  // Dev-mode refetches can replace the row mid-click — retry the
  // navigation until the detail actually lands.
  await expect(async () => {
    await page.getByRole("link", { name: "Ayesha Khan", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ayesha Khan" })).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ timeout: 25_000 });
  await expect(page.getByText("Sadia Fatima")).toBeVisible();
  await expect(page.getByText(/Grade 9-A/)).toBeVisible(); // past enrollment
  await expect(page.locator("main").getByText("North campus").first()).toBeVisible(); // branch history

  // link a guardian
  await page.getByRole("button", { name: "Link guardian" }).click();
  const gDialog = page.getByRole("dialog");
  await gDialog.getByLabel(/Guardian full name/).fill("Uncle Guardian");
  await gDialog.getByRole("button", { name: "Link guardian" }).click();
  await expect(page.getByText("Uncle Guardian")).toBeVisible();

  // duplicate enrollment into her current class → specific message
  await page.getByRole("button", { name: "Enroll in program/class" }).click();
  const eDialog = page.getByRole("dialog");
  await eDialog.getByLabel(/Program/).selectOption({ label: "Matric Science" });
  await eDialog.getByLabel(/Class/).selectOption({ label: "Grade 10-A · Main campus · 2026–27" });
  await eDialog.getByRole("button", { name: "Enroll student" }).click();
  await expect(eDialog.getByText("Already enrolled", { exact: true })).toBeVisible();
  await expect(
    eDialog.getByText("This student is already enrolled in this program/class."),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // transfer to North campus with confirmation
  await page.getByRole("button", { name: "Transfer branch" }).click();
  const tDialog = page.getByRole("dialog");
  await tDialog.getByLabel(/Destination branch/).selectOption({ label: "North campus" });
  await tDialog.getByRole("button", { name: "Review transfer" }).click();
  await page.getByRole("button", { name: "Transfer student" }).click();
  await expect(page.getByText("Branch transfer completed")).toBeVisible();
  await expect(page.locator("main").getByText(/North campus/).first()).toBeVisible();
});

test("capacity full (Riverdale 100%): creating an active student is blocked with guidance", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Riverdale Coaching");
  await gotoStudents(page);

  await expect(page.getByText("10 student(s)")).toBeVisible(); // BM scope
  await page.getByRole("button", { name: "Add student" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Full name/).fill("Blocked Student");
  await dialog.getByLabel(/Date of birth/).fill("2012-01-01");
  await dialog.getByRole("button", { name: "Add student" }).click();

  await expect(dialog.getByText("Student capacity is full")).toBeVisible();
  await expect(
    dialog.getByText(/Existing students and records are unaffected/),
  ).toBeVisible();
  // form data is kept so the user doesn't lose work
  await expect(dialog.getByLabel(/Full name/)).toHaveValue("Blocked Student");
});

test("student not found renders a clear 404 state (no crash)", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  // A hard navigation resets the in-memory dev-mock session; the portal
  // gate bounces to sign-in with ?next= — signing in again (org choice is
  // kept in sessionStorage) lands back on the missing student.
  await page.goto("/portal/students/stu-does-not-exist");
  await expect(page).toHaveURL(/\/auth\/sign-in\?next=/);
  await page.getByLabel(/^Email/).fill("owner@demo.fluxeaze.test");
  await page.getByLabel(/^Password/).fill("password123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Student not found" })).toBeVisible();
});

test("fresh org: empty directory with add/import CTAs", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Fresh Start Institute");
  await gotoStudents(page);
  await expect(page.getByText("No students yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add student" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Import students" }).first()).toBeVisible();
});

test("academics: program CRUD, in-use delete is explained, timetable shows org-timezone times", async ({ page }) => {
  await signInAs(page, "owner@demo.fluxeaze.test", "Sunrise Academy");
  await page.locator("aside").getByRole("link", { name: "Academic structure" }).click();
  await expect(page.getByRole("heading", { name: "Academic years" })).toBeVisible();
  await expect(page.getByText("2026–27")).toBeVisible();
  await expect(page.getByText("Current", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Programs" }).click();
  await page.getByRole("button", { name: "Add program" }).click();
  const pDialog = page.getByRole("dialog");
  await pDialog.getByLabel(/Program name/).fill("Robotics Club");
  await pDialog.getByLabel(/Code/).fill("ROBO");
  await pDialog.getByRole("button", { name: "Create program" }).click();
  await expect(page.getByText("Robotics Club")).toBeVisible();

  // deleting an in-use program → backend rejection surfaced
  await page.getByRole("button", { name: "Delete Matric Science" }).click();
  await page.getByRole("button", { name: "Delete program" }).click();
  await expect(page.getByText("Program is in use")).toBeVisible();

  // timetable: UTC 03:00 → 08:00 in Asia/Karachi
  await page.getByRole("link", { name: "Classes & batches" }).click();
  const row = page.getByRole("row", { name: /Grade 9-A/ });
  await row.getByRole("link", { name: "Timetable" }).click();
  await expect(page.getByText(/Timetable — Grade 9-A/)).toBeVisible();
  await expect(page.getByText("Monday")).toBeVisible();
  await expect(page.getByText(/08:00/).first()).toBeVisible();

  await page.getByRole("button", { name: "Add session" }).first().click();
  const sDialog = page.getByRole("dialog");
  await sDialog.getByLabel(/Weekday/).selectOption({ label: "Tuesday" });
  await sDialog.getByLabel(/Subject/).selectOption({ label: "Computer Science" });
  await sDialog.getByRole("button", { name: "Add session" }).click();
  await expect(page.getByText("Session added")).toBeVisible();
  await expect(page.getByText("Computer Science")).toBeVisible();
});
