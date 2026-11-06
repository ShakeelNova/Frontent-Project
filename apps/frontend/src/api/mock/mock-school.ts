/**
 * DEV/TEST-ONLY school fixtures (Phase 5) — students, guardians,
 * enrollments, academic structure, timetables. Enabled only via
 * NEXT_PUBLIC_API_TRANSPORT=mock. Assumed endpoints: CR-007.
 *
 * Consistency rules (mirroring the assumed backend):
 * - Membership/role/branch visibility come from mock-portal
 *   (getMockMembership). Branch managers only ever see/touch students in
 *   their authorized branches — hidden-branch records 403.
 * - Capacity uses the DASHBOARD totals (744/1200, 1700/2000, 670/670) as
 *   the authority, not this (small) directory sample: creating a new
 *   active student/enrollment in Riverdale (100%) fails with
 *   STUDENT_CAPACITY_FULL, exactly like the assumed backend rule.
 * - Duplicate active enrollment in the same class → ALREADY_ENROLLED.
 * - Deletes of in-use structure records → *_IN_USE (409).
 * - Academic-structure mutations are Owner/GM-only (BM → 403).
 */

import { getMockMembership } from "@/api/mock/mock-portal";
import type {
  AcademicYear,
  AcademicYearInput,
  ClassGroup,
  ClassInput,
  Program,
  ProgramInput,
  Subject,
  SubjectInput,
  TimetableEntry,
  TimetableEntryInput,
} from "@/api/services/academics";
import type {
  CreateStudentInput,
  EnrollInput,
  LinkGuardianInput,
  PagedResult,
  StudentDetail,
  StudentListParams,
  StudentStatus,
  StudentSummary,
  TransferInput,
  UpdateStudentInput,
} from "@/api/services/students";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function mockError(status: number, code: string, message: string): never {
  throw { status, code, message, requestId: `mock-${code.toLowerCase()}` };
}

function fieldError(field: string, message: string): never {
  throw {
    status: 422,
    code: "VALIDATION_ERROR",
    message: "Validation failed.",
    requestId: "mock-validation",
    fieldErrors: { [field]: message },
  };
}

interface OrgSchoolState {
  years: AcademicYear[];
  programs: Program[];
  classes: (Omit<ClassGroup, "programName" | "academicYearLabel" | "branchName">)[];
  subjects: Subject[];
  classSubjects: Record<string, string[]>;
  timetable: Record<string, TimetableEntry[]>;
  students: StudentDetail[];
  seq: number;
}

