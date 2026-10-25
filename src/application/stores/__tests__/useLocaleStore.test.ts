import { describe, it, expect, beforeEach } from 'vitest';
import { useLocaleStore } from '../useLocaleStore.ts';

describe('useLocaleStore (Platform UI Bilingual & BiDi Store)', () => {
  beforeEach(() => {
    useLocaleStore.getState().setLocale('en');
  });

  it('initializes in English with LTR direction', () => {
    const state = useLocaleStore.getState();
    expect(state.locale).toBe('en');
    expect(state.dir).toBe('ltr');
    expect(state.isRtl).toBe(false);
    expect(state.t.common.appName).toBe('Med Quests');
  });

  it('switches to Arabic with RTL direction and Arabic translations', () => {
    useLocaleStore.getState().setLocale('ar');
    const state = useLocaleStore.getState();

    expect(state.locale).toBe('ar');
    expect(state.dir).toBe('rtl');
    expect(state.isRtl).toBe(true);
    expect(state.t.common.appName).toBe('ميد كويستس');
    expect(state.t.nav.dashboard).toBe('لوحة التحكم');
    expect(state.t.copilot.title).toBe('المساعد الذكي');
  });

  it('toggles seamlessly between English and Arabic', () => {
    expect(useLocaleStore.getState().locale).toBe('en');

    useLocaleStore.getState().toggleLocale();
    expect(useLocaleStore.getState().locale).toBe('ar');
    expect(useLocaleStore.getState().dir).toBe('rtl');

    useLocaleStore.getState().toggleLocale();
    expect(useLocaleStore.getState().locale).toBe('en');
    expect(useLocaleStore.getState().dir).toBe('ltr');
  });
});
