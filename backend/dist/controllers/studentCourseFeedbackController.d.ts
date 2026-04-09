import type { Request, Response } from "express";
export declare function getStudentCourseFeedback(req: Request, res: Response): Promise<void>;
/** Same query contract as GET /api/students/:studentId/course-feedback (admin route). */
export declare function getAdminStudentCourseFeedback(req: Request, res: Response): Promise<void>;
export declare function postStudentCourseFeedback(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=studentCourseFeedbackController.d.ts.map