/**
 * Web Worker: QDD Instant Advisory Engine
 * Runs on a dedicated background thread for < 16ms zero-friction authoring hints.
 * Zero main-thread blocking, zero network overhead, 100% offline-capable.
 */

import { DuplicationDetectionEngine } from '../../domain/questionBank/duplication/DuplicationDetectionEngine.ts';
import { QuestionCanonicalizerV2 } from '../../domain/questionBank/duplication/QuestionCanonicalizerV2.ts';
import { MinHasher } from '../../domain/questionBank/duplication/MinHasher.ts';
import { InMemoryFingerprintRepository } from '../../infrastructure/questionBank/duplication/memory/InMemoryFingerprintRepository.ts';
import { S1ExactStage } from '../../domain/questionBank/duplication/stages/S1Exact.ts';
import { S2LexicalLshStage } from '../../domain/questionBank/duplication/stages/S2LexicalLsh.ts';
import { S4DiscriminatorsStage } from '../../domain/questionBank/duplication/stages/S4Discriminators.ts';
import { EdgeGatePolicy } from '../../domain/questionBank/duplication/GatePolicy.ts';
import type {
  QddWorkerInboundMessage,
  QddWorkerOutboundMessage,
} from './qddWorkerProtocol.ts';

// Dedicated Worker State
const repo = new InMemoryFingerprintRepository();
const canonicalizer = new QuestionCanonicalizerV2();
const minHasher = new MinHasher();

const stages = [
  new S1ExactStage(repo),
  new S2LexicalLshStage(repo, minHasher),
  new S4DiscriminatorsStage(),
];

const policy = new EdgeGatePolicy();
const engine = new DuplicationDetectionEngine(canonicalizer, stages, policy);

// Listen for messages from main UI thread
self.onmessage = async (event: MessageEvent<QddWorkerInboundMessage>) => {
  const msg = event.data;

  try {
    switch (msg.type) {
      case 'INIT_INDEX': {
        const t0 = performance.now();
        await repo.clear();
        for (const fp of msg.payload.fingerprints) {
          await repo.upsert(fp);
        }
        const durationMs = Math.round(performance.now() - t0);
        const reply: QddWorkerOutboundMessage = {
          type: 'INIT_INDEX_DONE',
          payload: { count: msg.payload.fingerprints.length, durationMs },
        };
        self.postMessage(reply);
        break;
      }

      case 'APPEND_FINGERPRINTS': {
        for (const fp of msg.payload.fingerprints) {
          await repo.upsert(fp);
        }
        break;
      }

      case 'CHECK_ADVISORY': {
        const { requestId, question, scope } = msg.payload;
        const t0 = performance.now();
        const checkScope = scope || { kind: 'block', blockId: question.blockId || 'cvs' };

        const res = await engine.check(question, checkScope, 'browser-advisory');
        const computeDurationMs = Math.round(performance.now() - t0);

        if (res.ok) {
          const reply: QddWorkerOutboundMessage = {
            type: 'ADVISORY_RESULT',
            payload: {
              requestId,
              verdict: res.value,
              computeDurationMs,
            },
          };
          self.postMessage(reply);
        } else {
          const reply: QddWorkerOutboundMessage = {
            type: 'ERROR',
            payload: {
              requestId,
              message: res.error.message,
            },
          };
          self.postMessage(reply);
        }
        break;
      }

      case 'CLEAR_INDEX': {
        await repo.clear();
        break;
      }
    }
  } catch (err: any) {
    const errorReply: QddWorkerOutboundMessage = {
      type: 'ERROR',
      payload: {
        message: err?.message || 'Unknown Web Worker error',
      },
    };
    self.postMessage(errorReply);
  }
};
