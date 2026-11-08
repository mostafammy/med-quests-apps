import { QuestionSchema, type ChoiceId, type QuestionChoice } from '../../model/types.ts';
import type {
  RawQuestionParseRequest,
  ParsedQuestionItem,
  ParseResultSummary,
} from './types.ts';
import { curriculumClassificationAgent } from '../../taxonomy/CurriculumClassificationAgent.ts';
import {
  createCloudProvider,
  getAvailableFallbackProvider,
} from '../../../infrastructure/ai/engineRegistry.ts';
import type { LlmMessage, OpenAiCompatibleProvider } from '../../../infrastructure/ai/providers/openAiCompatibleProvider.ts';
import type { GeminiProvider } from '../../../infrastructure/ai/providers/geminiProvider.ts';
import type { AiCopilotSettings } from '../../ai/settings.ts';
import { LEGACY_DEFAULT_BLOCK_ID } from '../../curriculum/ids.ts';
import { QuestionNormalizer } from '../QuestionNormalizer.ts';
import { TextSegmentationAndChoiceExtractor } from './TextSegmentationAndChoiceExtractor.ts';

export type CloudStreamingProvider = Pick<OpenAiCompatibleProvider | GeminiProvider, 'streamTurn'>;

/**
 * Live Cloud LLM Question Extraction & Medical Clinical Reasoning Strategy.
 */
