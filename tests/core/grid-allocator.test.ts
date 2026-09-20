import { describe, it, expect } from 'vitest';
import { allocateScore } from '../../src/core/grid-allocator.js';
import { Score } from '../../src/types/score.js';

describe('Grid Allocator', () => {
  it('allocates 1 measure in 4/4 with 8th notes to 1 system with 8 cells', () => {
    const score: Score = {
      metadata: { timeSignature: [4, 4] },
      measures: [
        {
          number: 1,
          rightHand: [
            { offset: 0.0, duration: 1.0, notes: ['E4'], fingers: [1] } // spans 2 cells
          ],
          leftHand: [
            { offset: 0.0, duration: 0.5, notes: ['C3'], fingers: [5] }
          ]
        }
      ]
    };

    const pages = allocateScore(score);
    expect(pages).toHaveLength(1);
    expect(pages[0].systems).toHaveLength(1);
    expect(pages[0].systems[0].cells).toHaveLength(8);

    // Cell 0: note in RH, note in LH
    const cell0 = pages[0].systems[0].cells[0];
    expect(cell0.rightHand.glyphs[0].kind).toBe('note');
    expect(cell0.leftHand.glyphs[0].kind).toBe('note');

    // Cell 1: sustain arrow in RH, empty in LH
    const cell1 = pages[0].systems[0].cells[1];
    expect(cell1.rightHand.glyphs[0].kind).toBe('arrow');
    expect(cell1.leftHand.glyphs).toHaveLength(0);
  });
});
