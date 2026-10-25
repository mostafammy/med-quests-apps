/**
 * Ready-to-Use AI Power Actions (One-Click Inquiries)
 * Defines high-yield clinical power actions (Why Right, Rule Out Wrong, Pivot Clues,
 * P-V Loop, Board Mnemonic, Peer Traps) with deterministic bilingual prompts and caching keys.
 */
export type PowerActionKey =
  | 'why_correct'
  | 'why_distractors_wrong'
  | 'pivot_clues'
  | 'pv_loop'
  | 'mnemonic'
  | 'peer_trap'
  | 'sealed_pivot_clues'
  | 'sealed_torn_choice';

export interface PowerActionDefinition {
  readonly key: PowerActionKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly labelAr: string;
  readonly shortLabelAr: string;
  readonly iconType: 'check' | 'x-circle' | 'search' | 'activity' | 'sparkles' | 'users' | 'help';
  readonly tooltip: string;
  readonly tooltipAr: string;
  readonly visibleWhen: 'sealed' | 'revealed' | 'always';
  readonly generatePrompt: (
    ctx: {
      questionStem: string;
      choices: readonly { id: string; text: string }[];
      correctChoiceId?: string;
      selectedChoiceId?: string | null;
    },
    lang?: 'en' | 'ar'
  ) => string;
}

