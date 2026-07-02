import { t, type PortalLocale, type StudentPortalKey } from '@/lib/i18n'
import { AI_ASSISTANT_COMING_SOON } from '@/lib/aiAssistantConfig'

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
  if (p.startsWith('/clinical')) return 'clinical'
  if (p.startsWith('/registration')) return 'registration'
  if (p.startsWith('/finances')) return 'finances'
  if (p.startsWith('/academics')) return 'academics'
  if (p.startsWith('/documents')) return 'documents'
  if (p.startsWith('/profile') || p.startsWith('/my-account')) return 'account'
  return 'general'
}

const WELCOME_KEY_PAIRS: Record<
  AIAssistantPageContext,
  readonly [StudentPortalKey, StudentPortalKey]
> = {
  registration: ['aiWelcomeHi', 'aiWelcomeRegistration'],
  finances: ['aiWelcomeHi', 'aiWelcomeFinances'],
  academics: ['aiWelcomeHi', 'aiWelcomeAcademics'],
  clinical: ['aiWelcomeHi', 'aiWelcomeClinical'],
  documents: ['aiWelcomeHi', 'aiWelcomeDocuments'],
  account: ['aiWelcomeHi', 'aiWelcomeAccount'],
  general: ['aiWelcomeHi', 'aiWelcomeGeneral'],
}

export function getWelcomeLines(
  locale: PortalLocale,
  context: AIAssistantPageContext,
): readonly string[] {
  if (AI_ASSISTANT_COMING_SOON) {
    return [t(locale, 'aiWelcomeHi'), t(locale, 'aiComingSoonMessage')]
  }
  const [a, b] = WELCOME_KEY_PAIRS[context]
  return [t(locale, a), t(locale, b)]
}

/** Plain-text welcome for accessibility / fallbacks. */
export function getWelcomeMessage(locale: PortalLocale, context: AIAssistantPageContext): string {
  return getWelcomeLines(locale, context).join('\n\n')
}

type LocalizedRule = { keywords: string[]; en: string; zh: string }

function pick(locale: PortalLocale, rule: LocalizedRule): string {
  return locale === 'zh' ? rule.zh : rule.en
}

const REGISTRATION_RULES: LocalizedRule[] = [
  {
    keywords: ['syllabus', 'syllabi', 'outline'],
    en: 'Syllabi describe learning outcomes, texts, grading, and key dates. In Course Search, open a section to review details the school publishes; your instructor may post the full syllabus in the LMS after you enroll.',
    zh: '教學大綱說明學習成果、用書、評量與重要日期。在課程搜尋中開啟班級可檢視學校公布之內容；註冊後教師可能於教學平台提供完整大綱。',
  },
  {
    keywords: ['prerequisite', 'prereq', 'pre-req'],
    en: 'Prerequisites are courses or standing required before you can enroll. If a section is blocked, check the catalog note for that course and your completed coursework; academic advising can help plan a sequence.',
    zh: '先修為註冊前須具備之課程或資格。若無法選上某班，請查該課目錄說明與您已修課程；學業諮詢可協助規劃修課順序。',
  },
  {
    keywords: ['term', 'semester', 'quarter'],
    en: 'Use the term selector at the top of Registration so search, your course bin, and checkout all use the same academic term. Switch terms before adding sections intended for a different period.',
    zh: '請在選課註冊頁上方選擇學期，使搜尋、課程暫存與結帳皆使用同一學期。若課程屬其他學期，請先切換學期再加入。',
  },
  {
    keywords: ['bin', 'cart', 'course bin'],
    en: 'Your course bin holds sections you are considering. Add courses from Course Search, review times and seats, then use checkout when you are ready to finalize for the selected term.',
    zh: '課程暫存用於放置您考慮中的班級。自課程搜尋加入後，請確認時間與名額，準備好後再於結帳完成該學期註冊。',
  },
  {
    keywords: ['checkout', 'enroll', 'register'],
    en: 'Checkout is where you confirm the sections in your bin for the active term. Resolve any holds or conflicts shown, then complete the steps the portal presents.',
    zh: '結帳頁面用於確認目前學期暫存中之班級。請依畫面解決停權或衝突後完成步驟。',
  },
  {
    keywords: ['schedule', 'calendar', 'conflict'],
    en: 'Open Schedule to see how your selected sections line up by day and time. If two meetings overlap, adjust one section or pick another before you finalize registration.',
    zh: '開啟課表可依星期與時間檢視所選班級。若有重疊，請在確認註冊前調整其中一班或另選班級。',
  },
  {
    keywords: ['search', 'find course', 'section'],
    en: 'Use Course Search with the term selector set, then filter by subject or keyword. Compare section notes (modality, campus, times) before adding to your bin.',
    zh: '請先設定學期後使用課程搜尋，並可依科目或關鍵字篩選。加入暫存前請比較各班註記（授課型態、校區、時間等）。',
  },
  {
    keywords: ['credit', 'credits', 'full time'],
    en: 'Credit load affects billing and academic standing. Balance your plan with work and clinical hours; your program handbook and advisor can suggest a typical load per term.',
    zh: '學分負荷影響帳務與學籍身分。請搭配工讀與臨床時數規劃；學程手冊與導師可提供每學期建議修習量。',
  },
]

