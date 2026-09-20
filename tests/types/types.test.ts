import { describe, it, expect } from 'vitest';
import { Score } from '../../src/types/score.js';
import { Page, GridCell } from '../../src/types/layout.js';

describe('Data Contracts', () => {
  it('should instantiate a valid score object', () => {
    const score: Score = {
      metadata: { timeSignature: [4, 4], title: 'Test' },
      measures: [
        {
          number: 1,
          rightHand: [{ offset: 0, duration: 1, notes: ['C4'], fingers: [1] }],
          leftHand: []
        }
      ]
    };
    expect(score.measures).toHaveLength(1);
    expect(score.measures[0].rightHand[0].notes[0]).toBe('C4');
  });
});
