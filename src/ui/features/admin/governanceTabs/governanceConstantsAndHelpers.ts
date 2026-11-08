import type {
  ActiveDeviceSession,
  FeatureFlagKey,
  ManagedUserRecord,
  UserProfile,
} from '../../../../domain/auth/types.ts';

export interface SessionWithUser extends ActiveDeviceSession {
  readonly user: UserProfile;
  readonly userRecord: ManagedUserRecord;
}

export function getCountryFlag(code?: string | null): string {
  if (!code || code === 'DEV') return '🌐';
  const c = code.toUpperCase();
  if (c.length !== 2) return '🌐';
  const codePoints = [...c].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const FEATURE_FLAG_META: ReadonlyArray<{
  readonly key: FeatureFlagKey;
  readonly title: string;
  readonly description: string;
}> = [
  {
    key: 'ai_cloud_streaming_quota',
    title: 'Cloud AI Co-Pilot Streaming',
    description:
      'Activates high-speed Groq/Gemini cloud reasoning. Turn OFF to exclude this user and restrict to local offline tutor.',
  },
  {
    key: 'question_studio_author',
    title: 'Question Studio Authoring (/studio)',
    description:
      'Grants access to author, edit, and verify clinical vignettes in the faculty Question Studio.',
  },
  {
    key: 'multi_block_unlock',
    title: 'Multi-Block Curriculum Access',
    description:
      'Unlocks early access to upcoming organ system blocks alongside Cardiovascular (CVS).',
  },
  {
    key: 'cloud_sync_backup',
    title: 'Cloud CRDT Progress Synchronization',
    description:
      'Enables cross-device background synchronization of attempts, SM-2 cards, and notes.',
  },
];
