import { verifyStudentAccessToken } from "../lib/studentAuthToken.js";
import { RagQuestionValidationError, answerGeneralQuestion, answerAmuQuestion, answerGraduationQuestion, answerLocalSearchQuestion, answerSchoolFactQuestion, answerStudentRecordQuestionFromFacts, plainTextFormatter, planShortConversationMemory, } from "../services/ragService.js";
import { classifyStudentAiIntent, detectCourseEligibilityIntent, detectGraduationEligibilityQuestion, detectGraduationRequirementCreditsQuestion, } from "../services/studentAiQuestionRouter.js";
import { evaluateGraduation, formatGraduationEvaluationFacts, } from "../services/graduationEvaluationService.js";
import { buildStudentRecordFactsForQuestion, } from "../services/studentRecordAiService.js";
import { getStudentAcademicsPayload } from "../services/studentAcademicsService.js";
import { getLegacyStudentProfile } from "../services/studentProfileService.js";
import { getStudentTranscriptPreviewPayload } from "../services/studentTranscriptService.js";
import { buildSafeLoggedInUserContext, sanitizeConversationFacts, } from "../services/conversationFactsService.js";
function formatResponseAnswer(result) {
    return {
        ...result,
        answer: plainTextFormatter(result.answer),
    };
}
function buildEvidenceUnavailableMessage(question) {
    const zh = /[\u4E00-\u9FFF]/.test(question);
    return zh
        ? "我目前缺少完成此问题所需的 AMU 证据。请提供更具体的课程代码、项目（如 MAHM 或 DAHM）或目录年份，我可以基于可检索到的 AMU 目录和你的可用学业记录重新判断。"
        : "I do not currently have enough AMU evidence to answer this reliably. Please share a specific course code, program (such as MAHM or DAHM), or catalog year, and I can re-check using available AMU catalog context and your student record evidence.";
}
function readQuestion(req) {
    const body = req.body;
    if (body == null || typeof body !== "object")
        return undefined;
    return body.question;
}
function hasVerifiedAcademicData(academics) {
    return (academics.courseRecords.length > 0 ||
        academics.transcript.length > 0 ||
        academics.enrollmentHistory.length > 0 ||
        academics.currentSchedule.length > 0);
}
/**
 * POST /api/ai/ask
 * Body: {
 *   question: string,
 *   history?: { role: 'user' | 'assistant', content: string }[],
 *   conversationFacts?: { statedName?: string, preferredLanguage?: 'en' | 'zh' }
 * }
 */