const FINANCES_RULES: LocalizedRule[] = [
  {
    keywords: ['installment', 'payment plan', 'plan'],
    en: 'Installment plans split tuition into scheduled payments. Review the plan terms on this page (due dates, fees, and what happens if a payment is missed) and contact student accounts if you need to change arrangements.',
    zh: '分期方案將學費分次繳納。請於本頁確認條款（到期日、費用與逾期後果），若需變更請聯絡學生帳務。',
  },
  {
    keywords: ['late fee', 'late fees', 'penalty'],
    en: 'Late fees may apply when a payment deadline passes. Check your ledger and any notices for assessed amounts; paying the past-due portion as soon as possible limits further charges.',
    zh: '逾期未繳可能產生滯納金。請查帳本與通知上的金額；盡快繳清逾期部分可降低額外費用。',
  },
  {
    keywords: ['tuition', 'cost', 'price'],
    en: 'Tuition is driven by your program, term, and enrolled credits or clock hours. Use your account summary and ledger on this overview to see current charges and credits applied.',
    zh: '學費依學程、學期與修習學分或時數而定。請於總覽之帳戶摘要與帳本查看目前費用與沖帳。',
  },
  {
    keywords: ['balance', 'owe', 'due', 'amount'],
    en: 'Your balance is the net of charges minus payments and approved credits. If something looks off, note the transaction date and description in the ledger before contacting the bursar with specifics.',
    zh: '餘額為費用減去付款與核定沖帳後之淨額。若數字有疑義，請先記下帳本交易日期與說明再聯絡出納。',
  },
  {
    keywords: ['pay', 'payment', 'card', 'ach'],
    en: 'When you make a payment, keep the confirmation reference. Allow a short processing window before the ledger updates; if it does not appear, contact student accounts with the confirmation details.',
    zh: '付款後請保留確認編號。入帳可能需要短暫處理時間；若帳本未更新，請持確認資料聯絡學生帳務。',
  },
  {
    keywords: ['statement', 'bill', 'invoice'],
    en: 'Statements summarize charges and activity for a period. Compare them to the line items in your ledger here so you can reconcile due dates and payment history.',
    zh: '帳單摘要特定期間之費用與活動。請與此處帳本逐筆核對到期日與繳款紀錄。',
  },
  {
    keywords: ['refund', 'credit balance'],
    en: 'Refunds and credit balances follow school policy and timing (e.g., drop/add dates). For your situation, student accounts can explain eligibility and how funds are returned.',
    zh: '退款與貸方餘額依校規與時程（如加退選期限）。個案請洽學生帳務了解資格與退款方式。',
  },
  {
    keywords: ['hold', 'bursar'],
    en: 'Financial holds can block registration or transcripts until resolved. The portal usually indicates the office to contact; clearing the underlying balance or paperwork typically releases the hold.',
    zh: '財務停權可能阻擋註冊或成績單，須先解決。入口通常會提示聯絡單位；清償欠款或補件後多可解除。',
  },
]

