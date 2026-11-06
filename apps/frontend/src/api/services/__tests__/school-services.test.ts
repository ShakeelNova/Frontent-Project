import { __resetMockSession as resetAuthSession } from "@/api/mock/mock-api";
import { __resetMockPortal } from "@/api/mock/mock-portal";
import { __resetMockSchool } from "@/api/mock/mock-school";
import {
  createAcademicYear,
  createProgram,
  deleteClass,
  deleteProgram,
  getTimetable,
  addTimetableEntry,
  listAcademicYears,
  listClasses,
} from "@/api/services/academics";
import { signIn } from "@/api/services/auth";
import {
  createStudent,
  enrollStudent,
  getStudent,
  listStudents,
  transferStudent,
  updateStudentStatus,
} from "@/api/services/students";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(async () => {
  resetAuthSession();
  __resetMockPortal();
  __resetMockSchool();
  await signIn({ email: "owner@demo.fluxeaze.test", password: "password123" });
});

describe("student directory (mock transport)", () => {
  it("paginates server-side with totals", async () => {
    const page1 = await listStudents("org-sunrise", { page: 1, pageSize: 10 });
    expect(page1.total).toBe(32);
    expect(page1.items).toHaveLength(10);
    const page4 = await listStudents("org-sunrise", { page: 4, pageSize: 10 });
    expect(page4.items).toHaveLength(2);
    expect(page4.items[0]?.id).not.toBe(page1.items[0]?.id);
  });

  it("searches by name/code and filters by status/branch/program", async () => {
    const byName = await listStudents("org-sunrise", { page: 1, pageSize: 10, search: "Ayesha" });
    expect(byName.items.map((s) => s.id)).toContain("stu-sun-1");
    const anchor = byName.items.find((s) => s.id === "stu-sun-1");
    expect(anchor?.currentClassName).toBe("Grade 10-A");

    const alumni = await listStudents("org-sunrise", { page: 1, pageSize: 50, status: "alumni" });
    expect(alumni.total).toBeGreaterThan(0);
    expect(alumni.items.every((s) => s.status === "alumni")).toBe(true);

    const north = await listStudents("org-sunrise", {
      page: 1,
      pageSize: 50,
      branchId: "br-sunrise-north",
    });
    expect(north.items.every((s) => s.branchId === "br-sunrise-north")).toBe(true);

    const matric = await listStudents("org-sunrise", {
      page: 1,
      pageSize: 50,
      programId: "sun-prog-matric",
    });
    expect(matric.total).toBeGreaterThan(0);
    expect(matric.items.every((s) => s.currentProgramName === "Matric Science")).toBe(true);
  });

  it("branch manager only ever sees authorized-branch students", async () => {
    const list = await listStudents("org-riverdale", { page: 1, pageSize: 50 });
    expect(list.total).toBe(10); // 4 Clifton students are invisible
    expect(list.items.every((s) => s.branchId === "br-riverdale-gulberg")).toBe(true);
    await expect(getStudent("org-riverdale", "stu-riv-12")).rejects.toMatchObject({
      code: "BRANCH_FORBIDDEN",
    });
    await expect(
      listStudents("org-riverdale", { page: 1, pageSize: 10, branchId: "br-riverdale-clifton" }),
    ).rejects.toMatchObject({ code: "BRANCH_FORBIDDEN" });
  });

  it("unknown student is a clean 404", async () => {
    await expect(getStudent("org-sunrise", "stu-nope")).rejects.toMatchObject({
      code: "STUDENT_NOT_FOUND",
      status: 404,
    });
  });

  it("fresh org directory is empty", async () => {
    const list = await listStudents("org-fresh", { page: 1, pageSize: 10 });
    expect(list.total).toBe(0);
  });
});

