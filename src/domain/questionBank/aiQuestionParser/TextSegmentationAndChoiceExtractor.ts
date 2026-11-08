import type { Question, ChoiceId } from '../../model/types.ts';
import { LEGACY_DEFAULT_BLOCK_ID } from '../../curriculum/ids.ts';
import { normalizeBlockId } from '../QuestionNormalizer.ts';

export interface ExtractedBlockStructure {
  readonly stemLines: string[];
  readonly rawChoices: Array<{ id: string; text: string }>;
  readonly detectedExplanation: string;
  readonly detectedConcept?: string;
  readonly draftScope?: {
    readonly block?: string;
    readonly subject?: string;
    readonly chapter?: string;
  };
}

/**
 * Pure text segmentation, inline choice splitting, stem/choice deconstruction,
 * explicit answer-key detection, and 4-option standardization.
 */
export class TextSegmentationAndChoiceExtractor {
  /**
   * Splits multi-question raw text using regex patterns for item delimiters.
   */
  public static segmentRawTextIntoBlocks(rawText: string): string[] {
    // 1. Explicit Markdown Question headers: "## Question 1 of 18", "### Item 1:", "## Question 1:" (optionally preceded by ---)
    const markdownQuestionSplit = rawText
      .split(/(?:\r?\n|^)(?=(?:(?:---|___|\*{3,})\s*(?:\r?\n)+)?\s*#{1,6}\s*(?:Question|Item|Q)\s*\d+)/i)
      .map((b) => b.trim())
      .filter((b) => /^(?:(?:---|___|\*{3,})\s*)?#{1,6}\s*(?:Question|Item|Q)\s*\d+/i.test(b));

    if (markdownQuestionSplit.length > 1) {
      return markdownQuestionSplit;
    }

    // 2. Standard Question/Item delimiter: "Question 1:", "Item 2 -", "Q3."
    const questionHeaderSplit = rawText
      .split(/(?:\r?\n|^)(?=(?:(?:---|___|\*{3,})\s*(?:\r?\n)+\s*)?(?:Question|Item|Q)\s*\d+(?:\s+of\s+\d+)?[:.)\s-])/i)
      .map((b) => b.trim())
      .filter((b) => /(?:Question|Item|Q)\s*\d+/i.test(b));

    if (questionHeaderSplit.length > 1) {
      return questionHeaderSplit;
    }

    const splitRegex = /(?:\r?\n|^)(?=(?:(?:Question|Item|Q)\s*\d+[:.]?|\d+\s*[.)]))/i;
    const initialSplit = rawText.split(splitRegex).map((b) => b.trim()).filter(Boolean);

    if (initialSplit.length > 1) {
      return initialSplit;
    }

    const doubleNewlineSplit = rawText
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 30);
    if (doubleNewlineSplit.length > 1) {
      return doubleNewlineSplit;
    }

    return [rawText];
  }

  /**
   * Scans text for explicit indications of correct answer.
   */
  public static detectExplicitAnswerKey(text: string): {
    found: boolean;
    choiceId: ChoiceId | 'e' | null;
  } {
    const keyMatch = text.match(
      /\b(?:Answer|Ans|Correct(?:\s*Answer)?|Key|Option)\b\s*[:=-]?\s*\(?([A-E])\)?(?!\w)/i
    );
    if (keyMatch) {
      return { found: true, choiceId: keyMatch[1].toLowerCase() as ChoiceId | 'e' };
    }

    const asteriskMatch = text.match(/(?:^|\s)\*\s*\(?([A-E])\)?(?!\w)/i);
    if (asteriskMatch) {
      return { found: true, choiceId: asteriskMatch[1].toLowerCase() as ChoiceId | 'e' };
    }

    return { found: false, choiceId: null };
  }