const ACADEMICS_RULES: LocalizedRule[] = [
  {
    keywords: ['grade', 'grades', 'gpa'],
    en: 'Grades and GPA summaries in Academics reflect posted coursework. If a grade is missing or incorrect, note the course and term before contacting the registrar or instructor.',
    zh: '學業區的成績與 GPA 反映已登錄課程。若缺誤，請記下課程與學期後聯絡註冊組或授課教師。',
  },
  {
    keywords: ['transcript'],
    en: 'Transcript pages show your academic record as the school publishes it. Use official requests through the registrar when you need a transcript sent to a third party.',
    zh: '成績單頁顯示學校公布之學業紀錄。若需對外寄送正式成績單，請透過註冊組申請。',
  },
  {
    keywords: ['progress', 'degree', 'audit'],
    en: 'Academic progress views help compare completed work to program requirements. Your advisor can interpret exceptions, substitutions, and remaining requirements.',
    zh: '學習進度檢視可比對已完成與學程要求。抵免與例外請由導師協助解讀。',
  },
  {
    keywords: ['enrollment', 'verification'],
    en: 'Enrollment verification confirms your status for insurers or employers. Generate or download what the portal offers, and contact the registrar if an external form is required.',
    zh: '在學證明供保險或雇主查核。請使用入口提供之下載或產生功能；特殊表格請洽註冊組。',
  },
]

const CLINICAL_RULES: LocalizedRule[] = [
  {
    keywords: ['schedule', 'rotation', 'site'],
    en: 'Clinical scheduling tools show where you are expected and when. Confirm last-minute changes with your coordinator; the portal may not reflect real-time adjustments.',
    zh: '臨床排程顯示應到地點與時間。臨時變動請與協調員確認；入口未必即時反映現場調整。',
  },
  {
    keywords: ['hour', 'hours'],
    en: 'Required hours pages summarize expectations for clinical time. Log hours the way your program specifies so evaluations and compliance stay accurate.',
    zh: '應有時數頁摘要臨床時間要求。請依學程規定登錄，以維持評核與合規正確。',
  },
  {
    keywords: ['evaluation', 'eval'],
    en: 'Evaluations capture feedback from preceptors and faculty. Complete them by the deadlines shown so your file stays current.',
    zh: '評核蒐集臨床教師與教師回饋。請於期限前完成以保持檔案有效。',
  },
  {
    keywords: ['compliance', 'immunization', 'credential'],
    en: 'Compliance sections list documents and health requirements. Upload items promptly and follow up with clinical administration if something is rejected or expired.',
    zh: '合規區列出文件與健康要求。請盡速上傳；若遭退件或過期請聯絡臨床行政單位。',
  },
]

const DOCUMENTS_RULES: LocalizedRule[] = [
  {
    keywords: ['form', 'registration form'],
    en: 'Registration forms here are completed and submitted per term or program instructions. Save confirmations and contact the registrar if a form stays in pending status.',
    zh: '註冊表單依學期或學程說明完成送出。請保留確認；若長期待處理請聯絡註冊組。',
  },
  {
    keywords: ['agreement', 'policy'],
    en: 'Agreements and policy acknowledgements are records of your acceptance. Read the linked text carefully; contact the listed office if you need clarification before signing.',
    zh: '同意書與政策確認為您接受之紀錄。簽署前請詳閱連結內容；有疑問請洽註明單位。',
  },
  {
    keywords: ['quiz'],
    en: 'Quizzes in Documents may be required before registration or clinical access. Finish all required attempts and keep screenshots of completion if the portal is slow to update.',
    zh: '文件區測驗可能為註冊或臨床前必備。請完成所有應考次數；若系統更新延遲建議保留完成畫面。',
  },
]

const PORTAL_WIDE_RULES: LocalizedRule[] = [
  {
    keywords: ['login', 'password', 'sign in'],
    en: 'Account access issues are handled outside this assistant. Use the portal login help or IT support channels your school publishes; avoid sharing passwords in chat.',
    zh: '帳戶登入問題請使用學校公布之協助管道或 IT 支援；請勿在對話中提供密碼。',
  },
  {
    keywords: ['dashboard', 'home'],
    en: 'The dashboard links to major modules like registration, finances, and academics. Use the sidebar for deeper pages; confirm deadlines on official school communications.',
    zh: '儀表板連結選課、財務、學業等主要模組。詳細頁面請用側欄；截止日請以學校正式通知為準。',
  },
  {
    keywords: ['document', 'upload', 'pdf'],
    en: 'Documents may live under Documents, Academics, or Clinical depending on type. If you cannot find a file, check the module sidebar and search within the page.',
    zh: '文件可能位於文件、學業或臨床等區。找不到時請查看該模組側欄並於頁內搜尋。',
  },
  {
    keywords: ['payment', 'pay', 'bill'],
    en: 'Billing and payments are centered under Finances. You can review balances, plans, and history there; confirm amounts with student accounts before large transactions.',
    zh: '帳務與付款以財務區為主。可於該處查看餘額、方案與紀錄；大額繳款前請與學生帳務確認。',
  },
  {
    keywords: ['course', 'class'],
    en: 'Course planning spans Registration and Academics. Search and enroll in Registration; review grades and records in Academics after the term.',
    zh: '課程規劃橫跨選課註冊與學業。於註冊區搜尋與選課；學期結束後於學業查看成績與紀錄。',
  },
]

