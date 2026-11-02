/**
 * Type-Safe Protocol: QDD Advisory Web Worker
 * Clean Architecture: Application Layer
 * Defines message contracts between Main UI Thread and background Web Worker.
 */

import type {
  DuplicationVerdict,
  QddScope,
  QuestionFingerprint,
} from '../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';
import type { Question } from '../../domain/model/types.ts';

export type QddWorkerInboundMessage =
  | {
      readonly type: 'INIT_INDEX';
      readonly payload: { readonly fingerprints: readonly QuestionFingerprint[] };
    }
  | {
      readonly type: 'APPEND_FINGERPRINTS';
      readonly payload: { readonly fingerprints: readonly QuestionFingerprint[] };
    }
  | {
      readonly type: 'CHECK_ADVISORY';
      readonly payload: {
        readonly requestId: string;
        readonly question: Question;
        readonly scope?: QddScope;
      };
    }
  | {
      readonly type: 'CLEAR_INDEX';
    };

export type QddWorkerOutboundMessage =
  | {
      readonly type: 'INIT_INDEX_DONE';
      readonly payload: { readonly count: number; readonly durationMs: number };
    }
  | {
      readonly type: 'ADVISORY_RESULT';
      readonly payload: {
        readonly requestId: string;
        readonly verdict: DuplicationVerdict;
        readonly computeDurationMs: number;
      };
    }
  | {
      readonly type: 'ERROR';
      readonly payload: {
        readonly requestId?: string;
        readonly message: string;
      };
    };
