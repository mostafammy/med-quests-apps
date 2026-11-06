/**
 * Block AI Copilot Profile Registry
 * Configures persona, board context, and clinical tool availability per block.
 * SPEC-010: Multi-Block Curriculum Architecture
 */

export type ToolsetId = 'core' | 'hemodynamics' | 'neuro-localization';

export interface BlockAiProfile {
  readonly id: string;
  readonly personaLabel: string;
  readonly specialtyLabel: string;
  readonly boardContext: string;
  readonly toolsetIds: readonly ToolsetId[];
}

export interface IBlockAiProfileRegistry {
  get(profileId: string): BlockAiProfile;
  isToolAllowed(profile: BlockAiProfile, toolName: string): boolean;
}

export const CANONICAL_AI_PROFILES: Readonly<Record<string, BlockAiProfile>> = Object.freeze({
  'cvs-faculty-v1': {
    id: 'cvs-faculty-v1',
    personaLabel: 'Socratic Cardiovascular Faculty Mentor & Pathophysiologist',
    specialtyLabel: 'Cardiovascular Pathophysiology & Hemodynamics',
    boardContext: 'USMLE Step 1 / University Block 206 (CVS)',
    toolsetIds: ['core', 'hemodynamics'],
  },
  'cns-faculty-v1': {
    id: 'cns-faculty-v1',
    personaLabel: 'Socratic Neuroscience Faculty Mentor & Clinical Neurologist',
    specialtyLabel: 'Neuroscience, Neuroanatomy & Clinical Neurology',
    boardContext: 'USMLE Step 1 / University Block 207 (CNS)',
    toolsetIds: ['core', 'neuro-localization'],
  },
  'generic-faculty-v1': {
    id: 'generic-faculty-v1',
    personaLabel: 'Socratic Medical Faculty Mentor',
    specialtyLabel: 'Integrated Medical Sciences & Clinical Reasoning',
    boardContext: 'USMLE Step 1 / University Medical Examinations',
    toolsetIds: ['core'],
  },
});

export const TOOL_TOOLSET_MAPPING: Readonly<Record<string, ToolsetId>> = Object.freeze({
  simulate_hemodynamic_pv_loop: 'hemodynamics',
  calculate_cardiovascular_equation: 'hemodynamics',
  localize_neuro_lesion: 'neuro-localization',
  explain_cranial_nerve_pathway: 'neuro-localization',
});

export class BlockAiProfileRegistry implements IBlockAiProfileRegistry {
  private profiles: Map<string, BlockAiProfile> = new Map();

  constructor(customProfiles?: Record<string, BlockAiProfile>) {
    Object.values(CANONICAL_AI_PROFILES).forEach((p) => this.profiles.set(p.id, p));
    if (customProfiles) {
      Object.values(customProfiles).forEach((p) => this.profiles.set(p.id, p));
    }
  }

  public get(profileId: string): BlockAiProfile {
    return this.profiles.get(profileId) || CANONICAL_AI_PROFILES['generic-faculty-v1'];
  }

  public isToolAllowed(profile: BlockAiProfile, toolName: string): boolean {
    const requiredToolset = TOOL_TOOLSET_MAPPING[toolName];
    if (!requiredToolset) {
      // Core tool, allowed by default for all profiles
      return true;
    }
    return profile.toolsetIds.includes(requiredToolset);
  }
}

export const defaultBlockAiProfileRegistry = new BlockAiProfileRegistry();