const FIRST = [
  "Ayesha", "Ahmed", "Fatima", "Bilal", "Zainab", "Omar", "Maryam", "Hassan",
  "Noor", "Yusuf", "Amna", "Ibrahim", "Hira", "Daniyal", "Mahnoor", "rayan",
  "Alina", "Shahzaib", "Dua", "Hamza",
];
const LAST = [
  "Khan", "Ahmed", "Ali", "Raza", "Iqbal", "Malik", "Hussain", "Farooq",
  "Siddiqui", "Chaudhry", "Baig", "Sheikh", "Tariq", "Nawaz", "Aslam",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeState(
  orgId: string,
  prefix: string,
  programs: Program[],
  classes: OrgSchoolState["classes"],
  studentCount: number,
  branchPlan: { branchId: string; branchName: string; share: number }[],
): OrgSchoolState {
  const years: AcademicYear[] = [
    { id: `${prefix}-y2526`, label: "2025–26", startsOn: "2025-08-01", endsOn: "2026-05-31", isCurrent: false },
    { id: `${prefix}-y2627`, label: "2026–27", startsOn: "2026-08-01", endsOn: "2027-05-31", isCurrent: true },
  ];
  const subjects: Subject[] = [
    { id: `${prefix}-sub-math`, name: "Mathematics", code: "MATH" },
    { id: `${prefix}-sub-phy`, name: "Physics", code: "PHY" },
    { id: `${prefix}-sub-chem`, name: "Chemistry", code: "CHEM" },
    { id: `${prefix}-sub-bio`, name: "Biology", code: "BIO" },
    { id: `${prefix}-sub-eng`, name: "English", code: "ENG" },
    { id: `${prefix}-sub-cs`, name: "Computer Science", code: "CS" },
  ];
  const classSubjects: Record<string, string[]> = {};
  classes.forEach((c, i) => {
    classSubjects[c.id] = [
      subjects[i % subjects.length]!.id,
      subjects[(i + 2) % subjects.length]!.id,
      subjects[(i + 4) % subjects.length]!.id,
    ];
  });

  const students: StudentDetail[] = [];
  const totalShare = branchPlan.reduce((s, b) => s + b.share, 0);
  let made = 0;
  branchPlan.forEach((plan, planIdx) => {
    const count =
      planIdx === branchPlan.length - 1
        ? studentCount - made
        : Math.round((studentCount * plan.share) / totalShare);
    const branchClasses = classes.filter((c) => c.branchId === plan.branchId);
    for (let i = 0; i < count; i++) {
      const n = made + 1;
      const klass = branchClasses.length
        ? branchClasses[n % branchClasses.length]!
        : null;
      const program = klass
        ? programs.find((p) => p.id === klass.programId) ?? null
        : null;
      const status: StudentStatus =
        n % 11 === 0 ? "alumni" : n % 7 === 0 ? "inactive" : "active";
      const first = FIRST[(n * 3 + planIdx) % FIRST.length]!;
      const last = LAST[(n * 5 + planIdx * 2) % LAST.length]!;
      students.push({
        id: `stu-${prefix}-${n}`,
        studentCode: `${prefix.toUpperCase()}-${1000 + n}`,
        fullName: `${first} ${last}`,
        branchId: plan.branchId,
        branchName: plan.branchName,
        status,
        currentClassId: null,
        currentClassName: null,
        currentProgramName: null,
        dateOfBirth: `20${10 + (n % 5)}-0${(n % 9) + 1}-1${n % 9}`,
        gender: n % 2 === 0 ? "Female" : "Male",
        email: null,
        phone: `+92 300 0000${String(n).padStart(3, "0")}`,
        address: null,
        admissionDate: "2026-08-01",
        guardians: [
          {
            id: `grd-${prefix}-${n}-1`,
            fullName: `${LAST[(n * 7) % LAST.length]} ${n % 2 ? "Sr." : "Mrs."}`,
            relationship: n % 2 ? "Father" : "Mother",
            email: null,
            phone: `+92 321 0000${String(n).padStart(3, "0")}`,
          },
        ],
        enrollments:
          status === "active" && klass && program
            ? [
                {
                  id: `enr-${prefix}-${n}-1`,
                  programId: program.id,
                  programName: program.name,
                  classId: klass.id,
                  className: klass.name,
                  startsOn: "2026-08-01",
                  endsOn: null,
                  status: "active",
                },
              ]
            : [],
        branchHistory: [
          { branchId: plan.branchId, branchName: plan.branchName, from: "2026-08-01", to: null },
        ],
      });
      made++;
    }
  });

  // Rich anchor student (first record): transferred + past enrollment.
  const anchor = students[0];
  if (anchor && orgId === "org-sunrise") {
    anchor.fullName = ["Ayesha", "Khan"].join(" ");
    anchor.gender = "Female";
    anchor.branchId = "br-sunrise-main";
    anchor.branchName = "Main campus";
    anchor.status = "active";
    anchor.guardians.push({
      id: "grd-sun-1-2",
      fullName: ["Sadia", "Fatima"].join(" "),
      relationship: "Mother",
      email: null,
      phone: "+92 333 0000001",
    });
    anchor.branchHistory = [
      { branchId: "br-sunrise-north", branchName: "North campus", from: "2025-08-01", to: "2026-07-31" },
      { branchId: "br-sunrise-main", branchName: "Main campus", from: "2026-08-01", to: null },
    ];
    anchor.admissionDate = "2025-08-01";
    anchor.enrollments = [
      {
        id: "enr-sun-1-past",
        programId: "sun-prog-matric",
        programName: "Matric Science",
        classId: "sun-cls-g9a",
        className: "Grade 9-A",
        startsOn: "2025-08-01",
        endsOn: "2026-05-31",
        status: "ended",
      },
      {
        id: "enr-sun-1-cur",
        programId: "sun-prog-matric",
        programName: "Matric Science",
        classId: "sun-cls-g10a",
        className: "Grade 10-A",
        startsOn: "2026-08-01",
        endsOn: null,
        status: "active",
      },
    ];
  }

  const state: OrgSchoolState = {
    years,
    programs,
    classes,
    subjects,
    classSubjects,
    timetable: {},
    students,
    seq: 100,
  };
  // One configured timetable (first class of first branch) as the demo.
  const demoClass = classes[0];
  if (demoClass) {
    const subs = classSubjects[demoClass.id] ?? [];
    state.timetable[demoClass.id] = subs.flatMap((subjectId, idx) => {
      const subject = subjects.find((s) => s.id === subjectId)!;
      return [1, 3].map((weekday, w) => ({
        id: `${prefix}-tt-${idx}-${w}`,
        classId: demoClass.id,
        weekday: weekday + (idx === 2 ? 2 : 0),
        // UTC wall-clock; Asia/Karachi display = +5h (08:00 local etc.)
        startsAtUtc: `0${3 + idx}:00`,
        endsAtUtc: `0${3 + idx}:45`,
        subjectId,
        subjectName: subject.name,
      }));
    });
  }
  students.forEach((s) => syncCurrent(state, s));
  return state;
}

function syncCurrent(_state: OrgSchoolState, student: StudentDetail): void {
  const current = [...student.enrollments]
    .filter((e) => e.status === "active")
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
  student.currentClassId = current?.classId ?? null;
  student.currentClassName = current?.className ?? null;
  student.currentProgramName = current?.programName ?? null;
}

function makeSchool(): Record<string, OrgSchoolState> {
  const sunPrograms: Program[] = [
    { id: "sun-prog-matric", name: "Matric Science", code: "MAT-SCI", description: "Grades 9–10 science stream." },
    { id: "sun-prog-fsc-med", name: "FSc Pre-Medical", code: "FSC-MED", description: null },
    { id: "sun-prog-ics", name: "ICS Computer Science", code: "ICS", description: null },
  ];
  const sunrise = makeState(
    "org-sunrise",
    "sun",
    sunPrograms,
    [
      { id: "sun-cls-g9a", name: "Grade 9-A", programId: "sun-prog-matric", academicYearId: "sun-y2627", branchId: "br-sunrise-main" },
      { id: "sun-cls-g10a", name: "Grade 10-A", programId: "sun-prog-matric", academicYearId: "sun-y2627", branchId: "br-sunrise-main" },
      { id: "sun-cls-fsc1", name: "FSc-1 Medical", programId: "sun-prog-fsc-med", academicYearId: "sun-y2627", branchId: "br-sunrise-main" },
      { id: "sun-cls-ics1", name: "ICS-1", programId: "sun-prog-ics", academicYearId: "sun-y2627", branchId: "br-sunrise-north" },
      { id: "sun-cls-g9n", name: "Grade 9-North", programId: "sun-prog-matric", academicYearId: "sun-y2627", branchId: "br-sunrise-north" },
    ],
    32,
    [
      { branchId: "br-sunrise-main", branchName: "Main campus", share: 2 },
      { branchId: "br-sunrise-north", branchName: "North campus", share: 1 },
    ],
  );

  const norPrograms: Program[] = [
    { id: "nor-prog-alevel", name: "A-Levels", code: "ALEV", description: null },
    { id: "nor-prog-fsc-eng", name: "FSc Pre-Engineering", code: "FSC-ENG", description: null },
  ];
  const northgate = makeState(
    "org-northgate",
    "nor",
    norPrograms,
    [
      { id: "nor-cls-as1", name: "AS-1", programId: "nor-prog-alevel", academicYearId: "nor-y2627", branchId: "br-northgate-city" },
      { id: "nor-cls-fsc1", name: "FSc-1 Eng", programId: "nor-prog-fsc-eng", academicYearId: "nor-y2627", branchId: "br-northgate-west" },
      { id: "nor-cls-a2", name: "A2", programId: "nor-prog-alevel", academicYearId: "nor-y2627", branchId: "br-northgate-east" },
    ],
    24,
    [
      { branchId: "br-northgate-city", branchName: "City branch", share: 2 },
      { branchId: "br-northgate-west", branchName: "West branch", share: 1 },
      { branchId: "br-northgate-east", branchName: "East branch", share: 1 },
    ],
  );

  const rivPrograms: Program[] = [
    { id: "riv-prog-mdcat", name: "MDCAT Prep", code: "MDCAT", description: null },
    { id: "riv-prog-ecat", name: "ECAT Prep", code: "ECAT", description: null },
  ];
  const riverdale = makeState(
    "org-riverdale",
    "riv",
    rivPrograms,
    [
      { id: "riv-cls-md1", name: "MDCAT Batch 1", programId: "riv-prog-mdcat", academicYearId: "riv-y2627", branchId: "br-riverdale-gulberg" },
      { id: "riv-cls-ec1", name: "ECAT Batch 1", programId: "riv-prog-ecat", academicYearId: "riv-y2627", branchId: "br-riverdale-gulberg" },
      { id: "riv-cls-md2", name: "MDCAT Batch 2", programId: "riv-prog-mdcat", academicYearId: "riv-y2627", branchId: "br-riverdale-clifton" },
    ],
    14,
    [
      { branchId: "br-riverdale-gulberg", branchName: "Gulberg branch", share: 10 },
      { branchId: "br-riverdale-clifton", branchName: "Clifton branch", share: 4 },
    ],
  );

  const fresh: OrgSchoolState = {
    years: [],
    programs: [],
    classes: [],
    subjects: [],
    classSubjects: {},
    timetable: {},
    students: [],
    seq: 100,
  };

  return {
    "org-sunrise": sunrise,
    "org-northgate": northgate,
    "org-riverdale": riverdale,
    "org-fresh": fresh,
  };
}

let school = makeSchool();

/** Test helper: restores pristine school fixtures. */
export function __resetMockSchool(): void {
  school = makeSchool();
}

function stateOf(orgId: string): OrgSchoolState {
  getMockMembership(orgId); // 401/403/404 gate
  const state = school[orgId];
  if (!state) mockError(404, "ORG_NOT_FOUND", "Organization not found.");
  return state;
}

function visibleBranchIds(orgId: string): Set<string> {
  return new Set(
    getMockMembership(orgId)
      .branches.filter((b) => b.visibleToDemoUser)
      .map((b) => b.id),
  );
}

function branchNameOf(orgId: string, branchId: string): string {
  return getMockMembership(orgId).branches.find((b) => b.id === branchId)?.name ?? branchId;
}

function requireVisibleBranch(orgId: string, branchId: string): void {
  const membership = getMockMembership(orgId);
  const branch = membership.branches.find((b) => b.id === branchId);
  if (!branch) mockError(404, "BRANCH_NOT_FOUND", "Branch not found.");
  if (!branch.visibleToDemoUser) {
    mockError(403, "BRANCH_FORBIDDEN", "Not authorized for this branch.");
  }
}

/** Backend capacity rule (dashboard totals are authoritative). */
function assertCapacityForNewActive(orgId: string): void {
  const m = getMockMembership(orgId);
  if (m.capacityLimit !== null && m.activeStudentTotal >= m.capacityLimit) {
    mockError(
      422,
      "STUDENT_CAPACITY_FULL",
      "Student capacity is full; new active enrollments are blocked.",
    );
  }
}

function findStudent(orgId: string, studentId: string, state: OrgSchoolState): StudentDetail {
  const student = state.students.find((s) => s.id === studentId);
  if (!student) mockError(404, "STUDENT_NOT_FOUND", "Student not found.");
  if (!visibleBranchIds(orgId).has(student.branchId)) {
    mockError(403, "BRANCH_FORBIDDEN", "Not authorized for this student's branch.");
  }
  return student;
}

function summary(s: StudentDetail): StudentSummary {
  return {
    id: s.id,
    studentCode: s.studentCode,
    fullName: s.fullName,
    branchId: s.branchId,
    branchName: s.branchName,
    status: s.status,
    currentClassId: s.currentClassId,
    currentClassName: s.currentClassName,
    currentProgramName: s.currentProgramName,
  };
}

function detail(s: StudentDetail): StudentDetail {
  return structuredClone(s);
}

export const mockStudentsApi = {
  async listStudents(
    organizationId: string,
    params: StudentListParams,
  ): Promise<PagedResult<StudentSummary>> {
    await delay();
    const state = stateOf(organizationId);
    const visible = visibleBranchIds(organizationId);
    if (params.branchId) requireVisibleBranch(organizationId, params.branchId);
    let rows = state.students.filter((s) => visible.has(s.branchId));
    if (params.branchId) rows = rows.filter((s) => s.branchId === params.branchId);
    if (params.status) rows = rows.filter((s) => s.status === params.status);
    if (params.programId) {
      rows = rows.filter((s) =>
        s.enrollments.some((e) => e.status === "active" && e.programId === params.programId),
      );
    }
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      rows = rows.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q),
      );
    }
    rows = [...rows].sort((a, b) => a.fullName.localeCompare(b.fullName));
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, params.pageSize);
    const start = (page - 1) * pageSize;
    return {
      items: rows.slice(start, start + pageSize).map(summary),
      total: rows.length,
      page,
      pageSize,
    };
  },

  async createStudent(
    organizationId: string,
    input: CreateStudentInput,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    requireVisibleBranch(organizationId, input.branchId);
    if (!input.fullName.trim()) fieldError("fullName", "Full name is required.");
    if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
      fieldError("email", "Enter a valid email address.");
    }
    // A new student starts active → capacity gate (backend rule).
    assertCapacityForNewActive(organizationId);
    const n = ++state.seq;
    const orgPrefix = organizationId.split("-")[1]?.slice(0, 3) ?? "stu";
    const student: StudentDetail = {
      id: `stu-new-${n}`,
      studentCode: `${orgPrefix.toUpperCase()}-${2000 + n}`,
      fullName: input.fullName.trim(),
      branchId: input.branchId,
      branchName: branchNameOf(organizationId, input.branchId),
      status: "active",
      currentClassId: null,
      currentClassName: null,
      currentProgramName: null,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender || null,
      email: input.email || null,
      phone: input.phone || null,
      address: null,
      admissionDate: today(),
      guardians: [],
      enrollments: [],
      branchHistory: [
        {
          branchId: input.branchId,
          branchName: branchNameOf(organizationId, input.branchId),
          from: today(),
          to: null,
        },
      ],
    };
    state.students.push(student);
    if (input.programId && input.classId) {
      try {
        await this.enrollStudent(organizationId, student.id, {
          programId: input.programId,
          classId: input.classId,
          startsOn: input.enrollmentStartDate || today(),
        });
      } catch (e) {
        // Roll back creation when the initial enrollment is rejected.
        state.students = state.students.filter((s) => s.id !== student.id);
        throw e;
      }
      return detail(findStudent(organizationId, student.id, state));
    }
    return detail(student);
  },

  async getStudent(organizationId: string, studentId: string): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    return detail(findStudent(organizationId, studentId, state));
  },

  async updateStudent(
    organizationId: string,
    studentId: string,
    input: UpdateStudentInput,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    const student = findStudent(organizationId, studentId, state);
    if (!input.fullName.trim()) fieldError("fullName", "Full name is required.");
    if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
      fieldError("email", "Enter a valid email address.");
    }
    student.fullName = input.fullName.trim();
    student.dateOfBirth = input.dateOfBirth;
    student.gender = input.gender || null;
    student.email = input.email || null;
    student.phone = input.phone || null;
    student.address = input.address || null;
    return detail(student);
  },

  async updateStudentStatus(
    organizationId: string,
    studentId: string,
    status: StudentStatus,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    const student = findStudent(organizationId, studentId, state);
    // Reactivating counts as a new active seat → capacity gate.
    if (status === "active" && student.status !== "active") {
      assertCapacityForNewActive(organizationId);
    }
    student.status = status;
    return detail(student);
  },

  async transferStudent(
    organizationId: string,
    studentId: string,
    input: TransferInput,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    const student = findStudent(organizationId, studentId, state);
    requireVisibleBranch(organizationId, input.toBranchId);
    if (input.toBranchId === student.branchId) {
      fieldError("toBranchId", "Student is already in this branch.");
    }
    const open = student.branchHistory.find((h) => h.to === null);
    if (open) open.to = input.effectiveOn;
    student.branchHistory.push({
      branchId: input.toBranchId,
      branchName: branchNameOf(organizationId, input.toBranchId),
      from: input.effectiveOn,
      to: null,
    });
    student.branchId = input.toBranchId;
    student.branchName = branchNameOf(organizationId, input.toBranchId);
    return detail(student);
  },

  async linkGuardian(
    organizationId: string,
    studentId: string,
    input: LinkGuardianInput,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    const student = findStudent(organizationId, studentId, state);
    if (!input.fullName.trim()) fieldError("fullName", "Guardian name is required.");
    student.guardians.push({
      id: `grd-new-${++state.seq}`,
      fullName: input.fullName.trim(),
      relationship: input.relationship,
      email: input.email || null,
      phone: input.phone || null,
    });
    return detail(student);
  },

  async unlinkGuardian(
    organizationId: string,
    studentId: string,
    guardianId: string,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    const student = findStudent(organizationId, studentId, state);
    student.guardians = student.guardians.filter((g) => g.id !== guardianId);
    return detail(student);
  },

  async enrollStudent(
    organizationId: string,
    studentId: string,
    input: EnrollInput,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    const student = findStudent(organizationId, studentId, state);
    const klass = state.classes.find((c) => c.id === input.classId);
    if (!klass) mockError(404, "CLASS_NOT_FOUND", "Class not found.");
    requireVisibleBranch(organizationId, klass.branchId);
    const program = state.programs.find((p) => p.id === input.programId);
    if (!program) mockError(404, "PROGRAM_NOT_FOUND", "Program not found.");
    if (klass.programId !== input.programId) {
      fieldError("classId", "This class doesn't belong to the selected program.");
    }
    const duplicate = student.enrollments.some(
      (e) => e.status === "active" && e.classId === input.classId,
    );
    if (duplicate) {
      mockError(409, "ALREADY_ENROLLED", "Student already has an active enrollment in this class.");
    }
    // Only a student without an active enrollment consumes a NEW seat.
    const hasActive = student.enrollments.some((e) => e.status === "active");
    if (!hasActive) assertCapacityForNewActive(organizationId);
    student.enrollments.push({
      id: `enr-new-${++state.seq}`,
      programId: program.id,
      programName: program.name,
      classId: klass.id,
      className: klass.name,
      startsOn: input.startsOn,
      endsOn: null,
      status: "active",
    });
    if (student.status !== "active") student.status = "active";
    syncCurrent(state, student);
    return detail(student);
  },

  async endEnrollment(
    organizationId: string,
    studentId: string,
    enrollmentId: string,
    endsOn: string,
  ): Promise<StudentDetail> {
    await delay();
    const state = stateOf(organizationId);
    const student = findStudent(organizationId, studentId, state);
    const enrollment = student.enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) mockError(404, "ENROLLMENT_NOT_FOUND", "Enrollment not found.");
    enrollment.status = "ended";
    enrollment.endsOn = endsOn;
    syncCurrent(state, student);
    return detail(student);
  },
};