export class CloudLlmParsingStrategy {
  public static buildSystemPrompt(
    request: RawQuestionParseRequest,
    isVignetteMode: boolean
  ): string {
    const rawTargetBlock = (request.targetBlockId || LEGACY_DEFAULT_BLOCK_ID).toLowerCase();
    const isCns =
      rawTargetBlock === 'cns' ||
      /cns|neuro|brain|supratentorial|cortex|capsule/i.test(request.rawText.slice(0, 300));

    const specialty = isCns
      ? 'Medical Examination Specialist and USMLE/Central Nervous System Board Faculty Member'
      : 'Medical Examination Specialist and USMLE/Cardiovascular Board Faculty Member';
    const blockCode = isCns ? 'cns' : 'cvs';
    const syllabusTitle = isCns
      ? 'Central Nervous System Curriculum Core Syllabus'
      : 'Cardiovascular Curriculum Core Syllabus';
    const subjectsAllowed = isCns
      ? "'anatomy' | 'physiology' | 'histology' | 'pathology-micro' | 'pharmacology'"
      : "'anatomy' | 'physiology' | 'pharmacology' | 'microbiology'";

    const cnsChapterGuidance = isCns
      ? `
8. CURRICULUM GROUNDING (CNS - BLOCK 207):
   - Neuroanatomy Chapters:
     * "cns-ana-white-matter-internal-capsule" (Cerebral White Matter, Projection Fibers & Internal Capsule Limbs/Stroke)
     * "cns-ana-cerebral-cortex-vascular" (Cerebral Hemispheres, Cortical Areas & Circle of Willis)
     * "cns-ana-cerebellum-basal-ganglia" (Cerebellum, Basal Ganglia & Diencephalon)
     * "cns-ana-brainstem-cranial-nerves" (Brainstem Levels & Cranial Nerve Nuclei)
     * "cns-ana-spinal-cord-tracts" (Spinal Cord Structure & Ascending/Descending Tracts)
     * "cns-ana-embryology-meninges-csf" (Neural Tube, Meninges & CSF Dynamics - ONLY for neurulation defects, meningeal folds, hydrocephalus)
   - Assign the exact chapterId above that matches the question's anatomical scope. NEVER default Internal Capsule questions to Neural Tube!`
      : '';

    return `You are an elite ${specialty}.
Your mission is to parse unformatted raw medical questions, clinical lecture notes, or rough drafts into strictly formatted, board-standard Single-Best-Answer (SBA) MCQs.

CRITICAL CLINICAL & PEDAGOGICAL REQUIREMENTS:
1. Detect whether the input contains an explicit answer key (e.g., "Answer: B", "Ans: C", "*A", "Key: D").
2. IF AN ANSWER KEY WAS PROVIDED:
   - Validate whether that answer key is clinically correct.
   - Set "wasAnswerKeyProvidedInInput": true and "aiGeneratedAnswerKey": false.
   - Set "selectedCorrectChoiceId" to that letter ('a', 'b', 'c', or 'd').
3. IF NO ANSWER KEY WAS PROVIDED (OMITTED / MISSING):
   - YOU MUST CLINICALLY SOLVE THE QUESTION YOURSELF.
   - Accurately determine the single best answer based on pathophysiology, pharmacology, anatomy, or diagnostic criteria.
   - Set "wasAnswerKeyProvidedInInput": false and "aiGeneratedAnswerKey": true.
   - Set "selectedCorrectChoiceId" to the solved answer ('a', 'b', 'c', or 'd').
   - Add this warning: "⚠️ Answer Key was missing in raw text: AI solved the clinical scenario to determine the single best answer."
4. CHOICES STRUCTURE:
   - Exactly 4 choices with ids 'a', 'b', 'c', 'd'.
   - The correct choice MUST have isCorrect: true and an authoritative clinical rationale.
   - The other 3 choices MUST have isCorrect: false and distinct distractor rationales explaining why they are plausible but wrong.
   - If raw input contains 5 choices (A through E), preserve the correct choice and select the 3 most plausible distractors to form exactly 4 standard options. NEVER merge Option E into Option D's text!
5. EXPLANATION:
   - Deep pathophysiological mechanism, cardinal presentation, diagnostic pearl, and guideline recommendation.
6. METADATA:
   - difficulty: 1 (fundamental), 2 (standard board level), or 3 (complex multisystem).
   - cognitiveLevel: ${isVignetteMode ? "'application'" : "'recall' | 'understanding' | 'application'"}.
   - subjectId: ${request.targetSubjectId ? `'${request.targetSubjectId}'` : subjectsAllowed}
   - highYield: true.
7. STEM INTEGRITY & FORMATTING (CURRENT MODE: ${isVignetteMode ? 'USMLE VIGNETTE ENRICHMENT' : 'VERBATIM / STRICT AUTHOR FIDELITY'}):
${
  isVignetteMode
    ? `   - Convert dry factual recall questions into realistic clinical vignettes (e.g., patient age, symptoms, physical findings) leading into the question stem.
   - Set "stem" to this clinical vignette.
   - Set "originalRawStem" to the author's original raw question wording.
   - Set "enrichedVignetteStem" to the clinical vignette.`
    : `   - CRITICAL: PRESERVE THE AUTHOR'S ORIGINAL QUESTION STEM WORDING AND PHRASING DIRECTLY.
   - DO NOT fabricate a fictional patient case, age, or symptoms (DO NOT prepend "A 7-year-old child presents with...").
   - Strip leading question numbers (e.g. "1-", "Q1.") and clean formatting, but retain the exact question phrasing as written by the author.
   - Set "stem" to this verbatim stem.
   - Set "originalRawStem" to this verbatim stem.
   - You may ALSO provide an optional USMLE clinical vignette version in "enrichedVignetteStem" for the administrator to review.`
}${cnsChapterGuidance}

RETURN STRICTLY A JSON OBJECT matching this format (no markdown code blocks, no backticks, no conversational text):
{
  "items": [
    {
      "tempId": "item-1",
      "rawInputExcerpt": "<first 200 chars of source>",
      "originalRawStem": "<Author's original question text>",
      "enrichedVignetteStem": "<USMLE patient presentation clinical vignette>",
      "wasAnswerKeyProvidedInInput": <boolean>,
      "aiGeneratedAnswerKey": <boolean>,
      "selectedCorrectChoiceId": "a" | "b" | "c" | "d",
      "confidenceScore": <number 80-100>,
      "warnings": ["<any notices>"],
      "question": {
        "id": "q-parsed-<timestamp>-1",
        "blockId": "${blockCode}",
        "subjectId": "<subject>",
        "chapterId": "<chapter-id>",
        "topicId": "<topic-id>",
        "concept": "<Concise Concept Title>",
        "type": "single-best-answer",
        "stem": "${isVignetteMode ? '<Enriched clinical vignette and question>' : '<Author verbatim question>'}",
        "choices": [
          { "id": "a", "text": "<choice A text>", "isCorrect": <boolean>, "rationale": "<specific rationale>" },
          { "id": "b", "text": "<choice B text>", "isCorrect": <boolean>, "rationale": "<specific rationale>" },
          { "id": "c", "text": "<choice C text>", "isCorrect": <boolean>, "rationale": "<specific rationale>" },
          { "id": "d", "text": "<choice D text>", "isCorrect": <boolean>, "rationale": "<specific rationale>" }
        ],
        "explanation": "<Deep clinical explanation>",
        "examTip": "<High-yield board pearl>",
        "mnemonic": null,
        "difficulty": 2,
        "cognitiveLevel": "application",
        "highYield": true,
        "origin": "authored-grounded",
        "evidence": [
          {
            "chunkId": "chunk-evidence-1",
            "sourceName": "${syllabusTitle}",
            "location": "Clinical Reference Guidelines",
            "quote": "Key pathophysiological principles grounding this clinical item.",
            "kind": "text"
          }
        ],
        "status": "active",
        "bankVersion": 1
      }
    }
  ]
}`;
  }

