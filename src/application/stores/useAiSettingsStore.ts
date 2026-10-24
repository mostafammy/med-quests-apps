/**
 * Store for managing AI Co-Pilot settings (Engine selection, BYO API keys, models).
 * Persisted locally in IndexedDB (db.aiSettings).
 */
import { create } from 'zustand';
import { db } from '../../infrastructure/storage/db.ts';
import {
  DEFAULT_AI_SETTINGS,
  parseAiSettings,
  type AiSettings,
} from '../../domain/ai/settings.ts';

interface AiSettingsStoreState {
  settings: AiSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AiSettings>) => Promise<void>;
}

export const useAiSettingsStore = create<AiSettingsStoreState>((set, get) => ({
  settings: DEFAULT_AI_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const record = await db.aiSettings.get('ai-settings');
      if (record?.settings) {
        set({ settings: parseAiSettings(record.settings), isLoaded: true });
      } else {
        set({ settings: DEFAULT_AI_SETTINGS, isLoaded: true });
      }
    } catch {
      set({ settings: DEFAULT_AI_SETTINGS, isLoaded: true });
    }
  },

  updateSettings: async (partial: Partial<AiSettings>) => {
    const updated = { ...get().settings, ...partial };
    set({ settings: updated });
    try {
      await db.aiSettings.put({
        key: 'ai-settings',
        settings: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to persist AI settings to IndexedDB:', err);
    }
  },
}));