const CONTEXT_FALLBACK: Record<AIAssistantPageContext, LocalizedRule> = {
  registration: {
    keywords: [],
    en: 'I can help you think through registration steps: picking a term, searching courses, using your course bin, checkout, and schedule planning. Try asking about syllabi, prerequisites, or conflicts — and verify deadlines with the registrar.',
    zh: '我可協助註冊流程：選學期、搜尋課程、課程暫存、結帳與課表規劃。可詢問教學大綱、先修或衝突，截止日請向註冊組確認。',
  },
  finances: {
    keywords: [],
    en: 'I can help you interpret finances topics: balances, charges, payments, installment plans, and late fees. Ask using words like tuition, balance, payment, or statement — and confirm official figures with student accounts.',
    zh: '我可協助解讀餘額、費用、付款、分期與滯納金等。可用學費、餘額、付款、帳單等詞提問，正式數字請向學生帳務確認。',
  },
  academics: {
    keywords: [],
    en: 'I can help you navigate academics: grades, transcripts, GPA, progress, and enrollment verification. Ask about a specific page or task — and confirm official records with the registrar.',
    zh: '我可協助學業導覽：成績、成績單、GPA、進度與在學證明。可詢問特定頁面或操作，正式紀錄請向註冊組確認。',
  },
  clinical: {
    keywords: [],
    en: 'I can help you find your way around clinical tools: schedule, hours, evaluations, and compliance. Ask about a specific workflow — and confirm requirements with your program office.',
    zh: '我可協助臨床工具導覽：排程、時數、評核與合規。可詢問特定流程，正式要求請向學程辦公室確認。',
  },
  documents: {
    keywords: [],
    en: 'I can help with forms, agreements, and quizzes in Documents. Describe what you are trying to submit or find — and confirm requirements with the registrar.',
    zh: '我可協助文件區的表單、同意書與測驗。請描述要提交或尋找的項目，正式要求請向註冊組確認。',
  },
  account: {
    keywords: [],
    en: 'I can help with profile and my-account navigation. Describe what you want to update — and confirm sensitive changes with student services if needed.',
    zh: '我可協助個人檔案與帳戶頁導覽。請說明欲更新項目，敏感變更請洽學生服務確認。',
  },
  general: {
    keywords: [],
    en: 'I can help with course planning, portal navigation, billing questions, and documents. Ask in your own words — and confirm official policies with the appropriate office.',
    zh: '我可協助課程規劃、入口導覽、帳務與文件相關問題。請用您的話描述，正式政策請向對應單位確認。',
  },
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

function firstMatchingRule(
  rules: LocalizedRule[],
  q: string,
  locale: PortalLocale,
): string | null {
  for (const rule of rules) {
    if (rule.keywords.some((k) => q.includes(k))) {
      return pick(locale, rule)
    }
  }
  return null
}

function firstMatchingRules(
  rulesList: LocalizedRule[][],
  q: string,
  locale: PortalLocale,
): string | null {
  for (const rules of rulesList) {
    const hit = firstMatchingRule(rules, q, locale)
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
  locale: PortalLocale = 'en',
): string {
  const q = normalize(userText)
  if (q === '') {
    return pick(locale, CONTEXT_FALLBACK[context])
  }

  if (context === 'registration') {
    return (
      firstMatchingRule(REGISTRATION_RULES, q, locale) ??
      pick(locale, CONTEXT_FALLBACK.registration)
    )
  }
  if (context === 'finances') {
    return (
      firstMatchingRule(FINANCES_RULES, q, locale) ??
      pick(locale, CONTEXT_FALLBACK.finances)
    )
  }

  const ruleSets: LocalizedRule[][] =
    context === 'academics'
      ? [ACADEMICS_RULES, PORTAL_WIDE_RULES]
      : context === 'clinical'
        ? [CLINICAL_RULES, PORTAL_WIDE_RULES]
        : context === 'documents'
          ? [DOCUMENTS_RULES, PORTAL_WIDE_RULES]
          : [PORTAL_WIDE_RULES]

  return (
    firstMatchingRules(ruleSets, q, locale) ?? pick(locale, CONTEXT_FALLBACK[context])
  )
}
