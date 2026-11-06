/**
 * Client Composition Root
 * Wires the BlockCatalog, PackSource, Repositories, and SwitchBlockUseCase.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

import { BlockCatalog } from '../../domain/curriculum/BlockCatalog.ts';
import { defaultViteBlockPackSource } from '../../infrastructure/curriculum/ViteBlockPackSource.ts';
import { defaultActiveBlockPreference } from '../../infrastructure/curriculum/LocalStorageActiveBlockPreference.ts';
import { defaultBlockMementoStore } from '../../infrastructure/curriculum/LocalStorageBlockMementoStore.ts';
import {
  QuestionHydrationParticipant,
  StatsHydrationParticipant,
  MementoHydrationParticipant,
  AnalyticsHydrationParticipant,
} from '../curriculum/hydrationParticipants.ts';
import {
  SwitchBlockUseCase,
  DefaultSessionLeaveGuard,
} from '../curriculum/SwitchBlockUseCase.ts';
import { defaultBootBlockResolver } from '../../domain/curriculum/BootBlockResolver.ts';
import type { BlockPackDescriptor } from '../../domain/curriculum/BootBlockResolver.ts';
import type { BlockManifest } from '../../domain/curriculum/schemas.ts';
import type { BlockId } from '../../domain/curriculum/ids.ts';

export class ClientCompositionRoot {
  private static instance: ClientCompositionRoot | null = null;

  public readonly catalog: BlockCatalog;
  public readonly packSource = defaultViteBlockPackSource;
  public readonly preference = defaultActiveBlockPreference;
  public readonly mementoStore = defaultBlockMementoStore;
  public readonly leaveGuard = new DefaultSessionLeaveGuard();
  public readonly switchBlockUseCase: SwitchBlockUseCase;

  private constructor() {
    // 1. Initialize catalog from eager Vite manifests
    const rawManifests = this.packSource.listManifests() as BlockManifest[];
    const descriptors: BlockPackDescriptor[] = rawManifests.map((m) => ({
      blockId: m.block.id,
      manifest: m,
      contentHash: `manifest-${m.block.id}-v1`,
    }));

    this.catalog = new BlockCatalog(descriptors);

    // 2. Setup hydration participants
    const participants = [
      new QuestionHydrationParticipant(this.packSource),
      new StatsHydrationParticipant(),
      new MementoHydrationParticipant(this.mementoStore),
      new AnalyticsHydrationParticipant(),
    ];

    // 3. Setup switch block use case
    this.switchBlockUseCase = new SwitchBlockUseCase(
      this.catalog,
      this.preference,
      participants,
      this.leaveGuard
    );
  }

  public static getInstance(): ClientCompositionRoot {
    if (!ClientCompositionRoot.instance) {
      ClientCompositionRoot.instance = new ClientCompositionRoot();
    }
    return ClientCompositionRoot.instance;
  }

  public resolveInitialBlock(deepLink: string | null = null): BlockId {
    const persisted = this.preference.read();
    const visible = this.catalog.list('student-free');

    const result = defaultBootBlockResolver.resolve({
      deepLink,
      persisted,
      visible,
    });

    return result.blockId;
  }
}

export const compositionRoot = ClientCompositionRoot.getInstance();
