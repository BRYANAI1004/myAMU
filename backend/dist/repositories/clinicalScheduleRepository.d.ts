export type ClinicalAssignmentDbRow = {
    id: number;
    student_id: string;
    course_code: string;
    session_date: string;
    session_name: string | null;
    site: string | null;
    faculty: string | null;
    status: string;
    created_at: Date;
};
export declare function listStudentClinicalAssignments(studentId: string): Promise<ClinicalAssignmentDbRow[]>;
export type InsertClinicalAssignmentPayload = {
    studentId: string;
    courseCode: string;
    sessionDate: string;
    sessionName: string | null;
    site: string | null;
    faculty: string | null;
    status?: string;
};
export declare function insertClinicalAssignment(payload: InsertClinicalAssignmentPayload): Promise<number>;
//# sourceMappingURL=clinicalScheduleRepository.d.ts.map