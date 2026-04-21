import type { Request, Response } from "express";
/**
 * GET /api/student/clinical-progress?studentId=
 *
 * Reads passed clinical completions from legacy `clinic` (grade P, raw hours column) and
 * a fixed five-row clinical exam history from the same `clinic` table (code prefix + grade).
 */
export declare function getStudentClinicalProgressHandler(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=studentClinicalProgressController.d.ts.map