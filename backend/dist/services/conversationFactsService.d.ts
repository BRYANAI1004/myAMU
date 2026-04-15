import type { StudentProfilePayload } from "../types/studentProfile.js";
export type ConversationFactLanguage = "en" | "zh";
export type ConversationFacts = {
    statedName?: string;
    preferredLanguage?: ConversationFactLanguage;
};
export type SafeLoggedInUserContext = {
    displayName?: string;
    studentId?: string;
    program?: string;
};
export type IdentityContext = {
    conversationFacts?: ConversationFacts;
    safeProfile?: SafeLoggedInUserContext | null;
};
export declare function sanitizeConversationFacts(raw: unknown): ConversationFacts | undefined;
export declare function buildSafeLoggedInUserContext(studentId: string, profile: StudentProfilePayload | null): SafeLoggedInUserContext;
export declare function formatIdentityContextBlock(identityContext: IdentityContext | null | undefined): string;
export declare function answerSelfReferentialQuestion(question: string, identityContext: IdentityContext | null | undefined): string | null;
//# sourceMappingURL=conversationFactsService.d.ts.map