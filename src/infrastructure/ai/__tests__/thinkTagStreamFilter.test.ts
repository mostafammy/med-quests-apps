import { describe, it, expect } from 'vitest';
import { ThinkTagStreamFilter } from '../providers/openAiCompatibleProvider.ts';

describe('ThinkTagStreamFilter', () => {
  it('yields ordinary text when no think tags are present', () => {
    const filter = new ThinkTagStreamFilter();
    const e1 = filter.processChunk('Hello ');
    const e2 = filter.processChunk('world!');
    const e3 = filter.flush();

    const all = [...e1, ...e2, ...e3];
    expect(all).toEqual([
      { type: 'text', delta: 'Hello ' },
      { type: 'text', delta: 'world!' },
    ]);
  });

  it('correctly splits embedded <think>...</think> tags into thinking events', () => {
    const filter = new ThinkTagStreamFilter();
    const e1 = filter.processChunk('<think>Patient has aortic stenosis hemodynamics.</think>Option A is correct.');
    const e2 = filter.flush();

    const all = [...e1, ...e2];
    expect(all).toEqual([
      { type: 'thinking', delta: 'Patient has aortic stenosis hemodynamics.' },
      { type: 'text', delta: 'Option A is correct.' },
    ]);
  });

  it('handles <think> and </think> tags split across arbitrary streaming chunks', () => {
    const filter = new ThinkTagStreamFilter();
    const chunks = [
      '<th',
      'ink>',
      'Evaluating differential:',
      ' 1. AS vs 2. MR',
      '</th',
      'ink>\n\nThe diagnosis is severe Aortic Stenosis.',
    ];

    const allEvents: Array<{ type: string; delta: string }> = [];
    for (const chunk of chunks) {
      allEvents.push(...filter.processChunk(chunk));
    }
    allEvents.push(...filter.flush());

    const thinkingParts = allEvents.filter((e) => e.type === 'thinking').map((e) => e.delta).join('');
    const textParts = allEvents.filter((e) => e.type === 'text').map((e) => e.delta).join('');

    expect(thinkingParts).toBe('Evaluating differential: 1. AS vs 2. MR');
    expect(textParts).toBe('The diagnosis is severe Aortic Stenosis.');
  });
});