export const POWER_ACTIONS: readonly PowerActionDefinition[] = [
  {
    key: 'why_correct',
    label: 'Why Right',
    shortLabel: 'Why Right',
    labelAr: 'لماذا صحيحة',
    shortLabelAr: 'لماذا صحيحة',
    iconType: 'check',
    tooltip: 'Explain why the correct answer is right using first-principles pathophysiology',
    tooltipAr: 'شرح سبب صحة الإجابة اعتماداً على الفيزيولوجيا المرضية والمبادئ الأولى',
    visibleWhen: 'revealed',
    generatePrompt: ({ choices, correctChoiceId }, lang = 'en') => {
      const correctChoice = choices.find((c) => c.id === correctChoiceId);
      const targetText = correctChoice
        ? `Option ${correctChoice.id.toUpperCase()} (${correctChoice.text})`
        : 'the correct choice';

      if (lang === 'ar') {
        return `اشرح بالتفصيل لماذا يعتبر ${targetText} هو الخيار الصحيح. فكك الفيزيولوجيا المرضية الأساسية استناداً إلى المبادئ الأولى ولماذا يطابق تحديداً العرض السريري للحالة.`;
      }
      return `Explain in depth why ${targetText} is the correct answer. Break down the core pathophysiology using first-principles and why it specifically matches the clinical presentation.`;
    },
  },
  {
    key: 'why_distractors_wrong',
    label: 'Rule Out Wrong',
    shortLabel: 'Rule Out Wrong',
    labelAr: 'استبعاد الخاطئ',
    shortLabelAr: 'استبعاد الخاطئ',
    iconType: 'x-circle',
    tooltip: 'Deconstruct each incorrect option and explain exactly why each distractor is wrong',
    tooltipAr: 'تفكيك كل خيار خاطئ وشرح سبب استبعاده والنتيجة التي كانت ستجعله صحيحاً',
    visibleWhen: 'revealed',
    generatePrompt: ({ choices, correctChoiceId }, lang = 'en') => {
      const wrongChoices = choices.filter((c) => c.id !== correctChoiceId);
      const wrongList = wrongChoices.map((c) => `Option ${c.id.toUpperCase()}: ${c.text}`).join('; ');

      if (lang === 'ar') {
        return `فكك جميع الخيارات غير الصحيحة (${wrongList}). لكل خيار مضلل، وضح: 1) لماذا يتم استبعاده في هذا المريض، و2) ما هي النتيجة السريرية المحددة التي كان يجب أن تتغير في الحالة ليكون صحيحاً.`;
      }
      return `Deconstruct all incorrect choices (${wrongList}). For each distractor, explain: 1) Why it is ruled out in this patient, and 2) What specific finding would need to change in the vignette for it to be correct.`;
    },
  },
  {
    key: 'pivot_clues',
    label: 'Pivot Clues',
    shortLabel: 'Pivot Clues',
    labelAr: 'المفاتيح الحاسمة',
    shortLabelAr: 'مفاتيح الحالة',
    iconType: 'search',
    tooltip: 'Highlight the decisive physical exam and vital sign pivot clues in the vignette',
    tooltipAr: 'إبراز المفاتيح السريرية الحاسمة (العلامات الحيوية، صفات النفخة، التطور الزمني)',
    visibleWhen: 'always',
    generatePrompt: (_ctx, lang = 'en') => {
      if (lang === 'ar') {
        return `ما هي المفاتيح السريرية الحاسمة في هذه الحالة (العلامات الحيوية، خصائص النفخة القلبية، التطور الزمني، الفحص السريري) التي تميز هذا التشخيص عن غيره؟`;
      }
      return `What are the decisive clinical pivot clues in this vignette (vital signs, murmur characteristics, chronicity, physical exam maneuvers) that differentiate the diagnosis from its mimics?`;
    },
  },
  {
    key: 'pv_loop',
    label: 'P-V Loop',
    shortLabel: 'P-V Loop',
    labelAr: 'منحنى الضغط والحجم',
    shortLabelAr: 'P-V Loop',
    iconType: 'activity',
    tooltip: 'Simulate ventricular Pressure-Volume curve mechanics for this lesion',
    tooltipAr: 'محاكاة منحنى الضغط والحجم للبطين الأيسر مقارنة بالفيزيولوجيا الطبيعية',
    visibleWhen: 'always',
    generatePrompt: (_ctx, lang = 'en') => {
      if (lang === 'ar') {
        return `قم بمحاكاة منحنى الضغط والحجم (P-V Loop) لهذه الآفة القلبية لدى المريض، وقارن آليات البطين (EDV, ESV, Stroke Volume, Peak LV pressure) بالفيزيولوجيا الطبيعية.`;
      }
      return `Simulate the Pressure-Volume (P-V) loop for this patient's lesion. Contrast the ventricular mechanics (EDV, ESV, Stroke Volume, Peak LV pressure) with normal physiology.`;
    },
  },
  {
    key: 'mnemonic',
    label: 'Board Mnemonic',
    shortLabel: 'Mnemonic',
    labelAr: 'وسيلة تذكر',
    shortLabelAr: 'تذكر (Mnemonic)',
    iconType: 'sparkles',
    tooltip: 'Formulate a high-yield USMLE/Board clinical memory anchor',
    tooltipAr: 'صياغة وسيلة تذكر سريرية معتمدة لاختبارات البورد لتثبيت الفيزيولوجيا المرضية',
    visibleWhen: 'always',
    generatePrompt: (_ctx, lang = 'en') => {
      if (lang === 'ar') {
        return `صِغ وسيلة تذكر سريرية أو مرساة حفظ فعالة (Clinical Mnemonic) لتثبيت الفيزيولوجيا المرضية الأساسية لهذا المفهوم.`;
      }
      return `Formulate a memorable clinical memory anchor or board mnemonic for this concept to lock in the key pathophysiology.`;
    },
  },
  {
    key: 'peer_trap',
    label: 'Peer Traps',
    shortLabel: 'Peer Traps',
    labelAr: 'أفخاخ الزملاء',
    shortLabelAr: 'أفخاخ الزملاء',
    iconType: 'users',
    tooltip: 'Show peer cohort pass rate and the #1 distractor trap on this question',
    tooltipAr: 'عرض معدل إجابة الزملاء والخيار المضلل رقم 1 الذي يقع فيه الطلاب',
    visibleWhen: 'revealed',
    generatePrompt: (_ctx, lang = 'en') => {
      if (lang === 'ar') {
        return `اعرض صعوبة هذا السؤال وإحصائيات أفخاخ الطلاب الزملاء. ما هو الخيار المضلل رقم 1 الذي يختاره الطلاب بالخطأ ولماذا؟`;
      }
      return `Show peer student cohort difficulty and trap statistics for this question. What is the #1 distractor choice that students mistakenly select and why?`;
    },
  },
  {
    key: 'sealed_torn_choice',
    label: 'Torn Choices',
    shortLabel: 'Torn Choices',
    labelAr: 'حيرة الخيارات',
    shortLabelAr: 'حيرة الخيارات',
    iconType: 'help',
    tooltip: 'Socratic comparison between options without revealing the answer',
    tooltipAr: 'مقارنة سقراطية بين الخيارات المحيرة دون حرق الإجابة الصحيحة',
    visibleWhen: 'sealed',
    generatePrompt: (_ctx, lang = 'en') => {
      if (lang === 'ar') {
        return `أنا متردد بين الخيارات. دون الكشف عن الإجابة الصحيحة، ما هو المبدأ الفيزيولوجي الأساسي الذي يفرق بين الاحتمالات البارزة في هذه الحالة؟`;
      }
      return `I am torn between the choices. Without revealing which option is correct, what fundamental physiological principle distinguishes the top possibilities in this vignette?`;
    },
  },
  {
    key: 'sealed_pivot_clues',
    label: 'Pivot Clues (Pre-Commit)',
    shortLabel: 'Pivot Clues',
    labelAr: 'مفاتيح الحل',
    shortLabelAr: 'مفاتيح الحل',
    iconType: 'search',
    tooltip: 'Highlight the decisive physical exam and vital sign pivot clues without spoiling the answer',
    tooltipAr: 'تسليط الضوء على مفاتيح الفحص السريري دون إفساد الإجابة الصحيحة',
    visibleWhen: 'sealed',
    generatePrompt: (_ctx, lang = 'en') => {
      if (lang === 'ar') {
        return `دون إفساد الإجابة الصحيحة، أرشدني إلى المفاتيح السريرية الحاسمة (العلامات الحيوية، صفات النفخة، التطور الزمني) التي ينبغي أن أركز عليها في هذه الحالة.`;
      }
      return `Without spoiling the answer, guide me to the key clinical pivot clues (vital signs, murmur characteristics, chronicity) in this vignette that I should focus on.`;
    },
  },
];