describe("student mutations (mock transport)", () => {
  it("creates a student with an initial enrollment", async () => {
    const created = await createStudent("org-sunrise", {
      fullName: "Test Student",
      dateOfBirth: "2012-05-01",
      branchId: "br-sunrise-main",
      programId: "sun-prog-matric",
      classId: "sun-cls-g9a",
      enrollmentStartDate: "2026-08-01",
    });
    expect(created.status).toBe("active");
    expect(created.currentClassName).toBe("Grade 9-A");
    const list = await listStudents("org-sunrise", { page: 1, pageSize: 10, search: "Test Student" });
    expect(list.total).toBe(1);
  });

  it("creating an active student at 100% capacity is blocked (backend rule)", async () => {
    await expect(
      createStudent("org-riverdale", {
        fullName: "Blocked Student",
        dateOfBirth: "2012-01-01",
        branchId: "br-riverdale-gulberg",
      }),
    ).rejects.toMatchObject({ code: "STUDENT_CAPACITY_FULL" });
  });

  it("reactivating at 100% capacity is also blocked", async () => {
    const inactive = await getStudent("org-riverdale", "stu-riv-7");
    expect(inactive.status).toBe("inactive");
    await expect(
      updateStudentStatus("org-riverdale", "stu-riv-7", "active"),
    ).rejects.toMatchObject({ code: "STUDENT_CAPACITY_FULL" });
  });

  it("duplicate active enrollment is rejected with ALREADY_ENROLLED", async () => {
    const anchor = await getStudent("org-sunrise", "stu-sun-1");
    expect(anchor.currentClassId).toBe("sun-cls-g10a");
    await expect(
      enrollStudent("org-sunrise", "stu-sun-1", {
        programId: "sun-prog-matric",
        classId: "sun-cls-g10a",
        startsOn: "2026-08-01",
      }),
    ).rejects.toMatchObject({ code: "ALREADY_ENROLLED" });
  });

  it("transfer moves the student and appends branch history", async () => {
    const before = await getStudent("org-sunrise", "stu-sun-1");
    expect(before.branchHistory).toHaveLength(2);
    const after = await transferStudent("org-sunrise", "stu-sun-1", {
      toBranchId: "br-sunrise-north",
      effectiveOn: "2026-11-01",
    });
    expect(after.branchName).toBe("North campus");
    expect(after.branchHistory).toHaveLength(3);
    expect(after.branchHistory.at(-1)).toMatchObject({
      branchId: "br-sunrise-north",
      from: "2026-11-01",
      to: null,
    });
  });
});

describe("academic structure (mock transport)", () => {
  it("years come with backend-decided isCurrent", async () => {
    const years = await listAcademicYears("org-sunrise");
    expect(years.find((y) => y.isCurrent)?.label).toBe("2026–27");
    const created = await createAcademicYear("org-fresh", {
      label: "2020–30",
      startsOn: "2020-01-01",
      endsOn: "2030-12-31",
    });
    expect(created.isCurrent).toBe(true);
  });

  it("branch managers cannot mutate structure (403)", async () => {
    await expect(
      createProgram("org-riverdale", { name: "Nope", code: "NOP" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("in-use deletes are rejected with stable codes", async () => {
    await expect(deleteProgram("org-sunrise", "sun-prog-matric")).rejects.toMatchObject({
      code: "PROGRAM_IN_USE",
    });
    await expect(deleteClass("org-sunrise", "sun-cls-g10a")).rejects.toMatchObject({
      code: "CLASS_IN_USE",
    });
    const temp = await createProgram("org-sunrise", { name: "Temp Program", code: "TMP" });
    await expect(deleteProgram("org-sunrise", temp.id)).resolves.toBeUndefined();
  });

  it("classes are branch-scoped for branch managers", async () => {
    const classes = await listClasses("org-riverdale");
    expect(classes.map((c) => c.id)).toEqual(["riv-cls-md1", "riv-cls-ec1"]);
  });

  it("timetable: demo class has sessions, others start empty; entries can be added", async () => {
    const demo = await getTimetable("org-sunrise", "sun-cls-g9a");
    expect(demo.length).toBeGreaterThan(0);
    expect(demo[0]?.startsAtUtc).toMatch(/^\d{2}:\d{2}$/);
    const empty = await getTimetable("org-sunrise", "sun-cls-ics1");
    expect(empty).toEqual([]);
    const entry = await addTimetableEntry("org-sunrise", "sun-cls-ics1", {
      weekday: 2,
      startsAtUtc: "04:00",
      endsAtUtc: "04:45",
      subjectId: "sun-sub-cs",
    });
    expect(entry.subjectName).toBe("Computer Science");
    expect(await getTimetable("org-sunrise", "sun-cls-ics1")).toHaveLength(1);
  });
});
