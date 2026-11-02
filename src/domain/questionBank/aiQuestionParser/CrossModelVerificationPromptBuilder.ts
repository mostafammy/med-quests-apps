/**
 * Domain Service: CrossModelVerificationPromptBuilder
 * Generates board-certified verification prompts that administrators can copy to
 * independently cross-examine parsed questions with external AI models (ChatGPT, Claude, DeepSeek, Gemini).
 *
 * Implements Builder & Strategy Patterns.
 */

import type { ParsedQuestionItem } from './types.ts';

export class CrossModelVerificationPromptBuilder {
  /**
   * Builds an in-depth cross-examination prompt for a single question.
   */
  public static buildSingleQuestionPrompt(
    item: ParsedQuestionItem,
    customInstructions?: string
  ): string {
    const q = item.question;
    const correctChoice = q.choices.find((c) => c.isCorrect);
    const classification = item.taxonomyClassification;

    const blockName = classification?.blockName || 'Cardiovascular System (CVS) - Block 206';
    const subjectName = classification?.subjectName || q.subjectId.toUpperCase();
    const chapterName = classification?.chapterName || q.chapterId;
    const confidence = classification?.confidenceScore !== undefined ? `${classification.confidenceScore}%` : 'High';
    const rationale = classification?.rationale || 'Direct curriculum taxonomy mapping';

    const lines: string[] = [
      `# Medical Board Examination Item Cross-Validation Request`,
      `**Role**: Double Board-Certified Cardiologist, Medical Education Specialist, and USMLE/NBME Senior Item Reviewer.`,
      `**Objective**: Rigorously and independently audit the following clinical question for medical factual accuracy, single-best-answer validity, distractor plausibility, and curriculum grounding. Do NOT assume the provided answer key is correct.`,
      ``,
      `---`,
      `### Target Curriculum Taxonomy & Scope Grounding`,
      `- **Target Block**: ${blockName}`,
      `- **Target Subject**: ${subjectName}`,
      `- **Target Chapter**: ${chapterName}`,
      `- **Classifier Match Confidence**: ${confidence}`,
      `- **Curriculum Alignment Rationale**: ${rationale}`,
      `- **Cognitive Level**: ${q.cognitiveLevel || 'understanding'} | **Target Difficulty**: ${q.difficulty}/3`,
      ``,
      `---`,
      `### Clinical Vignette & Question Stem`,
      q.stem,
      ``,
      `### Answer Options`,
      ...q.choices.map((c) => `(${c.id.toUpperCase()}) ${c.text}`),
      ``,
      `---`,
      `### Key Provided in Draft System:`,
      `- **Draft Keyed Option**: Option (${(correctChoice?.id || 'A').toUpperCase()}) - "${correctChoice?.text || ''}"`,
      item.aiGeneratedAnswerKey
        ? `⚠️ *Note: The author did NOT provide an answer key; our platform AI inferred this option.*`
        : `*Author explicitly indicated this option.*`,
      `- **Draft Clinical Explanation**: ${q.explanation}`,
      ``,
      `### Current Choice Rationales:`,
      ...q.choices.map((c) => `- Choice (${c.id.toUpperCase()}): ${c.rationale || 'N/A'}`),
      ``,
      `---`,
      `### Required Independent Audit Instructions:`,
      `1. **Independent Clinical Solution**: Without being influenced by the draft key, which choice (A, B, C, or D) is indisputably the single best answer? Detail the precise pathophysiological or anatomical mechanism.`,
      `2. **Distractor Analysis**: Evaluate each of the 3 incorrect choices. Are they physiologically plausible clinical pitfalls? Are any of them accidentally correct or ambiguous?`,
      `3. **Curriculum & Scope Alignment**: Does this question accurately evaluate the syllabus objectives of **${subjectName} ❯ ${chapterName}** within the **${blockName}**? Does it assess concepts appropriate for this block, or does it stray into unmapped material?`,
      `4. **Hallucination & Factual Check**: Are all anatomical structures, drug mechanisms, hemodynamic parameters, and diagnostic criteria factually accurate according to current clinical guidelines?`,
      `5. **Psychometric Quality**: Is the stem free of negative phrasing ("EXCEPT / NOT")? Are all choices balanced in length and complexity?`,
      `6. **Final Verdict**: State clearly: [CONFIRMED CORRECT / KEY WRONG / AMBIGUOUS / FLAWED] and [PERFECT CURRICULUM FIT / MISCLASSIFIED] with specific recommended errata if needed.`,
    ];

    if (customInstructions?.trim()) {
      lines.push(``, `### Specific Administrator Guidance:`, customInstructions.trim());
    }

    return lines.join('\n');
  }

  /**
   * Builds a batch cross-examination prompt for multiple selected questions.
   */
  public static buildBatchQuestionsPrompt(
    items: readonly ParsedQuestionItem[],
    batchTitle = 'MedQuests Global Question Bank Batch Verification'
  ): string {
    const lines: string[] = [
      `# ${batchTitle} (${items.length} Items)`,
      `**Role**: Senior Medical Education & Clinical Curriculum Audit Committee (Cardiovascular Specialty).`,
      `**Instructions**: Audit each of the following ${items.length} multiple-choice items independently. For every item, verify clinical accuracy, key correctness, and curriculum grounding within the specified Block, Subject, and Chapter:`,
      `1. Your independently determined single best answer (A, B, C, or D).`,
      `2. Confirmation whether the draft key is accurate or flawed.`,
      `3. Curriculum Scope Assessment: Whether the item fits the indicated Block, Subject, and Chapter.`,
      `4. Any subtle medical inaccuracies, distractor flaws, or length cue vulnerabilities.`,
      ``,
      `---`,
    ];

    items.forEach((item, idx) => {
      const q = item.question;
      const correctChoice = q.choices.find((c) => c.isCorrect);
      const classification = item.taxonomyClassification;
      const blockName = classification?.blockName || 'Cardiovascular System (CVS)';
      const subjectName = classification?.subjectName || q.subjectId;
      const chapterName = classification?.chapterName || q.chapterId;

      lines.push(
        `## Question ${idx + 1} of ${items.length} [Concept: ${q.concept || q.id}]`,
        `**Curriculum Scope**: Block: ${blockName} | Subject: ${subjectName} | Chapter: ${chapterName}`,
        `**Difficulty**: ${q.difficulty}/3 | **Cognitive**: ${q.cognitiveLevel}`,
        `**Stem**: ${q.stem}`,
        `**Choices**:`,
        ...q.choices.map((c) => `  (${c.id.toUpperCase()}) ${c.text}`),
        `**Draft Key**: Option (${(correctChoice?.id || 'A').toUpperCase()}) ${
          item.aiGeneratedAnswerKey ? '[AI Inferred Answer Key - Needs Verification]' : '[Author Provided]'
        }`,
        `**Draft Explanation**: ${q.explanation}`,
        ``,
        `---`
      );
    });

    lines.push(
      `### Expected Output Format Per Item:`,
      `For Item 1 through ${items.length}:`,
      `**Item [N]**:`,
      `- Independent Key: (Choice Letter)`,
      `- Verdict on Draft Key: [CORRECT / INCORRECT / AMBIGUOUS]`,
      `- Curriculum Scope Verdict: [PERFECT FIT / WRONG CHAPTER / WRONG SUBJECT / OUT-OF-SCOPE]`,
      `- Pathophysiological Justification: (2-3 sentences)`,
      `- Errata / Recommendations: (None or specific correction)`
    );

    return lines.join('\n');
  }
}
