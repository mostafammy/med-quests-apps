import { describe, it, expect } from 'vitest';
import { POWER_ACTIONS, type PowerActionKey } from '../powerActions.ts';

describe('Power Actions (High-Yield Medical Student Inquiries)', () => {
  const mockChoices = [
    { id: 'a', text: 'Patent ductus arteriosus' },
    { id: 'b', text: 'Ligamentum venosum' },
    { id: 'c', text: 'Ligamentum teres hepatis' },
    { id: 'd', text: 'Medial umbilical ligament' },
  ];

  it('defines all required clinical power action keys', () => {
    const actionKeys = POWER_ACTIONS.map((a) => a.key);
    const expectedKeys: PowerActionKey[] = [
      'why_correct',
      'why_distractors_wrong',
      'pivot_clues',
      'pv_loop',
      'mnemonic',
      'peer_trap',
      'sealed_pivot_clues',
      'sealed_torn_choice',
    ];

    for (const key of expectedKeys) {
      expect(actionKeys).toContain(key);
    }
  });

  it('generates high-yield prompt for Why Right (why_correct)', () => {
    const action = POWER_ACTIONS.find((a) => a.key === 'why_correct')!;
    expect(action).toBeDefined();
    expect(action.visibleWhen).toBe('revealed');

    const prompt = action.generatePrompt({
      questionStem: 'A 2-day-old infant is evaluated for a heart murmur...',
      choices: mockChoices,
      correctChoiceId: 'c',
      selectedChoiceId: 'b',
    });

    expect(prompt).toContain('Option C (Ligamentum teres hepatis)');
    expect(prompt).toContain('first-principles');
    expect(prompt).toContain('pathophysiology');
  });

  it('generates differential distractor deconstruction for Rule Out Wrong (why_distractors_wrong)', () => {
    const action = POWER_ACTIONS.find((a) => a.key === 'why_distractors_wrong')!;
    expect(action).toBeDefined();
    expect(action.visibleWhen).toBe('revealed');

    const prompt = action.generatePrompt({
      questionStem: 'A 2-day-old infant is evaluated for a heart murmur...',
      choices: mockChoices,
      correctChoiceId: 'c',
      selectedChoiceId: 'b',
    });

    // Should include wrong choices A, B, D and exclude correct choice C
    expect(prompt).toContain('Option A');
    expect(prompt).toContain('Option B');
    expect(prompt).toContain('Option D');
    expect(prompt).toContain('Deconstruct all incorrect choices');
  });

  it('generates hemodynamic simulation prompt for P-V Loop (pv_loop)', () => {
    const action = POWER_ACTIONS.find((a) => a.key === 'pv_loop')!;
    expect(action.visibleWhen).toBe('always');

    const prompt = action.generatePrompt({
      questionStem: 'Patient with severe aortic stenosis...',
      choices: mockChoices,
    });

    expect(prompt).toContain('Pressure-Volume (P-V) loop');
    expect(prompt).toContain('EDV, ESV, Stroke Volume');
  });

  it('generates memory anchor prompt for Board Mnemonic (mnemonic)', () => {
    const action = POWER_ACTIONS.find((a) => a.key === 'mnemonic')!;
    expect(action.visibleWhen).toBe('always');

    const prompt = action.generatePrompt({
      questionStem: 'Patient with holosystolic murmur...',
      choices: mockChoices,
    });

    expect(prompt).toContain('memory anchor');
    expect(prompt).toContain('mnemonic');
  });

  it('generates peer trap analysis prompt (peer_trap)', () => {
    const action = POWER_ACTIONS.find((a) => a.key === 'peer_trap')!;
    expect(action.visibleWhen).toBe('revealed');

    const prompt = action.generatePrompt({
      questionStem: 'Patient with HOCM...',
      choices: mockChoices,
    });

    expect(prompt).toContain('peer student cohort difficulty');
    expect(prompt).toContain('distractor');
  });

  it('respects visibility rules between revealed post-commit and sealed pre-commit modes', () => {
    const revealedActions = POWER_ACTIONS.filter(
      (a) => a.visibleWhen === 'always' || a.visibleWhen === 'revealed'
    );
    const sealedActions = POWER_ACTIONS.filter(
      (a) => a.visibleWhen === 'always' || a.visibleWhen === 'sealed'
    );

    // In revealed mode, Why Right and Rule Out Wrong must be visible
    expect(revealedActions.some((a) => a.key === 'why_correct')).toBe(true);
    expect(revealedActions.some((a) => a.key === 'why_distractors_wrong')).toBe(true);
    expect(revealedActions.some((a) => a.key === 'peer_trap')).toBe(true);

    // In sealed mode, Why Right must NOT be visible to prevent exam spoilers
    expect(sealedActions.some((a) => a.key === 'why_correct')).toBe(false);
    expect(sealedActions.some((a) => a.key === 'why_distractors_wrong')).toBe(false);

    // Socratic pivot clues should be available in sealed mode
    expect(sealedActions.some((a) => a.key === 'sealed_pivot_clues')).toBe(true);
    expect(sealedActions.some((a) => a.key === 'sealed_torn_choice')).toBe(true);
  });

  it('generates Arabic clinical prompts and provides Arabic labels when requested', () => {
    const action = POWER_ACTIONS.find((a) => a.key === 'why_correct')!;
    expect(action.labelAr).toBe('لماذا صحيحة');
    expect(action.shortLabelAr).toBe('لماذا صحيحة');
    expect(action.tooltipAr).toContain('الفيزيولوجيا المرضية');

    const promptAr = action.generatePrompt(
      {
        questionStem: 'Patient with Aortic Stenosis...',
        choices: mockChoices,
        correctChoiceId: 'c',
      },
      'ar'
    );

    expect(promptAr).toContain('اشرح بالتفصيل لماذا يعتبر');
    expect(promptAr).toContain('Option C (Ligamentum teres hepatis)');
    expect(promptAr).toContain('الفيزيولوجيا المرضية');
  });
});
