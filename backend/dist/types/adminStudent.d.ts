/** GET /api/admin/students — normalized roster row for the admin Students table. */
export type AdminStudentListItem = {
    studentId: string;
    division: "Chinese" | "English" | "Unknown";
    name: string;
    email: string | null;
    requirementsId: string | null;
    highestDegree: string | null;
    backgroundSchool: string | null;
    signedDate: string | null;
    enrollStartDate: string | null;
    resolvedEntryDate: string | null;
    entryYear: number | null;
    latestRegistrationTerm: string | null;
};
/** GET /api/admin/students/:studentId — full admin read model. */
export type AdminStudentDetail = {
    studentId: string;
    division: "Chinese" | "English" | "Unknown";
    name: string;
    email: string | null;
    requirementsId: string | null;
    highestDegree: string | null;
    backgroundSchool: string | null;
    gender: string | null;
    signedDate: string | null;
    enrollStartDate: string | null;
    resolvedEntryDate: string | null;
    entryYear: number | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    latestRegistrationTerm: string | null;
};
/** PUT /api/admin/students/:studentId — editable legacy master fields only. */
export type AdminStudentUpdateBody = {
    name: string;
    email: string | null;
    gender: string | null;
    backgroundSchool: string | null;
    highestDegree: string | null;
    requirementsId: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    signedDate: string | null;
    enrollStartDate: string | null;
};
//# sourceMappingURL=adminStudent.d.ts.map