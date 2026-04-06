export type AIAssistantPageContext =
  | 'registration'
  | 'finances'
  | 'academics'
  | 'clinical'
  | 'documents'
  | 'account'
  | 'general'

/** Derive assistant page context from the current route (no query string). */
export function deriveAIAssistantPageContext(pathname: string): AIAssistantPageContext {
  const p = pathname.split('?')[0].toLowerCase()
  if (p.startsWith('/registration')) return 'registration'
  if (p.startsWith('/finances')) return 'finances'
  if (p.startsWith('/academics')) return 'academics'
  if (p.startsWith('/clinical')) return 'clinical'
  if (p.startsWith('/documents')) return 'documents'
  if (p.startsWith('/profile') || p.startsWith('/my-account')) return 'account'
  return 'general'
}

const WELCOME_LINES: Record<AIAssistantPageContext, readonly string[]> = {
  registration: [
    'Hi — I am the AMU AI Assistant cat.',
    'I can help with course search, your course bin, timetable planning, syllabi, prerequisites, and registration steps.',
  ],
  finances: [
    'Hi — I am the AMU AI Assistant cat.',
    'I can help explain tuition, billing, payments, installment plans, and general account questions.',
  ],
  academics: [
    'Hi — I am the AMU AI Assistant cat.',
    'I can help with grades, transcripts, GPA, academic progress, enrollment verification, and academics navigation in myAMU.',
  ],
  clinical: [
    'Hi — I am the AMU AI Assistant cat.',
    'I can help with clinical scheduling, hours, evaluations, compliance pages, and how to use this part of the portal.',
  ],
  documents: [
    'Hi — I am the AMU AI Assistant cat.',
    'I can help with registration forms, agreements, quizzes, and finding documents in this section of the portal.',
  ],
  account: [
    'Hi — I am the AMU AI Assistant cat.',
    'I can help with profile settings, student contact information, and general myAMU navigation.',
  ],
  general: [
    'Hi — I am the AMU AI Assistant cat.',
    'I can help with course planning, student portal guidance, billing questions, documents, and general navigation.',
  ],
}

export function getWelcomeLines(context: AIAssistantPageContext): readonly string[] {
  return WELCOME_LINES[context]
}

