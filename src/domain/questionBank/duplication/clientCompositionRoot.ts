/**
 * Client Composition Root: QDD Engine
 * Assembles the prebuilt DuplicationDetectionEngine for browser, client, and UI agent execution.
 * Layer: Domain / QuestionBank / Duplication
 */

import { QuestionCanonicalizerV2 } from './QuestionCanonicalizerV2.ts';
import { MinHasher } from './MinHasher.ts';
import { S1ExactStage } from './stages/S1Exact.ts';
import { S2LexicalLshStage } from './stages/S2LexicalLsh.ts';
import { S4DiscriminatorsStage } from './stages/S4Discriminators.ts';
import { EdgeGatePolicy } from './GatePolicy.ts';
import { DuplicationDetectionEngine } from './DuplicationDetectionEngine.ts';
import { InMemoryFingerprintRepository } from '../../../infrastructure/questionBank/duplication/memory/InMemoryFingerprintRepository.ts';
import { edgeQuestionBankGateway } from '../../../infrastructure/questionBank/edgeQuestionBankGateway.ts';
import { db } from '../../../infrastructure/storage/db.ts';
import defaultCvsBank from '../../../../content/cvs/dist/bank.v1.json';
import type { Question } from '../../model/types.ts';
import type { BlockId } from '../../curriculum/ids.ts';
import { normalizeBlockId } from '../QuestionNormalizer.ts';
import type { IDuplicationDetectionEngine } from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

/**
 * Repairs legacy bank questions that were saved when an older parser shifted
 * a numbered stem ("1. Prior infection with GAS...") into choices[0].text.
 */
export function normalizeBankQuestionForQdd(q: Question): Question {
  const stem = (q.stem || '').trim();
  const choiceA = (q.choices?.[0]?.text || '').trim();
  const rawBlock = q.blockId || 'cvs';
  const qBlockId = (normalizeBlockId(rawBlock, undefined, {
    id: q.id,
    subjectId: q.subjectId,
    stem: q.stem,
  }) || 'cvs') as BlockId;

  if (
    /^Clinical scenario regarding /i.test(stem) &&
    choiceA.length >= 20 &&
    (/[?:]$/.test(choiceA) || /\bwhich one of the following\b/i.test(choiceA))
  ) {
    const cleanedStem = choiceA
      .replace(/^(?:(?:question|item|q)\s*\d+\s*[:.)-]\s*|\(\d+\)\s*|\d+\s*[.):-]\s+)/i, '')
      .trim();
    const choices = (q.choices || []).map((c) => ({ ...c }));
    // If Choice D is the known streptolysin O answer and Choice A was wrongly marked correct, restore Choice D key
    if (
      choices.length === 4 &&
      choices[0].isCorrect &&
      /streptolysin\s+o/i.test(choices[3].text)
    ) {
      choices[0].isCorrect = false;
      choices[3].isCorrect = true;
    }
    return {
      ...q,
      blockId: qBlockId,
      stem: cleanedStem,
      choices,
    };
  }
  return {
    ...q,
    blockId: qBlockId,
  };
}

/**
 * Loads and merges all canonical bank questions across:
 * 1. Bundled seed bank (content/cvs/dist/bank.v1.json)
 * 2. Caller-supplied seed/store questions
 * 3. Local Canonical Bank simulator (localStorage['medquests_global_canonical_bank_v2_cvs'])
 * 4. IndexedDB (db.questions)
 */
export async function loadAllClientBankQuestions(
  seedQuestions: readonly Question[] = []
): Promise<Question[]> {
  const byId = new Map<string, Question>();

  if (Array.isArray(defaultCvsBank)) {
    for (const q of defaultCvsBank as Question[]) {
      if (q?.id) byId.set(q.id, q);
    }
  }

  try {
    const cvsCanonical = edgeQuestionBankGateway.getLocalCanonicalBank('cvs');
    if (Array.isArray(cvsCanonical)) {
      for (const q of cvsCanonical) {
        const editorialStatus = (q as Question & { editorialStatus?: string }).editorialStatus;
        if (q?.id && editorialStatus !== 'archived' && q.status !== 'quarantined') {
          byId.set(q.id, q);
        }
      }
    }
  } catch {
    // Ignore storage read error
  }

  try {
    const cnsCanonical = edgeQuestionBankGateway.getLocalCanonicalBank('cns');
    if (Array.isArray(cnsCanonical)) {
      for (const q of cnsCanonical) {
        const editorialStatus = (q as Question & { editorialStatus?: string }).editorialStatus;
        if (q?.id && editorialStatus !== 'archived' && q.status !== 'quarantined') {
          byId.set(q.id, q);
        }
      }
    }
  } catch {
    // Ignore storage read error
  }

  try {
    const idbQuestions = await db.questions.toArray();
    if (Array.isArray(idbQuestions)) {
      for (const q of idbQuestions) {
        if (q?.id && q.status !== 'quarantined') {
          byId.set(q.id, q);
        }
      }
    }
  } catch {
    // Ignore IndexedDB error in non-browser environments
  }

  for (const q of seedQuestions) {
    if (q?.id) byId.set(q.id, q);
  }

  return Array.from(byId.values());
}

/**
 * Creates and initializes an in-memory instance of the prebuilt DuplicationDetectionEngine
 * populated with canonical bank questions for fast, non-blocking duplicate audits.
 */
export async function createClientQddEngine(
  bankQuestions: readonly Question[] = []
): Promise<IDuplicationDetectionEngine> {
  const repo = new InMemoryFingerprintRepository();
  const canonicalizer = new QuestionCanonicalizerV2();
  const minHasher = new MinHasher();

  if (bankQuestions.length > 0) {
    const normalizedBank = bankQuestions.map((q) => normalizeBankQuestionForQdd(q));
    const canonicals = await Promise.all(normalizedBank.map((q) => canonicalizer.canonicalize(q)));
    for (let i = 0; i < normalizedBank.length; i++) {
      const q = normalizedBank[i];
      const c = canonicals[i];
      const sig = minHasher.signature(c.shingles);
      const bandKeys = minHasher.bandKeys(sig);

      await repo.upsert({
        questionId: q.id,
        blockId: (q.blockId as BlockId) || 'cvs',
        chapterId: q.chapterId,
        normalizerVersion: c.normalizerVersion,
        stemHash: c.stemHash,
        itemHash: c.itemHash,
        answerKeyHash: c.answerKeyHash,
        canonicalCorrectAnswer: c.canonicalCorrectAnswer,
        minhash: sig,
        lshBands: bandKeys,
        discriminators: c.discriminators,
        embeddingModel: null,
        embeddedAt: null,
        contentVersion: 1,
      });
    }
  }

  const stages = [
    new S1ExactStage(repo),
    new S2LexicalLshStage(repo, minHasher),
    new S4DiscriminatorsStage(),
  ];

  const policy = new EdgeGatePolicy();

  return new DuplicationDetectionEngine(canonicalizer, stages, policy);
}
