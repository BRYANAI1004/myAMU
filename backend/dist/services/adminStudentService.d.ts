import type { AdminStudentDetail, AdminStudentListItem, AdminStudentUpdateBody } from "../types/adminStudent.js";
export declare function listAdminStudents(): Promise<AdminStudentListItem[]>;
export declare function getAdminStudentDetail(studentIdRaw: string): Promise<AdminStudentDetail | null>;
export type AdminStudentUpdateResult = {
    ok: true;
    detail: AdminStudentDetail;
} | {
    ok: false;
    status: 400 | 404;
    message: string;
};
export declare function updateAdminStudent(studentIdRaw: string, body: AdminStudentUpdateBody): Promise<AdminStudentUpdateResult>;
//# sourceMappingURL=adminStudentService.d.ts.map