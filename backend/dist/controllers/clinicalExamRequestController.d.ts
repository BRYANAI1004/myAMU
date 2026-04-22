import type { Request, Response } from "express";
/**
 * POST /api/student/clinical/exam-request?studentId=
 * Body: { examCode, term, year }
 */
export declare function postStudentClinicalExamRequestHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/student/clinical/exam-requests?studentId=
 */
export declare function getStudentClinicalExamRequestsHandler(req: Request, res: Response): Promise<void>;
/**
 * GET /api/admin/clinical/exam-requests
 */
export declare function getAdminClinicalExamRequestsHandler(_req: Request, res: Response): Promise<void>;
/**
 * POST /api/admin/clinical/exam-requests/:id/assign
 * Body: { assignedExamDate?, assignedExamTime?, notes?, status?, grade?, term?, year? }
 */
export declare function postAdminClinicalExamRequestAssignHandler(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=clinicalExamRequestController.d.ts.map