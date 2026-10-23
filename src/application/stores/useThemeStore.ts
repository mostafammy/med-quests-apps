import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (pref: ThemePreference) => void;
  initTheme: () => () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

const applyDocumentTheme = (resolved: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
};

export const useThemeStore = create<ThemeState>((set, get) => {
  const storedPref = (typeof window !== 'undefined'
    ? (localStorage.getItem('mq_theme') as ThemePreference)
    : null) || 'system';

  const initialResolved = storedPref === 'system' ? getSystemTheme() : storedPref;

  return {
    preference: storedPref,
    resolvedTheme: initialResolved,
    setTheme: (preference: ThemePreference) => {
      try {
        localStorage.setItem('mq_theme', preference);
      } catch (_) {}

      const resolved = preference === 'system' ? getSystemTheme() : preference;
      applyDocumentTheme(resolved);
      set({ preference, resolvedTheme: resolved });
    },
    initTheme: () => {
      // Synchronize with stored preference or system listener
      const currentPref = get().preference;
      const resolved = currentPref === 'system' ? getSystemTheme() : currentPref;
      applyDocumentTheme(resolved);
      set({ resolvedTheme: resolved });

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (get().preference === 'system') {
          const newResolved = e.matches ? 'dark' : 'light';
          applyDocumentTheme(newResolved);
          set({ resolvedTheme: newResolved });
        }
      };

      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    },
  };
});