  public static async parseViaCloudLlm(
    request: RawQuestionParseRequest,
    providerOverride?: CloudStreamingProvider,
    signal?: AbortSignal
  ): Promise<ParseResultSummary | null> {
    let userSettings: AiCopilotSettings | undefined = undefined;
    try {
      const { useAiSettingsStore } = await import(
        '../../../application/stores/useAiSettingsStore.ts'
      );
      const storeState = useAiSettingsStore.getState();
      if (storeState && !storeState.isLoaded && typeof storeState.loadSettings === 'function') {
        await storeState.loadSettings();
      }
      userSettings = useAiSettingsStore.getState()?.settings;
    } catch {
      // Ignore store import errors in isolated unit tests
    }

    const provider =
      providerOverride ||
      createCloudProvider(request.providerId, request.modelId, userSettings) ||
      (userSettings ? getAvailableFallbackProvider(userSettings, request.providerId) : null);

    const isTestEnv = Boolean(
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
        import.meta.env?.VITEST ||
        import.meta.env?.MODE === 'test'
    );

    if (!provider && isTestEnv) return null;

    const isVignetteMode = request.stemMode === 'vignette';
    const systemPrompt = this.buildSystemPrompt(request, isVignetteMode);

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Target Subject: ${request.targetSubjectId || 'Any CVS Subject'}\nTarget Chapter: ${request.targetChapterId || 'Any'}\n\n[RAW QUESTION TEXT TO PARSE]:\n${request.rawText}`,
      },
    ];

    let fullText = '';
    const turnSignal = signal ?? new AbortController().signal;

    if (provider) {
      try {
        for await (const chunk of provider.streamTurn(messages, [], turnSignal)) {
          if (chunk.type === 'text') {
            fullText += chunk.delta;
          }
        }
      } catch (providerErr) {
        if (isTestEnv) throw providerErr;
        console.warn(
          '[QuestionParsingAgent] Direct cloud provider error, attempting Edge AI gateway:',
          providerErr
        );
      }
    }

    // Fallback to Cloudflare Workers AI Edge Gateway (/api/ai/chat) when no client API key is configured
    if (!fullText.trim() && !isTestEnv && typeof fetch === 'function') {
      try {
        const edgeAiRes = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            temperature: 0.2,
            max_tokens: 4096,
          }),
          signal: turnSignal,
        });
        if (edgeAiRes.ok) {
          const edgeAiData = await edgeAiRes.json();
          if (typeof edgeAiData?.text === 'string') {
            fullText = edgeAiData.text;
          }
        }
      } catch {
        // Offline or local dev without edge AI binding
      }
    }

    if (!fullText.trim()) return null;

    const strippedText = fullText
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```(?:json)?/gi, '')
      .trim();

    const firstBrace = strippedText.indexOf('{');
    const lastBrace = strippedText.lastIndexOf('}');
    const cleanJson =
      firstBrace !== -1 && lastBrace > firstBrace
        ? strippedText.slice(firstBrace, lastBrace + 1)
        : strippedText;

    try {
      const parsed = JSON.parse(cleanJson);
      const rawItems = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return null;
      }

      const rawBlocks = TextSegmentationAndChoiceExtractor.segmentRawTextIntoBlocks(
        request.rawText.trim()
      );
      const validatedItems: ParsedQuestionItem[] = [];

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        if (!item || !item.question) continue;

        const q = item.question;
        q.id = `q-parsed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${i + 1}`;
        q.blockId = request.targetBlockId || LEGACY_DEFAULT_BLOCK_ID;
        if (!q.type) q.type = 'single-best-answer';
        if (!q.status) q.status = 'active';
        if (!q.bankVersion) q.bankVersion = 1;
        if (!q.evidence || !Array.isArray(q.evidence) || q.evidence.length === 0) {
          q.evidence = [
            QuestionNormalizer.synthesizeDefaultEvidence(
              q.subjectId || 'physiology',
              q.concept || 'Cardiovascular Assessment'
            ),
          ];
        }

        if (!Array.isArray(q.choices) || q.choices.length !== 4) {
          q.choices = TextSegmentationAndChoiceExtractor.standardizeChoices(
            q.choices || [],
            item.selectedCorrectChoiceId || 'a'
          );
        }

