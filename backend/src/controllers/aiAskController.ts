import type { Request, Response } from "express";
import { verifyStudentAccessToken } from "../lib/studentAuthToken.js";
import {
  RagQuestionValidationError,
  answerGeneralQuestion,
  answerAmuQuestion,
  answerLocalSearchQuestion,
  answerSchoolFactQuestion,
  answerStudentRecordQuestionFromFacts,
  buildTransientAssistantFailureReply,
  planShortConversationMemory,
} from "../services/ragService.js";
import {
  classifyStudentAiIntent,
  detectGraduationEligibilityQuestion,
  detectGraduationRequirementCreditsQuestion,
} from "../services/studentAiQuestionRouter.js";
import {
  evaluateGraduation,
  formatDeterministicGraduationAnswer,
  formatGraduationEvaluationFacts,
} from "../services/graduationEvaluationService.js";
import {
  answerDeterministicStudentRecordQuestion,
  buildStudentRecordFactsForQuestion,
} from "../services/studentRecordAiService.js";
import { getStudentAcademicsPayload } from "../services/studentAcademicsService.js";
import { getLegacyStudentProfile } from "../services/studentProfileService.js";
import { getStudentTranscriptPreviewPayload } from "../services/studentTranscriptService.js";
import {
  answerSelfReferentialQuestion,
  buildSafeLoggedInUserContext,
  sanitizeConversationFacts,
} from "../services/conversationFactsService.js";
import type { StudentAcademicsResponse } from "../types/studentAcademics.js";

type HistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

type GraduationReplySummary = {
  earnedCredits: number;
  requiredCredits: number;
  eligible: boolean;
  missingCredits: number;
  creditSource: "backend" | "history";
};

function readQuestion(req: Request): unknown {
  const body = req.body as Record<string, unknown> | null | undefined;
  if (body == null || typeof body !== "object") return undefined;
  return body.question;
}

function hasVerifiedAcademicData(academics: StudentAcademicsResponse): boolean {
  return (
    academics.courseRecords.length > 0 ||
    academics.transcript.length > 0 ||
    academics.enrollmentHistory.length > 0 ||
    academics.currentSchedule.length > 0
  );
}

function extractLatestKnownEarnedCredits(history: HistoryTurn[] | undefined): number | null {
  if (history == null || history.length === 0) return null;
  const patterns = [
    /currently have\s+(\d+(?:\.\d+)?)\s+earned\s+credits?/i,
    /currently have\s+(\d+(?:\.\d+)?)\s+credits?/i,
    /已有\s*(\d+(?:\.\d+)?)\s*学分/,
    /你目前已有\s*(\d+(?:\.\d+)?)\s*学分/,
  ];

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    if (item?.role !== "assistant") continue;
    for (const pattern of patterns) {
      const match = pattern.exec(item.content);
      if (match?.[1] == null) continue;
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }

  return null;
}

function resolveGraduationReplySummary(args: {
  historyEarnedCredits: number | null;
  evaluation: Awaited<ReturnType<typeof evaluateGraduation>>;
}): GraduationReplySummary {
  const earnedCredits = args.historyEarnedCredits ?? args.evaluation.earnedCredits;
  const missingCredits = Math.max(args.evaluation.requiredCredits - earnedCredits, 0);
  const eligible = args.evaluation.eligible && missingCredits <= 0;
  return {
    earnedCredits,
    requiredCredits: args.evaluation.requiredCredits,
    eligible,
    missingCredits,
    creditSource: args.historyEarnedCredits == null ? "backend" : "history",
  };
}

function isMostlyChinese(text: string): boolean {
  const hanCount = text.match(/[\u4E00-\u9FFF]/g)?.length ?? 0;
  if (hanCount === 0) return false;
  const latinCount = text.match(/[A-Za-z]/g)?.length ?? 0;
  return hanCount > latinCount || (latinCount === 0 && hanCount >= 2);
}

function formatAdditionalGraduationRequirements(
  question: string,
  evaluation: Awaited<ReturnType<typeof evaluateGraduation>>,
): string[] {
  const zh = isMostlyChinese(question);
  const lines: string[] = [];

  if (evaluation.missingCourses.length > 0) {
    lines.push(
      zh
        ? `另外，你还缺这些必修课：${evaluation.missingCourses.join("、")}。`
        : `You are also still missing these required courses: ${evaluation.missingCourses.join(", ")}.`,
    );
  }

  if (evaluation.requiredGpa != null && evaluation.missingGpa != null) {
    lines.push(
      zh
        ? `另外，毕业要求 GPA 至少为 ${evaluation.requiredGpa}，你目前还差 ${evaluation.missingGpa}。`
        : `There is also a GPA requirement of ${evaluation.requiredGpa}, and you are currently short by ${evaluation.missingGpa}.`,
    );
  }

  if (
    evaluation.maximumWithdrawals != null &&
    evaluation.withdrawalCount > evaluation.maximumWithdrawals
  ) {
    lines.push(
      zh
        ? `另外，你的退课次数为 ${evaluation.withdrawalCount}，超过了允许的 ${evaluation.maximumWithdrawals} 次。`
        : `Your withdrawal count is ${evaluation.withdrawalCount}, which exceeds the allowed maximum of ${evaluation.maximumWithdrawals}.`,
    );
  }

  return lines;
}

