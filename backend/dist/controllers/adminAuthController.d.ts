import type { Request, Response } from "express";
/**
 * POST /api/admin/auth/login
 * Body: { identifier, password }
 */
export declare function postAdminAuthLogin(req: Request, res: Response): Promise<void>;
/**
 * POST /api/admin/auth/logout
 */
export declare function postAdminAuthLogout(_req: Request, res: Response): Promise<void>;
/**
 * GET /api/admin/auth/me
 * Uses cookie or Bearer; responds 200 with ok flag (no 401) so the SPA can hydrate quietly.
 */
export declare function getAdminAuthMe(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=adminAuthController.d.ts.map