        // In verbatim mode, preserve exact author stem & choice phrasing when cleanly segmented from raw text
        if (!isVignetteMode && rawBlocks[i] && rawItems.length === rawBlocks.length) {
          const blockLines = rawBlocks[i]
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          if (blockLines.length > 0) {
            blockLines[0] = blockLines[0]
              .replace(/^(?:(?:Question|Item|Q)\s*\d*\s*[:.)-]?|\(\d+\)|\d+\s*[.):-])\s*/i, '')
              .trim();
            const extracted = TextSegmentationAndChoiceExtractor.extractStemAndChoices(blockLines);
            const verbatimStem = extracted.stemLines
              .join(' ')
              .replace(/^(?:(?:Question|Item|Q)\s*\d*\s*[:.)-]?|\(\d+\)|\d+\s*[.):-])\s*/i, '')
              .trim();
            if (verbatimStem.length >= 15) {
              q.stem = verbatimStem;
            }
            if (
              extracted.rawChoices.length >= 4 &&
              Array.isArray(q.choices) &&
              q.choices.length === 4
            ) {
              q.choices = q.choices.map((c: QuestionChoice, cIdx: number) => {
                const matchRaw =
                  extracted.rawChoices.find((rc) => rc.id === c.id) || extracted.rawChoices[cIdx];
                let text = matchRaw?.text ? matchRaw.text.trim() : c.text;
                text = text
                  .replace(/\s+(?:[([{\s]*[e-f][)\]}:.]|[e-f]\s*[-–—]+)\s+.*$/i, '')
                  .trim();
                return text ? { ...c, text } : c;
              });
            }
          }
        }

        const initialCheck = QuestionSchema.safeParse(q);
        if (!initialCheck.success) {
          const firstIssue = initialCheck.error.issues[0];
          item.warnings = [
            ...(Array.isArray(item.warnings) ? item.warnings : []),
            `Schema auto-repaired (${firstIssue?.path?.join('.') || 'root'}: ${firstIssue?.message || 'invalid'})`,
          ];
        }
        const finalQuestion = QuestionNormalizer.repairToQuestionSchema(q);

        const correctChoice =
          finalQuestion.choices.find((c) => c.isCorrect) || finalQuestion.choices[0];
        const selectedCorrectChoiceId = (correctChoice?.id as ChoiceId) || 'a';

        const choicesStr = (finalQuestion.choices || []).map((c) => c.text).join(' ');
        const isCns =
          (request.targetBlockId || '').toLowerCase() === 'cns' ||
          finalQuestion.blockId === 'cns' ||
          /cns|neuro|brain|supratentorial|capsule|cortex/i.test(finalQuestion.stem);

        if (isCns) {
          finalQuestion.blockId = 'cns';
        }

        const classification =
          item.taxonomyClassification ||
          curriculumClassificationAgent.classify(
            finalQuestion.stem,
            choicesStr,
            finalQuestion.explanation,
            isCns
              ? { id: 'cns', name: 'Central Nervous System', code: 'Block 207', shortName: 'CNS' }
              : undefined
          );

        if (
          !request.targetSubjectId ||
          request.targetSubjectId === 'all' ||
          request.targetSubjectId === 'auto'
        ) {
          finalQuestion.subjectId = classification.subjectId;
          finalQuestion.chapterId = classification.chapterId;
          finalQuestion.topicId = `${classification.chapterId}/core-concepts`;
        }

        const rawStem =
          typeof item.originalRawStem === 'string' && item.originalRawStem.trim()
            ? item.originalRawStem.trim()
            : request.stemMode !== 'vignette'
            ? finalQuestion.stem
            : undefined;

        const vignetteStem =
          typeof item.enrichedVignetteStem === 'string' && item.enrichedVignetteStem.trim()
            ? item.enrichedVignetteStem.trim()
            : request.stemMode === 'vignette'
            ? finalQuestion.stem
            : undefined;

        validatedItems.push({
          tempId: `item-${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
          rawInputExcerpt:
            typeof item.rawInputExcerpt === 'string'
              ? item.rawInputExcerpt
              : request.rawText.slice(0, 200),
          originalRawStem: rawStem,
          enrichedVignetteStem: vignetteStem,
          question: finalQuestion,
          wasAnswerKeyProvidedInInput: Boolean(item.wasAnswerKeyProvidedInInput),
          aiGeneratedAnswerKey: Boolean(item.aiGeneratedAnswerKey),
          selectedCorrectChoiceId,
          confidenceScore: typeof item.confidenceScore === 'number' ? item.confidenceScore : 94,
          warnings: Array.isArray(item.warnings) ? item.warnings.map(String) : [],
          isApproved: false,
          taxonomyClassification: classification,
        });
      }

      if (validatedItems.length === 0) return null;

      const totalMissing = validatedItems.filter((it) => it.aiGeneratedAnswerKey).length;

      return {
        items: validatedItems,
        totalParsed: validatedItems.length,
        totalMissingAnswerKeys: totalMissing,
        durationMs: 0,
        modelUsed: request.modelId,
      };
    } catch (parseError) {
      console.warn('[QuestionParsingAgent] JSON parse of LLM response failed:', parseError);
      return null;
    }
  }
}
