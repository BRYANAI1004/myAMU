import type { Request, Response } from "express";
/**
 * GET /api/students/:studentId/clinical-schedule
 */
export declare function getStudentClinicalScheduleHandler(req: Request, res: Response): Promise<void>;
/**
 * POST /api/admin/clinical/assign
 * Body: { studentId, courseCode, sessionDate, sessionName?, site?, faculty? }
 */
export declare function postAdminClinicalAssignHandler(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=clinicalScheduleController.d.ts.map