export async function postAiAsk(req, res) {
    const rawAuthorization = req.headers.authorization?.trim() ?? "";
    const bearerMatch = /^Bearer\s+(.+)$/i.exec(rawAuthorization);
    const hasAuthorizationHeader = rawAuthorization.length > 0;
    const hasBearerToken = (bearerMatch?.[1]?.trim() ?? "") !== "";
    console.debug("[ai/ask] request entered", {
        hasAuthorizationHeader,
        hasBearerToken,
    });
    const authStudent = verifyStudentAccessToken(req.headers.authorization);
    if (authStudent == null) {
        console.debug("[ai/ask] authentication required");
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    const body = req.body;
    const q = readQuestion(req);
    if (typeof q !== "string") {
        res.status(400).json({
            error: "question is required and must be a string",
        });
        return;
    }
    if (body != null &&
        typeof body === "object" &&
        Object.prototype.hasOwnProperty.call(body, "history") &&
        body.history != null &&
        !Array.isArray(body.history)) {
        res.status(400).json({ error: "history must be an array when provided" });
        return;
    }
    const rawHistory = body != null &&
        typeof body === "object" &&
        Object.prototype.hasOwnProperty.call(body, "history")
        ? body.history
        : undefined;
    const rawConversationFacts = body != null &&
        typeof body === "object" &&
        Object.prototype.hasOwnProperty.call(body, "conversationFacts")
        ? body.conversationFacts
        : undefined;
    try {
        const [profile, conversationFacts] = await Promise.all([
            getLegacyStudentProfile(authStudent.studentId),
            Promise.resolve(sanitizeConversationFacts(rawConversationFacts)),
        ]);
        const identityContext = {
            conversationFacts,
            safeProfile: buildSafeLoggedInUserContext(authStudent.studentId, profile),
        };
        const initialIntent = classifyStudentAiIntent(q);
        const memoryPlan = planShortConversationMemory(q, rawHistory, initialIntent);
        const routedIntent = memoryPlan.effectiveIntent;
        const isGraduationQuestion = detectGraduationEligibilityQuestion(q);
        const isGraduationRequirementCreditsQuestion = detectGraduationRequirementCreditsQuestion(q);
        const isGraduationBackendQuestion = isGraduationQuestion || isGraduationRequirementCreditsQuestion;
        const isCourseEligibilityQuestion = detectCourseEligibilityIntent(q);
        console.debug("[ai/ask] detected intent", {
            initialIntent,
            effectiveIntent: routedIntent,
            isFollowUp: memoryPlan.isFollowUp,
            isTopicSwitch: memoryPlan.isTopicSwitch,
            previousDomain: memoryPlan.previousDomain,
            retainedHistoryMessages: memoryPlan.history?.length ?? 0,
            isGraduationQuestion,
            isGraduationRequirementCreditsQuestion,
            isCourseEligibilityQuestion,
        });
        if (isGraduationBackendQuestion ||
            routedIntent === "student_record" ||
            routedIntent === "mixed") {
            const academics = await getStudentAcademicsPayload(authStudent.studentId);
            let transcriptPreviewCount = 0;
            if (!hasVerifiedAcademicData(academics)) {
                const transcriptPreview = await getStudentTranscriptPreviewPayload(authStudent.studentId);
                transcriptPreviewCount = transcriptPreview.transcript.length;
            }
            console.debug("[ai/ask] verified academic source summary", {
                hasAuthorizationHeader,
                resolvedStudentId: authStudent.studentId,
                currentTerm: academics.currentTerm,
                availableTerms: academics.availableTerms.length,
                currentScheduleCount: academics.currentSchedule.length,
                transcriptCount: academics.transcript.length,
                enrollmentHistoryCount: academics.enrollmentHistory.length,
                courseRecordCount: academics.courseRecords.length,
                transcriptPreviewCount,
            });
            if (!hasVerifiedAcademicData(academics) &&
                transcriptPreviewCount <= 0) {
                console.error("[AI DEBUG] missing student academic data", {
                    studentId: authStudent.studentId,
                    question: q,
                    routedIntent,
                    isGraduationQuestion,
                    isGraduationRequirementCreditsQuestion,
                    currentTerm: academics.currentTerm,
                    availableTerms: academics.availableTerms.length,
                    currentScheduleCount: academics.currentSchedule.length,
                    transcriptCount: academics.transcript.length,
                    enrollmentHistoryCount: academics.enrollmentHistory.length,
                    courseRecordCount: academics.courseRecords.length,
                    transcriptPreviewCount,
                });
                res.status(200).json({
                    question: q,
                    answer: buildEvidenceUnavailableMessage(q),
                    sources: [],
                });
                return;
            }
        }
        if (isGraduationBackendQuestion) {
            const evaluation = await evaluateGraduation(authStudent.studentId);
            const structuredEvaluation = formatGraduationEvaluationFacts(evaluation);
            console.debug("[ai/ask] graduation evaluation summary", {
                resolvedStudentId: authStudent.studentId,
                earnedCredits: evaluation.earnedCredits,
                requiredCredits: evaluation.requiredCredits,
                eligible: evaluation.eligible,
                missingCredits: evaluation.missingCredits,
                creditSource: "backend",
                missingCourseCount: evaluation.missingCourses.length,
                ruleSetId: evaluation.ruleSetId,
            });
            console.debug("[ai/ask] pipeline used", {
                pipeline: "graduation_evaluation",
                eligible: evaluation.eligible,
                ruleSetId: evaluation.ruleSetId,
                missingCourseCount: evaluation.missingCourses.length,
                missingCredits: evaluation.missingCredits,
                structuredEvaluation,
            });
            const result = await answerGraduationQuestion(q, memoryPlan.history, {
                graduationEvaluation: structuredEvaluation,
                identityContext,
            });
            res.status(200).json(formatResponseAnswer(result));
            return;
        }
        if (routedIntent === "general") {
            console.debug("[ai/ask] pipeline used", {
                pipeline: "general",
                answerMode: "normal_chat",
            });
            const result = await answerGeneralQuestion(q, memoryPlan.history, {
                identityContext,
            });
            res.status(200).json(formatResponseAnswer(result));
            return;
        }
        if (routedIntent === "school_fact") {
            console.debug("[ai/ask] pipeline used", { pipeline: "school_fact" });
            const result = await answerSchoolFactQuestion(q);
            res.status(200).json(formatResponseAnswer(result));
            return;
        }
        if (routedIntent === "local_search") {
            console.debug("[ai/ask] pipeline used", { pipeline: "local_search" });
            const result = await answerLocalSearchQuestion(q);
            res.status(200).json(formatResponseAnswer(result));
            return;
        }
        if (routedIntent === "student_record") {
            const recordFacts = await buildStudentRecordFactsForQuestion(authStudent.studentId, q);
            if (recordFacts != null) {
                console.debug("[ai/ask] pipeline used", {
                    pipeline: "student_record",
                    deterministicStudentFactsUsed: true,
                    ragUsed: true,
                    helperCount: recordFacts.usedHelpers.length,
                });
                const result = await answerStudentRecordQuestionFromFacts(q, recordFacts.contextText, identityContext);
                res.status(200).json(formatResponseAnswer(result));
                return;
            }
            console.debug("[ai/ask] pipeline used", {
                pipeline: "student_record",
                deterministicStudentFactsUsed: false,
                ragUsed: false,
            });
            console.error("[AI DEBUG] student_record fell through without deterministic facts", {
                studentId: authStudent.studentId,
                question: q,
            });
            res.status(200).json({
                question: q,
                answer: buildEvidenceUnavailableMessage(q),
                sources: [],
            });
            return;
        }
        if (routedIntent === "policy") {
            console.debug("[ai/ask] pipeline used", {
                pipeline: "policy",
                answerMode: "catalog_rag",
            });
            const result = await answerAmuQuestion(q, memoryPlan.history, {
                pipeline: "policy",
                identityContext,
            });
            res.status(200).json(formatResponseAnswer(result));
            return;
        }
        const recordFacts = await buildStudentRecordFactsForQuestion(authStudent.studentId, q);
        if (recordFacts == null) {
            console.error("[AI DEBUG] mixed intent missing student record facts", {
                studentId: authStudent.studentId,
                question: q,
            });
            res.status(200).json({
                question: q,
                answer: buildEvidenceUnavailableMessage(q),
                sources: [],
            });
            return;
        }
        const studentContextText = recordFacts.contextText;
        console.debug("[ai/ask] pipeline used", {
            pipeline: "mixed",
            answerMode: "catalog_rag_with_student_context",
            deterministicStudentFactsUsed: true,
            ragUsed: true,
            helperCount: recordFacts.usedHelpers.length,
        });
        const result = await answerAmuQuestion(q, memoryPlan.history, {
            pipeline: "mixed",
            studentContext: studentContextText,
            identityContext,
        });
        res.status(200).json(formatResponseAnswer(result));
    }
    catch (e) {
        if (e instanceof RagQuestionValidationError) {
            res.status(400).json({ error: e.message });
            return;
        }
        console.error("[AI ERROR]", e);
        res.status(200).json({
            question: q,
            answer: buildEvidenceUnavailableMessage(q),
            sources: [],
        });
    }
}
//# sourceMappingURL=aiAskController.js.map