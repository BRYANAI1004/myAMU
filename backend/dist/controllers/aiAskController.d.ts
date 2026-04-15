import type { Request, Response } from "express";
/**
 * POST /api/ai/ask
 * Body: {
 *   question: string,
 *   history?: { role: 'user' | 'assistant', content: string }[],
 *   conversationFacts?: { statedName?: string, preferredLanguage?: 'en' | 'zh' }
 * }
 */
export declare function postAiAsk(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=aiAskController.d.ts.map