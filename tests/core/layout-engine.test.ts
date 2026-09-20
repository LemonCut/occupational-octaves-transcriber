import { describe, it, expect } from 'vitest';
import { layoutHandCell } from '../../src/core/layout-engine.js';

describe('Layout Engine (Multi-Note Positioning)', () => {
  it('positions single note in center', () => {
    const glyphs = layoutHandCell(['E4'], [3]);
    expect(glyphs).toHaveLength(1);
    expect(glyphs[0].position).toBe('center');
  });

  it('positions 2 notes: lower in bottom-left, higher in top-right', () => {
    const glyphs = layoutHandCell(['A4', 'E5'], [1, 3]);
    expect(glyphs).toHaveLength(2);
    expect(glyphs[0].position).toBe('bottom-left'); // Lower pitch A4
    expect(glyphs[1].position).toBe('top-right');   // Higher pitch E5
  });

  it('positions 3 notes: lowest in bottom-right, mid in center-left, highest in top-right', () => {
    const glyphs = layoutHandCell(['C4', 'E4', 'G4'], [1, 3, 5]);
    expect(glyphs).toHaveLength(3);
    expect(glyphs[0].position).toBe('bottom-right'); // Lowest C4
    expect(glyphs[1].position).toBe('center-left');  // Mid E4
    expect(glyphs[2].position).toBe('top-right');    // Highest G4
  });
});
