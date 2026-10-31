/**
 * Domain Service: AI Question Prompt & Schema Generator
 * Layer: Domain (Pure Domain Service)
 *
 * Provides board-standard, psychometrically grounded prompt templates for
 * converting raw questions, lecture materials, or curriculum topics into
 * strictly validated MedQuests Question JSON objects.
 */

import { CVS_TAXONOMY } from '../taxonomy/cvsTaxonomy.ts';

export type AiPromptMode = 'format_existing' | 'generate_new' | 'schema_only';

export interface AiPromptOptions {
  mode: AiPromptMode;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: 1 | 2 | 3;
  questionCount?: number;
  customFocus?: string;
}

/**
 * Standard gold-standard reference question JSON string for few-shot in-context learning.
 */
export const GOLD_STANDARD_EXAMPLE_QUESTION = {
  id: 'q-cvs-ana-0042',
  blockId: 'cvs',
  subjectId: 'anatomy',
  chapterId: 'cvs-ana-heart-dev',
  topicId: 'cvs-ana-congenital-heart-anomalies',
  concept: 'Ostium Secundum Atrial Septal Defect Pathogenesis',
  type: 'single-best-answer',
  stem: 'A 4-year-old boy is brought to the pediatric cardiology clinic for a routine preschool evaluation. His mother reports he tires easily during active play. Physical examination reveals a wide, fixed splitting of the second heart sound (S2) and a grade 2/6 midsystolic ejection murmur at the left upper sternal border. Transthoracic echocardiography reveals an abnormal interatrial communication in the central portion of the interatrial septum. Which of the following embryological mechanisms is the most likely cause of this patient\'s cardiac defect?',
  choices: [
    {
      id: 'a',
      text: 'Failure of superior and inferior endocardial cushions to fuse',
      isCorrect: false,
      rationale: 'Incorrect. Failure of endocardial cushion fusion causes an ostium primum ASD (often part of an atrioventricular canal defect), typically located low in the interatrial septum and associated with Trisomy 21.'
    },
    {
      id: 'b',
      text: 'Abnormal spiraling and septation of the bulbus cordis and truncus arteriosus',
      isCorrect: false,
      rationale: 'Incorrect. Defective neural crest cell migration leading to absent spiraling of the aorticopulmonary septum produces Transposition of the Great Arteries (TGA).'
    },
    {
      id: 'c',
      text: 'Excessive resorption of the septum primum or inadequate development of the septum secundum',
      isCorrect: true,
      rationale: 'Correct. An ostium secundum atrial septal defect (ASD) occurs in the region of the fossa ovalis and accounts for >75% of all ASDs. It results from either excessive fenestration/resorption of the septum primum, deficient development of the septum secundum, or both.'
    },
    {
      id: 'd',
      text: 'Premature physiological closure of the foramen ovale in utero',
      isCorrect: false,
      rationale: 'Incorrect. Premature in utero closure of the foramen ovale leads to severe right atrial/right ventricular hypertrophy and hypoplastic left heart, not a post-natal central interatrial defect.'
    }
  ],
  explanation: 'Ostium secundum ASD is the most prevalent congenital interatrial shunt. It is characterized by fixed splitting of S2 due to delayed pulmonary valve closure secondary to persistent right ventricular volume overload. The murmur heard is not due to flow across the defect itself (as the interatrial pressure gradient is low), but rather due to increased blood flow across the pulmonic valve during systole.',
  examTip: 'Fixed splitting of S2 that does not vary with respiration is the hallmark auscultatory finding of Atrial Septal Defect (ASD).',
  mnemonic: 'Secundum = Second / Central (Fossa ovalis); Primum = Primary / Low down (Endocardial cushions).',
  difficulty: 2,
  cognitiveLevel: 'understanding',
  highYield: true,
  origin: 'authored-grounded',
  evidence: [
    {
      chunkId: 'chunk-cvs-ana-02-p14',
      sourceName: "Langman's Medical Embryology, 14th Edition",
      location: 'Chapter 13 (Cardiovascular System), p. 192',
      quote: 'Ostium secundum defect is caused by excessive cell death and resorption of the septum primum or by inadequate development of the septum secundum.',
      kind: 'text'
    }
  ],
  status: 'active',
  bankVersion: 1
};