/** Plain-text welcome for accessibility / fallbacks. */
export function getWelcomeMessage(context: AIAssistantPageContext): string {
  return getWelcomeLines(context).join('\n\n')
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

const ACADEMICS_RULES: KeywordRule[] = [
  {
    keywords: ['grade', 'grades', 'gpa'],
    reply:
      'Grades and GPA summaries in Academics reflect posted coursework. If a grade is missing or incorrect, note the course and term before contacting the registrar or instructor.',
  },
  {
    keywords: ['transcript'],
    reply:
      'Transcript pages show your academic record as the school publishes it. Use official requests through the registrar when you need a transcript sent to a third party.',
  },
  {
    keywords: ['progress', 'degree', 'audit'],
    reply:
      'Academic progress views help compare completed work to program requirements. Your advisor can interpret exceptions, substitutions, and remaining requirements.',
  },
  {
    keywords: ['enrollment', 'verification'],
    reply:
      'Enrollment verification confirms your status for insurers or employers. Generate or download what the portal offers, and contact the registrar if an external form is required.',
  },
]

const CLINICAL_RULES: KeywordRule[] = [
  {
    keywords: ['schedule', 'rotation', 'site'],
    reply:
      'Clinical scheduling tools show where you are expected and when. Confirm last-minute changes with your coordinator; the portal may not reflect real-time adjustments.',
  },
  {
    keywords: ['hour', 'hours'],
    reply:
      'Required hours pages summarize expectations for clinical time. Log hours the way your program specifies so evaluations and compliance stay accurate.',
  },
  {
    keywords: ['evaluation', 'eval'],
    reply:
      'Evaluations capture feedback from preceptors and faculty. Complete them by the deadlines shown so your file stays current.',
  },
  {
    keywords: ['compliance', 'immunization', 'credential'],
    reply:
      'Compliance sections list documents and health requirements. Upload items promptly and follow up with clinical administration if something is rejected or expired.',
  },
]

const DOCUMENTS_RULES: KeywordRule[] = [
  {
    keywords: ['form', 'registration form'],
    reply:
      'Registration forms here are completed and submitted per term or program instructions. Save confirmations and contact the registrar if a form stays in pending status.',
  },
  {
    keywords: ['agreement', 'policy'],
    reply:
      'Agreements and policy acknowledgements are records of your acceptance. Read the linked text carefully; contact the listed office if you need clarification before signing.',
  },
  {
    keywords: ['quiz'],
    reply:
      'Quizzes in Documents may be required before registration or clinical access. Finish all required attempts and keep screenshots of completion if the portal is slow to update.',
  },
]

const PORTAL_WIDE_RULES: KeywordRule[] = [
  {
    keywords: ['login', 'password', 'sign in'],
    reply:
      'Account access issues are handled outside this assistant. Use the portal login help or IT support channels your school publishes; avoid sharing passwords in chat.',
  },
  {
    keywords: ['dashboard', 'home'],
    reply:
      'The dashboard links to major modules like registration, finances, and academics. Use the sidebar for deeper pages; confirm deadlines on official school communications.',
  },
  {
    keywords: ['document', 'upload', 'pdf'],
    reply:
      'Documents may live under Documents, Academics, or Clinical depending on type. If you cannot find a file, check the module sidebar and search within the page.',
  },
  {
    keywords: ['payment', 'pay', 'bill'],
    reply:
      'Billing and payments are centered under Finances. You can review balances, plans, and history there; confirm amounts with student accounts before large transactions.',
  },
  {
    keywords: ['course', 'class'],
    reply:
      'Course planning spans Registration and Academics. Search and enroll in Registration; review grades and records in Academics after the term.',
  },
]

const CONTEXT_FALLBACK: Record<AIAssistantPageContext, string> = {
  registration:
    'I can help you think through registration steps: picking a term, searching courses, using your course bin, checkout, and schedule planning. Try asking about syllabi, prerequisites, or conflicts — and verify deadlines with the registrar.',
  finances:
    'I can help you interpret finances topics: balances, charges, payments, installment plans, and late fees. Ask using words like tuition, balance, payment, or statement — and confirm official figures with student accounts.',
  academics:
    'I can help you navigate academics: grades, transcripts, GPA, progress, and enrollment verification. Ask about a specific page or task — and confirm official records with the registrar.',
  clinical:
    'I can help you find your way around clinical tools: schedule, hours, evaluations, and compliance. Ask about a specific workflow — and confirm requirements with your program office.',
  documents:
    'I can help with forms, agreements, and quizzes in Documents. Describe what you are trying to submit or find — and confirm requirements with the registrar.',
  account:
    'I can help with profile and my-account navigation. Describe what you want to update — and confirm sensitive changes with student services if needed.',
  general:
    'I can help with course planning, portal navigation, billing questions, and documents. Ask in your own words — and confirm official policies with the appropriate office.',
}

const REGISTRATION_FALLBACK = CONTEXT_FALLBACK.registration
const FINANCES_FALLBACK = CONTEXT_FALLBACK.finances

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

function firstMatchingRules(rulesList: KeywordRule[][], q: string): string | null {
  for (const rules of rulesList) {
    const hit = firstMatchingRule(rules, q)
    if (hit) return hit
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
    return CONTEXT_FALLBACK[context]
  }

  if (context === 'registration') {
    return firstMatchingRule(REGISTRATION_RULES, q) ?? REGISTRATION_FALLBACK
  }
  if (context === 'finances') {
    return firstMatchingRule(FINANCES_RULES, q) ?? FINANCES_FALLBACK
  }

  const ruleSets: KeywordRule[][] =
    context === 'academics'
      ? [ACADEMICS_RULES, PORTAL_WIDE_RULES]
      : context === 'clinical'
        ? [CLINICAL_RULES, PORTAL_WIDE_RULES]
        : context === 'documents'
          ? [DOCUMENTS_RULES, PORTAL_WIDE_RULES]
          : [PORTAL_WIDE_RULES]

  return firstMatchingRules(ruleSets, q) ?? CONTEXT_FALLBACK[context]
}
