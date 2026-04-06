export type AIAssistantPageContext = 'registration' | 'finances'

const WELCOME: Record<AIAssistantPageContext, string> = {
  registration:
    'Hi — I am the AMU AI Assistant for registration. Ask about course search, your course bin, checkout, building a schedule, syllabi, prerequisites, or choosing the right term. I am a demo helper right now; confirm important dates and policies with the registrar.',
  finances:
    'Hi — I am the AMU AI Assistant for finances. Ask about your balance, tuition, making a payment, installment plans, statements, or late fees. I am a demo helper right now; confirm amounts and deadlines with the bursar or student accounts office.',
}

export function getWelcomeMessage(context: AIAssistantPageContext): string {
  return WELCOME[context]
}

type KeywordRule = { keywords: string[]; reply: string }

const REGISTRATION_RULES: KeywordRule[] = [
  {
    keywords: ['syllabus', 'syllabi', 'outline'],
    reply:
      'Syllabi describe learning outcomes, texts, grading, and key dates. In Course Search, open a section to review details the school publishes; your instructor may post the full syllabus in the LMS after you enroll.',
  },
  {
    keywords: ['prerequisite', 'prereq', 'pre-req'],
    reply:
      'Prerequisites are courses or standing required before you can enroll. If a section is blocked, check the catalog note for that course and your completed coursework; academic advising can help plan a sequence.',
  },
  {
    keywords: ['term', 'semester', 'quarter'],
    reply:
      'Use the term selector at the top of Registration so search, your course bin, and checkout all use the same academic term. Switch terms before adding sections intended for a different period.',
  },
  {
    keywords: ['bin', 'cart', 'course bin'],
    reply:
      'Your course bin holds sections you are considering. Add courses from Course Search, review times and seats, then use checkout when you are ready to finalize for the selected term.',
  },
  {
    keywords: ['checkout', 'enroll', 'register'],
    reply:
      'Checkout is where you confirm the sections in your bin for the active term. Resolve any holds or conflicts shown, then complete the steps the portal presents.',
  },
  {
    keywords: ['schedule', 'calendar', 'conflict'],
    reply:
      'Open Schedule to see how your selected sections line up by day and time. If two meetings overlap, adjust one section or pick another before you finalize registration.',
  },
  {
    keywords: ['search', 'find course', 'section'],
    reply:
      'Use Course Search with the term selector set, then filter by subject or keyword. Compare section notes (modality, campus, times) before adding to your bin.',
  },
  {
    keywords: ['credit', 'credits', 'full time'],
    reply:
      'Credit load affects billing and academic standing. Balance your plan with work and clinical hours; your program handbook and advisor can suggest a typical load per term.',
  },
]

const FINANCES_RULES: KeywordRule[] = [
  {
    keywords: ['installment', 'payment plan', 'plan'],
    reply:
      'Installment plans split tuition into scheduled payments. Review the plan terms on this page (due dates, fees, and what happens if a payment is missed) and contact student accounts if you need to change arrangements.',
  },
  {
    keywords: ['late fee', 'late fees', 'penalty'],
    reply:
      'Late fees may apply when a payment deadline passes. Check your ledger and any notices for assessed amounts; paying the past-due portion as soon as possible limits further charges.',
  },
  {
    keywords: ['tuition', 'cost', 'price'],
    reply:
      'Tuition is driven by your program, term, and enrolled credits or clock hours. Use your account summary and ledger on this overview to see current charges and credits applied.',
  },
  {
    keywords: ['balance', 'owe', 'due', 'amount'],
    reply:
      'Your balance is the net of charges minus payments and approved credits. If something looks off, note the transaction date and description in the ledger before contacting the bursar with specifics.',
  },
  {
    keywords: ['pay', 'payment', 'card', 'ach'],
    reply:
      'When you make a payment, keep the confirmation reference. Allow a short processing window before the ledger updates; if it does not appear, contact student accounts with the confirmation details.',
  },
  {
    keywords: ['statement', 'bill', 'invoice'],
    reply:
      'Statements summarize charges and activity for a period. Compare them to the line items in your ledger here so you can reconcile due dates and payment history.',
  },
  {
    keywords: ['refund', 'credit balance'],
    reply:
      'Refunds and credit balances follow school policy and timing (e.g., drop/add dates). For your situation, student accounts can explain eligibility and how funds are returned.',
  },
  {
    keywords: ['hold', 'bursar'],
    reply:
      'Financial holds can block registration or transcripts until resolved. The portal usually indicates the office to contact; clearing the underlying balance or paperwork typically releases the hold.',
  },
]

const REGISTRATION_FALLBACK =
  'I can help you think through registration steps: picking a term, searching courses, using your course bin, checkout, and schedule planning. Try asking about syllabi, prerequisites, or conflicts — and verify deadlines with the registrar.'

const FINANCES_FALLBACK =
  'I can help you interpret this finances overview: balances, charges, payments, installment plans, and late fees. Ask using words like tuition, balance, payment, or statement — and confirm official figures with student accounts.'

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

function firstMatchingRule(rules: KeywordRule[], q: string): string | null {
  for (const rule of rules) {
    if (rule.keywords.some((k) => q.includes(k))) {
      return rule.reply
    }
  }
  return null
}

/**
 * Local keyword-based replies for the AI assistant UI.
 * Replace the implementation behind {@link sendAssistantMessage} when wiring a backend.
 */
export function generateMockAssistantReply(
  userText: string,
  context: AIAssistantPageContext,
): string {
  const q = normalize(userText)
  if (q === '') {
    return context === 'registration' ? REGISTRATION_FALLBACK : FINANCES_FALLBACK
  }

  if (context === 'registration') {
    return firstMatchingRule(REGISTRATION_RULES, q) ?? REGISTRATION_FALLBACK
  }
  return firstMatchingRule(FINANCES_RULES, q) ?? FINANCES_FALLBACK
}