function requireStructureManager(orgId: string): void {
  const m = getMockMembership(orgId);
  if (!["owner", "general_manager"].includes(m.role)) {
    mockError(403, "FORBIDDEN", "Only Owners and General Managers manage academic structure.");
  }
}

function classDto(orgId: string, state: OrgSchoolState, c: OrgSchoolState["classes"][number]): ClassGroup {
  return {
    ...c,
    programName: state.programs.find((p) => p.id === c.programId)?.name ?? c.programId,
    academicYearLabel: state.years.find((y) => y.id === c.academicYearId)?.label ?? c.academicYearId,
    branchName: branchNameOf(orgId, c.branchId),
  };
}

export const mockAcademicsApi = {
  async listAcademicYears(organizationId: string): Promise<AcademicYear[]> {
    await delay();
    return structuredClone(stateOf(organizationId).years);
  },
  async createAcademicYear(organizationId: string, input: AcademicYearInput): Promise<AcademicYear> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    if (input.startsOn >= input.endsOn) fieldError("endsOn", "End date must be after the start date.");
    const year: AcademicYear = { id: `yr-new-${++state.seq}`, ...input, isCurrent: false };
    // Backend decides "current" (today within range) — mirrored here.
    const t = today();
    year.isCurrent = input.startsOn <= t && t <= input.endsOn;
    state.years.push(year);
    return structuredClone(year);
  },
  async updateAcademicYear(organizationId: string, id: string, input: AcademicYearInput): Promise<AcademicYear> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const year = state.years.find((y) => y.id === id);
    if (!year) mockError(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found.");
    if (input.startsOn >= input.endsOn) fieldError("endsOn", "End date must be after the start date.");
    Object.assign(year, input);
    const t = today();
    year.isCurrent = year.startsOn <= t && t <= year.endsOn;
    return structuredClone(year);
  },
  async deleteAcademicYear(organizationId: string, id: string): Promise<void> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    if (state.classes.some((c) => c.academicYearId === id)) {
      mockError(409, "ACADEMIC_YEAR_IN_USE", "Classes reference this academic year.");
    }
    state.years = state.years.filter((y) => y.id !== id);
  },

  async listPrograms(organizationId: string): Promise<Program[]> {
    await delay();
    return structuredClone(stateOf(organizationId).programs);
  },
  async createProgram(organizationId: string, input: ProgramInput): Promise<Program> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const program: Program = {
      id: `prog-new-${++state.seq}`,
      name: input.name,
      code: input.code,
      description: input.description || null,
    };
    state.programs.push(program);
    return structuredClone(program);
  },
  async updateProgram(organizationId: string, id: string, input: ProgramInput): Promise<Program> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const program = state.programs.find((p) => p.id === id);
    if (!program) mockError(404, "PROGRAM_NOT_FOUND", "Program not found.");
    program.name = input.name;
    program.code = input.code;
    program.description = input.description || null;
    // Denormalized enrollment labels follow renames.
    state.students.forEach((s) =>
      s.enrollments.forEach((e) => {
        if (e.programId === id) e.programName = program.name;
      }),
    );
    state.students.forEach((s) => syncCurrent(state, s));
    return structuredClone(program);
  },
  async deleteProgram(organizationId: string, id: string): Promise<void> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const inUse =
      state.classes.some((c) => c.programId === id) ||
      state.students.some((s) => s.enrollments.some((e) => e.programId === id));
    if (inUse) mockError(409, "PROGRAM_IN_USE", "Program has classes or enrollments.");
    state.programs = state.programs.filter((p) => p.id !== id);
  },

  async listClasses(organizationId: string): Promise<ClassGroup[]> {
    await delay();
    const state = stateOf(organizationId);
    const visible = visibleBranchIds(organizationId);
    return state.classes
      .filter((c) => visible.has(c.branchId))
      .map((c) => classDto(organizationId, state, c));
  },
  async createClass(organizationId: string, input: ClassInput): Promise<ClassGroup> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    requireVisibleBranch(organizationId, input.branchId);
    const klass = { id: `cls-new-${++state.seq}`, ...input };
    state.classes.push(klass);
    state.classSubjects[klass.id] = [];
    return classDto(organizationId, state, klass);
  },
  async updateClass(organizationId: string, id: string, input: ClassInput): Promise<ClassGroup> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const klass = state.classes.find((c) => c.id === id);
    if (!klass) mockError(404, "CLASS_NOT_FOUND", "Class not found.");
    requireVisibleBranch(organizationId, klass.branchId);
    Object.assign(klass, input);
    state.students.forEach((s) =>
      s.enrollments.forEach((e) => {
        if (e.classId === id) e.className = klass.name;
      }),
    );
    state.students.forEach((s) => syncCurrent(state, s));
    return classDto(organizationId, state, klass);
  },
  async deleteClass(organizationId: string, id: string): Promise<void> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const inUse = state.students.some((s) =>
      s.enrollments.some((e) => e.classId === id && e.status === "active"),
    );
    if (inUse) mockError(409, "CLASS_IN_USE", "Class has active enrollments.");
    state.classes = state.classes.filter((c) => c.id !== id);
    delete state.classSubjects[id];
    delete state.timetable[id];
  },

  async listSubjects(organizationId: string): Promise<Subject[]> {
    await delay();
    return structuredClone(stateOf(organizationId).subjects);
  },
  async createSubject(organizationId: string, input: SubjectInput): Promise<Subject> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const subject: Subject = { id: `sub-new-${++state.seq}`, ...input };
    state.subjects.push(subject);
    return structuredClone(subject);
  },
  async updateSubject(organizationId: string, id: string, input: SubjectInput): Promise<Subject> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const subject = state.subjects.find((s) => s.id === id);
    if (!subject) mockError(404, "SUBJECT_NOT_FOUND", "Subject not found.");
    Object.assign(subject, input);
    Object.values(state.timetable).forEach((entries) =>
      entries.forEach((e) => {
        if (e.subjectId === id) e.subjectName = subject.name;
      }),
    );
    return structuredClone(subject);
  },
  async deleteSubject(organizationId: string, id: string): Promise<void> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const assigned = Object.values(state.classSubjects).some((ids) => ids.includes(id));
    if (assigned) mockError(409, "SUBJECT_IN_USE", "Subject is assigned to a class.");
    state.subjects = state.subjects.filter((s) => s.id !== id);
  },

  async listClassSubjects(organizationId: string, classId: string): Promise<Subject[]> {
    await delay();
    const state = stateOf(organizationId);
    const klass = state.classes.find((c) => c.id === classId);
    if (!klass) mockError(404, "CLASS_NOT_FOUND", "Class not found.");
    requireVisibleBranch(organizationId, klass.branchId);
    const ids = state.classSubjects[classId] ?? [];
    return state.subjects.filter((s) => ids.includes(s.id));
  },
  async assignSubjectToClass(organizationId: string, classId: string, subjectId: string): Promise<Subject[]> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const list = state.classSubjects[classId] ?? [];
    if (!list.includes(subjectId)) list.push(subjectId);
    state.classSubjects[classId] = list;
    return this.listClassSubjects(organizationId, classId);
  },
  async unassignSubjectFromClass(organizationId: string, classId: string, subjectId: string): Promise<Subject[]> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    state.classSubjects[classId] = (state.classSubjects[classId] ?? []).filter(
      (id) => id !== subjectId,
    );
    return this.listClassSubjects(organizationId, classId);
  },

  async getTimetable(organizationId: string, classId: string): Promise<TimetableEntry[]> {
    await delay();
    const state = stateOf(organizationId);
    const klass = state.classes.find((c) => c.id === classId);
    if (!klass) mockError(404, "CLASS_NOT_FOUND", "Class not found.");
    requireVisibleBranch(organizationId, klass.branchId);
    return structuredClone(state.timetable[classId] ?? []);
  },
  async addTimetableEntry(
    organizationId: string,
    classId: string,
    input: TimetableEntryInput,
  ): Promise<TimetableEntry> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    const klass = state.classes.find((c) => c.id === classId);
    if (!klass) mockError(404, "CLASS_NOT_FOUND", "Class not found.");
    const subject = state.subjects.find((s) => s.id === input.subjectId);
    if (!subject) mockError(404, "SUBJECT_NOT_FOUND", "Subject not found.");
    if (input.startsAtUtc >= input.endsAtUtc) {
      fieldError("endsAtUtc", "End time must be after the start time.");
    }
    const entry: TimetableEntry = {
      id: `tt-new-${++state.seq}`,
      classId,
      ...input,
      subjectName: subject.name,
    };
    (state.timetable[classId] ??= []).push(entry);
    return structuredClone(entry);
  },
  async deleteTimetableEntry(organizationId: string, classId: string, entryId: string): Promise<void> {
    await delay();
    const state = stateOf(organizationId);
    requireStructureManager(organizationId);
    state.timetable[classId] = (state.timetable[classId] ?? []).filter((e) => e.id !== entryId);
  },
};