  /**
   * Splits an option string that may contain inline subsequent option letters
   * (e.g. "PCR detection of viral RNA in serum E. ST elevation on ECG"
   * or "A. opt1 B. opt2 C. opt3 D. opt4 E. opt5").
   */
  public static splitInlineChoices(
    initialLetter: string,
    initialText: string
  ): Array<{ id: string; text: string }> {
    const results: Array<{ id: string; text: string }> = [];
    const inlineMarkerRegex = /\s+(?:(?:\(([B-F1-5])\)|([B-F1-5])[)\]}:.]|[B-F1-5]\s*[-–—]+))\s+/gi;

    let lastIdx = 0;
    let currentId = initialLetter.toLowerCase();
    let m: RegExpExecArray | null;

    while ((m = inlineMarkerRegex.exec(initialText)) !== null) {
      const seg = initialText.slice(lastIdx, m.index).trim();
      if (seg) {
        results.push({ id: currentId, text: seg });
      }
      const rawNext = (m[1] || m[2] || '').toLowerCase();
      currentId = this.mapNumericOrLetterId(rawNext);
      lastIdx = inlineMarkerRegex.lastIndex;
    }

    const tail = initialText.slice(lastIdx).trim();
    if (tail || results.length === 0) {
      results.push({ id: currentId, text: tail });
    }

    return results;
  }

  private static mapNumericOrLetterId(raw: string): string {
    if (raw === '1') return 'a';
    if (raw === '2') return 'b';
    if (raw === '3') return 'c';
    if (raw === '4') return 'd';
    if (raw === '5') return 'e';
    return raw;
  }

  /**
   * Deconstructs lines into stem, choices, and trailing explanation.
   */
  public static extractStemAndChoices(lines: string[]): ExtractedBlockStructure {
    const stemLines: string[] = [];
    const rawChoices: Array<{ id: string; text: string }> = [];
    let detectedExplanation = '';
    let detectedConcept: string | undefined;
    let draftScope: { block?: string; subject?: string; chapter?: string } | undefined;

    const explanationRegex =
      /^\*{0,2}(?:Draft Explanation|Explanation|Rationale|Note|Why)\*{0,2}[:\s]+(.*)$/i;
    const answerKeyLineRegex =
      /^\*{0,2}(?:Answer|Ans|Correct(?:\s*Answer)?|Key|Option|Draft Key)\*{0,2}\s*[:=-]?\s*\(?[A-E]\)?/i;

    // Detect if the block uses explicit lettered choices (A., B., C., D., E., (A), A), A - etc.)
    const hasExplicitLetteredChoices = lines
      .slice(1)
      .some((l) => /^(?:[([{\s]*[A-E][)\]}:.]|[A-E]\s*[-–—]+)\s+\S/i.test(l));

    let inChoices = false;
    let inExplanation = false;

    const matchChoiceLine = (
      line: string,
      stemLinesCount: number,
      currentlyInChoices: boolean
    ) => {
      // NEVER classify the very first line (when stemLinesCount === 0) as a choice!
      // A question block always begins with its question stem.
      if (stemLinesCount === 0) {
        return null;
      }

      // 1. Delimited: A., A), (A), [A], A: (or 1-5 ONLY when no lettered choices exist in block)
      const delimRegex = hasExplicitLetteredChoices
        ? /^[([{\s]*([A-E])[)\]}:.]\s*(.*)$/i
        : /^[([{\s]*([A-E1-5])[)\]}:.]\s*(.*)$/i;
      const delimMatch = line.match(delimRegex);
      if (delimMatch) {
        return { letterOrNum: delimMatch[1].toLowerCase(), text: delimMatch[2].trim() };
      }

      // 2. Dash delimited: A - text, A -- text
      const dashRegex = hasExplicitLetteredChoices
        ? /^([A-E])\s*[-–—]+\s+(.*)$/i
        : /^([A-E1-5])\s*[-–—]+\s+(.*)$/i;
      const dashMatch = line.match(dashRegex);
      if (dashMatch) {
        return { letterOrNum: dashMatch[1].toLowerCase(), text: dashMatch[2].trim() };
      }

      // 3. Bare letter without delimiter (e.g. "B Option", "C Option", or "A Option")
      // Only consider if block does NOT already use explicit punctuated lettered choices
      if (!hasExplicitLetteredChoices) {
        const bareMatch = line.match(/^([A-E])\s+([A-Z0-9].*)$/);
        if (bareMatch) {
          const letter = bareMatch[1].toLowerCase();
          const rest = bareMatch[2].trim();

          if (letter === 'a') {
            const isClinicalOpener =
              /^(?:\d+[-\s]?year|patient|healthy|female|male|newborn|child|infant|pregnant|case|man|woman|prior|high|low|normal|elevated|decreased|increased|acute|chronic)\b/i.test(
                rest
              );
            if (!isClinicalOpener && currentlyInChoices) {
              return { letterOrNum: letter, text: rest };
            }
            return null;
          }

          // For B, C, D, E followed by Capital/Number
          if (currentlyInChoices || rawChoices.length > 0) {
            return { letterOrNum: letter, text: rest };
          }
        }
      }

      return null;
    };

    for (const line of lines) {
      if (answerKeyLineRegex.test(line.trim())) {
        continue;
      }

      const expMatch = line.match(explanationRegex);
      if (expMatch) {
        inExplanation = true;
        detectedExplanation = expMatch[1].trim();
        continue;
      }

      if (inExplanation) {
        detectedExplanation += ' ' + line;
        continue;
      }

      const match = matchChoiceLine(line, stemLines.length, inChoices);
      if (match) {
        inChoices = true;
        const letter = this.mapNumericOrLetterId(match.letterOrNum);
        const splitItems = this.splitInlineChoices(letter, match.text);
        for (const item of splitItems) {
          rawChoices.push(item);
        }
      } else if (!inChoices) {
        // If the line has explicit "**Stem**: <text>", extract the stem payload directly!
        const explicitStemMatch = line.match(/^\*{0,2}Stem\*{0,2}\s*:\s*(.*)$/i);
        if (explicitStemMatch) {
          const content = explicitStemMatch[1].trim();
          if (content) stemLines.push(content);
          continue;
        }

        // Capture author's draft curriculum scope if present in block header
        const scopeMatch = line.match(/^\*{0,2}Curriculum Scope\*{0,2}\s*:\s*(.*)$/i);
        if (scopeMatch) {
          const rawScope = scopeMatch[1];
          const blockM = rawScope.match(/Block\s*:\s*([^|]+)/i);
          const subjM = rawScope.match(/Subject\s*:\s*([^|]+)/i);
          const chapM = rawScope.match(/Chapter\s*:\s*([^|]+)/i);
          draftScope = {
            block: blockM?.[1]?.trim(),
            subject: subjM?.[1]?.trim(),
            chapter: chapM?.[1]?.trim(),
          };
          continue;
        }

        // Capture concept if present in header (e.g. [Concept: ...] or **Concept**:)
        const bracketConceptMatch = line.match(/\[Concept\s*:\s*([^\]]+)\]/i);
        if (bracketConceptMatch) {
          detectedConcept = bracketConceptMatch[1].trim();
        }
        const colonConceptMatch = line.match(/^\*{0,2}Concept\*{0,2}\s*:\s*(.*)$/i);
        if (colonConceptMatch) {
          detectedConcept = colonConceptMatch[1].trim();
        }

        // Ignore metadata and header lines when before choices
        const isHeaderOrMeta =
          /^(?:---|\*{3,}|_{3,}|#{1,6}\s*(?:Question|Item|Q)\s*\d+)/i.test(line.trim()) ||
          /^\*{0,2}(?:Curriculum Scope|Difficulty|Cognitive|Cognitive Level|Concept|Choices|Options|Role|Instructions)\*{0,2}\s*:/i.test(
            line.trim()
          );

        if (isHeaderOrMeta) {
          continue;
        }

        stemLines.push(line);
      } else if (rawChoices.length > 0) {
        const trimmedLine = line.trim();
        const inlineStartMatch = trimmedLine.match(
          /^(?:(?:\(([B-F1-5])\)|([B-F1-5])[)\]}:.]|[B-F1-5]\s*[-–—]+))\s+(.*)$/i
        );
        if (inlineStartMatch) {
          const rawNext = (inlineStartMatch[1] || inlineStartMatch[2] || '').toLowerCase();
          const nextId = this.mapNumericOrLetterId(rawNext);
          const splitItems = this.splitInlineChoices(nextId, inlineStartMatch[3] || '');
          for (const item of splitItems) {
            rawChoices.push(item);
          }
        } else {
          rawChoices[rawChoices.length - 1].text += ' ' + line;
        }
      }
    }

    // 4. Unlabelled 4-choice fallback: if user pasted a stem ending in '?' or ':' followed by 4 unlabelled option lines
    if (rawChoices.length === 0 && stemLines.length >= 5) {
      const questionLineIdx = stemLines.findIndex((l) => /[?:]\s*$/.test(l));
      const optionLines =
        questionLineIdx !== -1 && stemLines.length - (questionLineIdx + 1) >= 4
          ? stemLines.splice(questionLineIdx + 1, 4)
          : stemLines.splice(stemLines.length - 4, 4);
      const ids = ['a', 'b', 'c', 'd'];
      optionLines.forEach((optText, idx) => {
        rawChoices.push({ id: ids[idx], text: optText.trim() });
      });
    }

    return { stemLines, rawChoices, detectedExplanation, detectedConcept, draftScope };
  }

  /**
   * Normalizes choices into exactly 4 options with rationales.
   */
  public static standardizeChoices(
    rawChoices: Array<{ id: string; text: string }>,
    explicitCorrectId: ChoiceId | 'e' | null,
    matchedBankQuestion?: Question
  ) {
    const defaultIds: ChoiceId[] = ['a', 'b', 'c', 'd'];
    let targetKey: ChoiceId = (explicitCorrectId as ChoiceId) || 'a';

    let effectiveChoices = [...rawChoices];
    if (explicitCorrectId === 'e') {
      const choiceE = rawChoices.find((c) => c.id === 'e');
      if (choiceE) {
        effectiveChoices = effectiveChoices.filter((c) => c.id !== 'd');
        effectiveChoices.push({ id: 'd', text: choiceE.text });
        targetKey = 'd';
      }
    }

    return defaultIds.map((id, idx) => {
      const found = effectiveChoices.find((c) => c.id === id) || effectiveChoices[idx];
      let text =
        found?.text?.trim() ||
        matchedBankQuestion?.choices?.[idx]?.text ||
        `Plausible clinical alternative option ${id.toUpperCase()}`;

      // Clean any accidental trailing option marker (e.g. " E. ST elevation")
      text = text.replace(/\s+(?:[([{\s]*[e-f][)\]}:.]|[e-f]\s*[-–—]+)\s+.*$/i, '').trim();

      const isCorrect = id === targetKey;

      const bankChoiceMatch = matchedBankQuestion?.choices?.find(
        (bc) => bc.id === id || bc.text.toLowerCase().trim() === text.toLowerCase().trim()
      );

      const rationale =
        bankChoiceMatch?.rationale ||
        (isCorrect
          ? `Correct. This option aligns with the primary clinical pathophysiology and established diagnostic guidelines.`
          : `Incorrect. This mechanism does not account for the cardinal presentation observed in this clinical scenario.`);

      return {
        id,
        text,
        isCorrect,
        rationale,
      };
    });
  }

  public static extractConceptTitle(
    stem: string,
    subjectId: string,
    blockId: string = LEGACY_DEFAULT_BLOCK_ID
  ): string {
    const words = stem.split(/\s+/).slice(0, 6).join(' ');
    const sanitized = words.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (sanitized.length > 8) {
      return `${sanitized} Evaluation`;
    }
    return `${normalizeBlockId(blockId).toUpperCase()} ${subjectId.toUpperCase()} Clinical Assessment`;
  }
}