/**
 * POST /api/ai/ask
 * Body: {
 *   question: string,
 *   history?: { role: 'user' | 'assistant', content: string }[],
 *   conversationFacts?: { statedName?: string, preferredLanguage?: 'en' | 'zh' }
 * }
 */
export async function postAiAsk(req: Request, res: Response): Promise<void> {
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

  const body = req.body as Record<string, unknown> | null | undefined;
  const q = readQuestion(req);
  if (typeof q !== "string") {
    res.status(400).json({
      error: "question is required and must be a string",
    });
    return;
  }

  if (
    body != null &&
    typeof body === "object" &&
    Object.prototype.hasOwnProperty.call(body, "history") &&
    body.history != null &&
    !Array.isArray(body.history)
  ) {
    res.status(400).json({ error: "history must be an array when provided" });
    return;
  }

  const rawHistory =
    body != null &&
    typeof body === "object" &&
    Object.prototype.hasOwnProperty.call(body, "history")
      ? body.history
      : undefined;
  const rawConversationFacts =
    body != null &&
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
    const selfReferentialAnswer = answerSelfReferentialQuestion(
      q,
      identityContext,
    );
    if (selfReferentialAnswer != null) {
      console.debug("[ai/ask] pipeline used", {
        pipeline: "self_referential_identity",
        hasConversationName: Boolean(conversationFacts?.statedName),
        hasSafeDisplayName: Boolean(identityContext.safeProfile?.displayName),
      });
      res.status(200).json({
        question: q,
        answer: selfReferentialAnswer,
        sources: [],
      });
      return;
    }

    const initialIntent = classifyStudentAiIntent(q);
    const memoryPlan = planShortConversationMemory(q, rawHistory, initialIntent);
    const routedIntent = memoryPlan.effectiveIntent;
    const isGraduationQuestion = detectGraduationEligibilityQuestion(q);
    const isGraduationRequirementCreditsQuestion =
      detectGraduationRequirementCreditsQuestion(q);
    const isGraduationBackendQuestion =
      isGraduationQuestion || isGraduationRequirementCreditsQuestion;
    console.debug("[ai/ask] detected intent", {
      initialIntent,
      effectiveIntent: routedIntent,
      isFollowUp: memoryPlan.isFollowUp,
      isTopicSwitch: memoryPlan.isTopicSwitch,
      previousDomain: memoryPlan.previousDomain,
      retainedHistoryMessages: memoryPlan.history?.length ?? 0,
      isGraduationQuestion,
      isGraduationRequirementCreditsQuestion,
    });

    if (
      isGraduationBackendQuestion ||
      routedIntent === "student_record" ||
      routedIntent === "mixed"
    ) {
      const academics = await getStudentAcademicsPayload(authStudent.studentId);
      let transcriptPreviewCount = 0;
      if (!hasVerifiedAcademicData(academics)) {
        const transcriptPreview = await getStudentTranscriptPreviewPayload(
          authStudent.studentId,
        );
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

      if (
        !hasVerifiedAcademicData(academics) &&
        transcriptPreviewCount <= 0
      ) {
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
          answer:
            "I couldn't load any verified academic records from marks, portal enrollments, portal courses, or registration for your account, so I can't answer this from student data.",
          sources: [],
        });
        return;
      }
    }

    if (isGraduationBackendQuestion) {
      const evaluation = await evaluateGraduation(authStudent.studentId);
      const historyEarnedCredits = extractLatestKnownEarnedCredits(memoryPlan.history);
      const replySummary = resolveGraduationReplySummary({
        historyEarnedCredits,
        evaluation,
      });
      if (
        historyEarnedCredits != null &&
        historyEarnedCredits !== evaluation.earnedCredits
      ) {
        console.warn("[ai/ask] graduation credit mismatch between history and backend", {
          studentId: authStudent.studentId,
          historyEarnedCredits,
          backendEarnedCredits: evaluation.earnedCredits,
          requiredCredits: evaluation.requiredCredits,
        });
      }
      console.debug("[ai/ask] graduation evaluation summary", {
        resolvedStudentId: authStudent.studentId,
        earnedCredits: replySummary.earnedCredits,
        requiredCredits: replySummary.requiredCredits,
        eligible: replySummary.eligible,
        missingCredits: replySummary.missingCredits,
        creditSource: replySummary.creditSource,
        missingCourseCount: evaluation.missingCourses.length,
        ruleSetId: evaluation.ruleSetId,
      });
      const answer = [
        formatDeterministicGraduationAnswer(q, replySummary),
        ...formatAdditionalGraduationRequirements(q, evaluation),
      ].join("\n");
      console.debug("[ai/ask] pipeline used", {
        pipeline: "graduation_evaluation",
        eligible: replySummary.eligible,
        ruleSetId: evaluation.ruleSetId,
        missingCourseCount: evaluation.missingCourses.length,
        missingCredits: replySummary.missingCredits,
        structuredEvaluation: formatGraduationEvaluationFacts(evaluation),
      });
      res.status(200).json({
        question: q,
        answer,
        sources: [],
      });
      return;
    }

    if (routedIntent === "general") {
      console.debug("[ai/ask] pipeline used", { pipeline: "general" });
      const result = await answerGeneralQuestion(q, memoryPlan.history, {
        identityContext,
      });
      res.status(200).json(result);
      return;
    }

    if (routedIntent === "school_fact") {
      console.debug("[ai/ask] pipeline used", { pipeline: "school_fact" });
      const result = answerSchoolFactQuestion(q);
      res.status(200).json(result);
      return;
    }

    if (routedIntent === "local_search") {
      console.debug("[ai/ask] pipeline used", { pipeline: "local_search" });
      const result = answerLocalSearchQuestion(q);
      res.status(200).json(result);
      return;
    }

    if (routedIntent === "student_record") {
      const deterministic = await answerDeterministicStudentRecordQuestion(
        authStudent.studentId,
        q,
      );
      if (deterministic != null) {
        console.debug("[ai/ask] pipeline used", {
          pipeline: "student_record",
          deterministicStudentFactsUsed: true,
          ragUsed: false,
          helperCount: deterministic.usedHelpers.length,
        });
        res.status(200).json(deterministic.result);
        return;
      }
      const recordFacts = await buildStudentRecordFactsForQuestion(
        authStudent.studentId,
        q,
      );
      if (recordFacts != null) {
        console.debug("[ai/ask] pipeline used", {
          pipeline: "student_record",
          deterministicStudentFactsUsed: true,
          ragUsed: false,
          helperCount: recordFacts.usedHelpers.length,
        });
        const result = await answerStudentRecordQuestionFromFacts(
          q,
          recordFacts.contextText,
          identityContext,
        );
        res.status(200).json(result);
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
        answer:
          "I could not build a verified student-record answer from backend data, so I did not fall back to a guessed answer.",
        sources: [],
      });
      return;
    }

    if (routedIntent === "policy") {
      console.debug("[ai/ask] pipeline used", { pipeline: "policy" });
      const result = await answerAmuQuestion(q, memoryPlan.history, {
        pipeline: "policy",
        identityContext,
      });
      res.status(200).json(result);
      return;
    }

    const recordFacts = await buildStudentRecordFactsForQuestion(
      authStudent.studentId,
      q,
    );
    if (recordFacts == null) {
      console.error("[AI DEBUG] mixed intent missing student record facts", {
        studentId: authStudent.studentId,
        question: q,
      });
      res.status(200).json({
        question: q,
        answer:
          "I could not build verified student-record facts for this mixed question, so I did not fall back to a guessed answer.",
        sources: [],
      });
      return;
    }
    const studentContextText = recordFacts.contextText;

    console.debug("[ai/ask] pipeline used", {
      pipeline: "mixed",
      deterministicStudentFactsUsed: true,
      ragUsed: true,
      helperCount: recordFacts.usedHelpers.length,
    });

    const result = await answerAmuQuestion(q, memoryPlan.history, {
      pipeline: "mixed",
      studentContext: studentContextText,
      identityContext,
    });
    res.status(200).json(result);
  } catch (e) {
    if (e instanceof RagQuestionValidationError) {
      res.status(400).json({ error: e.message });
      return;
    }
    console.error("[ai/ask]", e);
    res.status(200).json({
      question: typeof q === "string" ? q : "",
      answer: typeof q === "string" ? buildTransientAssistantFailureReply(q) : "Internal processing failed",
      sources: [],
    });
  }
}
