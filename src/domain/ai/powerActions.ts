/**
 * Ready-to-Use AI Power Actions (One-Click Inquiries)
 * Defines high-yield clinical power actions (Why Right, Rule Out Wrong, Pivot Clues,
 * P-V Loop, Board Mnemonic, Peer Traps) with deterministic prompts and caching keys.
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
  readonly iconType: 'check' | 'x-circle' | 'search' | 'activity' | 'sparkles' | 'users' | 'help';
  readonly tooltip: string;
  readonly visibleWhen: 'sealed' | 'revealed' | 'always';
  readonly generatePrompt: (ctx: {
    questionStem: string;
    choices: readonly { id: string; text: string }[];
    correctChoiceId?: string;
    selectedChoiceId?: string | null;
  }) => string;
}

export const POWER_ACTIONS: readonly PowerActionDefinition[] = [
  {
    key: 'why_correct',
    label: 'Why Right',
    shortLabel: 'Why Right',
    iconType: 'check',
    tooltip: 'Explain why the correct answer is right using first-principles pathophysiology',
    visibleWhen: 'revealed',
    generatePrompt: ({ choices, correctChoiceId }) => {
      const correctChoice = choices.find((c) => c.id === correctChoiceId);
      const targetText = correctChoice ? `Option ${correctChoice.id.toUpperCase()} (${correctChoice.text})` : 'the correct choice';
      return `Explain in depth why ${targetText} is the correct answer. Break down the core pathophysiology and why it specifically matches the clinical presentation.`;
    },
  },
  {
    key: 'why_distractors_wrong',
    label: 'Rule Out Wrong',
    shortLabel: 'Rule Out Wrong',
    iconType: 'x-circle',
    tooltip: 'Deconstruct each incorrect option and explain exactly why each distractor is wrong',
    visibleWhen: 'revealed',
    generatePrompt: ({ choices, correctChoiceId }) => {
      const wrongChoices = choices.filter((c) => c.id !== correctChoiceId);
      const wrongList = wrongChoices.map((c) => `Option ${c.id.toUpperCase()}: ${c.text}`).join('; ');
      return `Deconstruct all incorrect choices (${wrongList}). For each distractor, explain: 1) Why it is ruled out in this patient, and 2) What specific finding would need to change in the vignette for it to be correct.`;
    },
  },
  {
    key: 'pivot_clues',
    label: 'Pivot Clues',
    shortLabel: 'Pivot Clues',
    iconType: 'search',
    tooltip: 'Highlight the decisive physical exam and vital sign pivot clues in the vignette',
    visibleWhen: 'always',
    generatePrompt: () => {
      return `What are the decisive clinical pivot clues in this vignette (vital signs, murmur characteristics, chronicity, physical exam maneuvers) that differentiate the diagnosis from its mimics?`;
    },
  },
  {
    key: 'pv_loop',
    label: 'P-V Loop',
    shortLabel: 'P-V Loop',
    iconType: 'activity',
    tooltip: 'Simulate ventricular Pressure-Volume curve mechanics for this lesion',
    visibleWhen: 'always',
    generatePrompt: () => {
      return `Simulate the Pressure-Volume (P-V) loop for this patient's lesion. Contrast the ventricular mechanics (EDV, ESV, Stroke Volume, Peak LV pressure) with normal physiology.`;
    },
  },
  {
    key: 'mnemonic',
    label: 'Board Mnemonic',
    shortLabel: 'Mnemonic',
    iconType: 'sparkles',
    tooltip: 'Formulate a high-yield USMLE/Board clinical memory anchor',
    visibleWhen: 'always',
    generatePrompt: () => {
      return `Formulate a memorable clinical memory anchor or board mnemonic for this concept to lock in the key pathophysiology.`;
    },
  },
  {
    key: 'peer_trap',
    label: 'Peer Traps',
    shortLabel: 'Peer Traps',
    iconType: 'users',
    tooltip: 'Show peer cohort pass rate and the #1 distractor trap on this question',
    visibleWhen: 'revealed',
    generatePrompt: () => {
      return `Show peer student cohort difficulty and trap statistics for this question. What is the #1 distractor choice that students mistakenly select and why?`;
    },
  },
  {
    key: 'sealed_torn_choice',
    label: 'Torn Choices',
    shortLabel: 'Torn Choices',
    iconType: 'help',
    tooltip: 'Socratic comparison between options without revealing the answer',
    visibleWhen: 'sealed',
    generatePrompt: () => {
      return `I am torn between the choices. Without revealing which option is correct, what fundamental physiological principle distinguishes the top possibilities in this vignette?`;
    },
  },
];
