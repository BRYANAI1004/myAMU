import type { Request, Response } from "express";
export declare function postStudentEnroll(req: Request, res: Response): Promise<void>;
/**
 * GET /api/student/enrolled-sections?studentId=&academic_term_id=
 * Section rows for the student's portal enrollments in that term (one section per course when several exist).
 */
export declare function getStudentEnrolledSections(req: Request, res: Response): Promise<void>;
/**
 * POST /api/student/withdraw
 * Body: { studentId, academic_term_id, course_code }
 * Soft-withdraws the portal enrollment (same contract as admin enrollment delete).
 */
export declare function postStudentWithdraw(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=studentEnrollmentController.d.ts.map