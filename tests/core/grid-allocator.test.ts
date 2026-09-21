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

  it('orders sustain arrows so higher pitch is the higher arrow (verticalSlot 0)', () => {
    const score: Score = {
      metadata: { timeSignature: [4, 4] },
      measures: [
        {
          number: 1,
          rightHand: [
            // Lower note B4 with finger 1 (Pink), Higher note D5 with finger 3 (Orange)
            { offset: 0.0, duration: 1.0, notes: ['B4', 'D5'], fingers: [1, 3] }
          ],
          leftHand: []
        }
      ]
    };

    const pages = allocateScore(score);
    const cell1 = pages[0].systems[0].cells[1];
    expect(cell1.rightHand.glyphs).toHaveLength(2);

    const arrow0 = cell1.rightHand.glyphs[0];
    const arrow1 = cell1.rightHand.glyphs[1];

    // slot 0 is the top arrow, and must correspond to higher pitch D5 (finger 3 = Orange)
    expect(arrow0).toEqual({
      kind: 'arrow',
      color: '#FB8C00', // Orange (D5)
      verticalSlot: 0
    });

    // slot 1 is the bottom arrow, and must correspond to lower pitch B4 (finger 1 RH = Pink)
    expect(arrow1).toEqual({
      kind: 'arrow',
      color: '#EC407A', // Pink (B4)
      verticalSlot: 1
    });
  });
});