export class QuestionAiPromptBuilder {
  /**
   * Generates a complete prompt ready to paste into ChatGPT, Claude, Gemini, or DeepSeek.
   */
  public static buildPrompt(options: AiPromptOptions): string {
    const {
      mode,
      subjectId = 'all',
      chapterId = 'all',
      difficulty = 2,
      questionCount = 1,
      customFocus = '',
    } = options;

    const subjectObj = CVS_TAXONOMY.subjects.find((s) => s.id === subjectId);
    const subjectName = subjectObj ? `${subjectObj.name} (${subjectObj.id})` : 'Integrated Cardiovascular (CVS)';

    const chapterObj = CVS_TAXONOMY.chapters.find((c) => c.id === chapterId);
    const chapterName = chapterObj ? `${chapterObj.name} (${chapterObj.id})` : 'All Curriculum Chapters';

    const exampleJsonString = JSON.stringify([GOLD_STANDARD_EXAMPLE_QUESTION], null, 2);

    if (mode === 'schema_only') {
      return this.buildSchemaOnlyPrompt();
    }

    if (mode === 'format_existing') {
      return `You are an expert Medical Assessment Psychometrician and JSON formatting engine for the MedQuests Cardiovascular (CVS) Medical Question Bank.

Your objective is to reformat, refine, and structure raw medical multiple-choice questions or lecture notes into the strictly typed, high-yield JSON format required by our medical education platform.

----------------------------------------------------------------------
TARGET CURRICULUM CONTEXT:
- Block: Cardiovascular System (cvs)
- Subject: ${subjectName}
- Chapter: ${chapterName}
- Target Difficulty: Level ${difficulty} (${difficulty === 1 ? 'Foundational Knowledge / Recall' : difficulty === 2 ? 'Clinical Vignette / Application' : 'Complex Multi-step Reasoning'})
${customFocus ? `- Specific Directive: ${customFocus}` : ''}
----------------------------------------------------------------------

PSYCHOMETRIC & CLINICAL QUALITY STANDARDS:
1. CLINICAL STEM: Frame questions as authentic patient vignettes (age, sex, clinical setting, chief complaint, vital signs, physical exam findings, and lab/imaging investigations) leading to a clear clinical question.
2. EXACTLY 4 CHOICES: Every question MUST have exactly four choices labeled 'a', 'b', 'c', and 'd'.
3. SINGLE BEST ANSWER: Exactly ONE choice must have "isCorrect": true, and the other three must have "isCorrect": false.
4. PSYCHOMETRIC CHOICE ENTROPY (CRITICAL): Distribute the correct answer uniformly across options ('a', 'b', 'c', 'd') so that each option is correct approximately 25% of the time across the batch. Do NOT default to making 'a' or 'b' correct for all questions.
5. NO POSITIONAL REFERENCES: Never use phrases like 'All of the above', 'None of the above', 'Both A and B', or reference letters like 'as noted in Option A', as choices are dynamically shuffled.
6. DISTRACTOR RATIONALES: Every single choice (both the correct answer AND the 3 distractors) MUST include an in-depth "rationale" (at least 2-3 sentences) explaining the precise physiological, anatomical, or clinical reason why it is correct or incorrect.
7. EXPLANATION: Provide an authoritative, high-yield teaching pearl explaining the underlying mechanism and clinical pearls.
8. EVIDENCE CITATION: Include at least 1 authoritative citation in "evidence" citing standard medical literature (e.g., Moore's Clinically Oriented Anatomy, Robbins Basic Pathology, Langman's Medical Embryology, or First Aid for the USMLE Step 1) with a verbatim quote of at least 10 characters.
9. NO META TALK: Output ONLY a valid JSON array matching the schema below. Do not include introductory conversational text or concluding remarks.

----------------------------------------------------------------------
EXACT JSON SCHEMA DEFINITION (TypeScript Equivalent):
interface Question {
  id: string; // e.g. "q-cvs-ana-0101"
  blockId: "cvs";
  subjectId: string; // e.g. "anatomy" | "histology" | "microbiology" | "physiology"
  chapterId: string; // e.g. "cvs-ana-heart-dev"
  topicId: string; // e.g. "cvs-ana-congenital-heart-anomalies"
  concept: string; // concise concept name
  type: "single-best-answer";
  stem: string; // clinical vignette
  choices: [
    { id: "a"; text: string; isCorrect: boolean; rationale: string },
    { id: "b"; text: string; isCorrect: boolean; rationale: string },
    { id: "c"; text: string; isCorrect: boolean; rationale: string },
    { id: "d"; text: string; isCorrect: boolean; rationale: string }
  ];
  explanation: string;
  examTip?: string | null;
  mnemonic?: string | null;
  difficulty: 1 | 2 | 3;
  cognitiveLevel: "recall" | "understanding" | "application";
  highYield: boolean;
  origin: "authored-grounded";
  evidence: [
    {
      chunkId: string;
      sourceName: string;
      location: string;
      quote: string; // verbatim quote >= 10 chars
      kind: "text" | "figure";
    }
  ];
  status: "active";
  bankVersion: 1;
}

----------------------------------------------------------------------
GOLD-STANDARD 1-SHOT EXAMPLE:
\`\`\`json
${exampleJsonString}
\`\`\`

----------------------------------------------------------------------
USER INSTRUCTION:
Below are my raw questions / lecture notes. Reformat all of them into a single valid JSON array following the exact schema above:

[PASTE YOUR RAW QUESTIONS OR EXAM DRAFT HERE]`;
    }

    // Default: 'generate_new'
    return `You are a Board-Certified Medical Question Author and Psychometrician specializing in USMLE Step 1, Saudi Medical Licensure Examination (SMLE), and MBBS cardiovascular assessment.

Your task is to author ${questionCount} original, high-yield, board-caliber Single Best Answer (SBA) clinical vignette question(s) strictly formatted as a valid JSON array for MedQuests.

----------------------------------------------------------------------
CURRICULUM SPECIFICATION:
- System: Cardiovascular System (cvs)
- Subject: ${subjectName}
- Chapter: ${chapterName}
- Target Difficulty: Level ${difficulty} (${difficulty === 1 ? 'Foundational Recall' : difficulty === 2 ? 'Clinical Application / Diagnosis' : 'Complex Multi-step Pathophysiology'})
- Required Number of Questions: ${questionCount}
${customFocus ? `- Special Focus: ${customFocus}` : ''}
----------------------------------------------------------------------

AUTHORING INVARIANTS:
1. Patient Presentation: Each question stem MUST be a realistic vignette with age, gender, vital signs, relevant physical exam findings, and diagnostic clues.
2. Homogeneity of Options: All 4 options must belong to the same diagnostic or conceptual category (e.g., all 4 are embryological structures, or all 4 are microbial agents, or all 4 are vessel branches).
3. Distractor Quality: Distractors must be plausible clinical mimics. Avoid trivial or "joke" distractors.
4. Psychometric Option Balance: Ensure the correct answer is evenly distributed across options 'a', 'b', 'c', and 'd' across all generated questions (~25% each). Never bias toward 'a' or 'b'.
5. No Positional References: Do not use 'All of the above', 'None of the above', 'Both A and B', or reference option letters in text.
6. In-depth Rationales: For every option (A, B, C, D), provide a meticulous rationale explaining why it is correct or why it is incorrect.
7. Verifiable Evidence: Every question must include an "evidence" array with at least 1 textbook citation and verbatim quote (>= 10 chars).
8. Strict Output: Return ONLY the JSON array inside a standard JSON code block. No extraneous conversation.

----------------------------------------------------------------------
REFERENCE JSON FORMAT (1-SHOT EXAMPLE):
\`\`\`json
${exampleJsonString}
\`\`\`

Begin generation now:`;
  }

  /**
   * Generates a concise schema & rules reference guide.
   */
  public static buildSchemaOnlyPrompt(): string {
    return JSON.stringify(GOLD_STANDARD_EXAMPLE_QUESTION, null, 2);
  }
}