/**
 * Phase 6 shared read helpers (attendance rosters/check-ins). These go
 * through the same membership/visibility gates as the student APIs so
 * branch scoping stays identical everywhere.
 */
export interface MockRosterStudent {
  studentId: string;
  fullName: string;
  studentCode: string;
}

export function getMockClass(orgId: string, classId: string) {
  const state = stateOf(orgId);
  const klass = state.classes.find((c) => c.id === classId);
  if (!klass) mockError(404, "CLASS_NOT_FOUND", "Class not found.");
  requireVisibleBranch(orgId, klass.branchId);
  return {
    id: klass.id,
    name: klass.name,
    branchId: klass.branchId,
    branchName: branchNameOf(orgId, klass.branchId),
  };
}

export function getMockClassRoster(orgId: string, classId: string): MockRosterStudent[] {
  const state = stateOf(orgId);
  getMockClass(orgId, classId);
  return state.students
    .filter(
      (s) =>
        s.status === "active" &&
        s.enrollments.some((e) => e.status === "active" && e.classId === classId),
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((s) => ({ studentId: s.id, fullName: s.fullName, studentCode: s.studentCode }));
}

export function getMockStudentByCode(
  orgId: string,
  studentCode: string,
): (MockRosterStudent & { branchId: string }) | null {
  const state = stateOf(orgId);
  const student = state.students.find(
    (s) => s.studentCode.toLowerCase() === studentCode.trim().toLowerCase(),
  );
  if (!student) return null;
  return {
    studentId: student.id,
    fullName: student.fullName,
    studentCode: student.studentCode,
    branchId: student.branchId,
  };
}

export function mockRequireVisibleBranch(orgId: string, branchId: string): void {
  requireVisibleBranch(orgId, branchId);
}

export function mockVisibleBranchIds(orgId: string): Set<string> {
  return visibleBranchIds(orgId);
}

export function mockBranchNameOf(orgId: string, branchId: string): string {
  return branchNameOf(orgId, branchId);
}

// --- Phase 7 read helpers (fees seeding, voucher generation, student
// portal). These intentionally skip STAFF branch-visibility checks —
// callers enforce their own authorization (fees staff scoping / guardian
// link checks) as the backend would per endpoint.

export interface MockActiveStudent {
  studentId: string;
  fullName: string;
  studentCode: string;
  branchId: string;
  branchName: string;
  programId: string | null;
  programName: string | null;
  classId: string | null;
  className: string | null;
}

function activeStudentOf(
  state: ReturnType<typeof stateOf>,
  s: StudentDetail,
): MockActiveStudent {
  const enrollment = s.enrollments.find((e) => e.status === "active") ?? null;
  const klass = enrollment
    ? (state.classes.find((c) => c.id === enrollment.classId) ?? null)
    : null;
  const program = klass
    ? (state.programs.find((p) => p.id === klass.programId) ?? null)
    : null;
  return {
    studentId: s.id,
    fullName: s.fullName,
    studentCode: s.studentCode,
    branchId: s.branchId,
    branchName: s.branchName,
    programId: program?.id ?? null,
    programName: program?.name ?? null,
    classId: klass?.id ?? null,
    className: klass?.name ?? null,
  };
}

export function getMockActiveStudents(orgId: string): MockActiveStudent[] {
  const state = stateOf(orgId);
  return state.students
    .filter((s) => s.status === "active")
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((s) => activeStudentOf(state, s));
}

export function getMockStudentPortalInfo(
  orgId: string,
  studentId: string,
): MockActiveStudent | null {
  const state = stateOf(orgId);
  const student = state.students.find((s) => s.id === studentId);
  return student ? activeStudentOf(state, student) : null;
}

/** Program catalog for fee-structure targeting (id + name). */
export function getMockPrograms(orgId: string): { id: string; name: string }[] {
  return stateOf(orgId).programs.map((p) => ({ id: p.id, name: p.name }));
}

/** Raw timetable for the student portal (guardian link check is the auth). */
export function getMockClassTimetable(orgId: string, classId: string) {
  return structuredClone(stateOf(orgId).timetable[classId] ?? []);
}
