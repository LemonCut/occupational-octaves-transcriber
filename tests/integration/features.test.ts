import { describe, it, expect } from 'vitest';
import { transcribeScoreToPdf, transcribeScoreToSvg } from '../../src/index.js';
import { allocateScore } from '../../src/core/grid-allocator.js';
import { Score } from '../../src/types/score.js';

describe('Advanced Features: Triads, Heuristic Fingerings & Multi-Arrow Sustains', () => {
  const richScore: Score = {
    metadata: {
      title: 'Triads and Heuristics Test',
      composer: 'Test Suite',
      timeSignature: [4, 4]
    },
    measures: [
      {
        number: 1,
        // RH: Triad with NO explicit fingerings (heuristics should assign 1, 3, 5)
        // Holding for 2 beats (4 cells) to test 3-arrow sustain propagation
        rightHand: [
          { offset: 0.0, duration: 2.0, notes: ['C4', 'E4', 'G4'] },
          // Single note with NO explicit fingerings (should default to finger 1 = Pink)
          { offset: 2.0, duration: 1.0, notes: ['C5'] },
          // Dyad with accidental and NO explicit fingerings (1, 5 = Pink, Purple)
          { offset: 3.0, duration: 1.0, notes: ['F#4', 'A4'] }
        ],
        // LH: Triad with NO explicit fingerings (heuristics should assign 5, 3, 1)
        // Holding for 2 beats (4 cells)
        leftHand: [
          { offset: 0.0, duration: 2.0, notes: ['C3', 'E3', 'G3'] },
          // Single note with square octave marker (C2) and NO explicit fingerings (defaults to 1 = Red)
          { offset: 2.0, duration: 2.0, notes: ['C2'] }
        ]
      }
    ]
  };

  it('allocates heuristic fingerings and staggered chord positions accurately', () => {
    const pages = allocateScore(richScore);
    expect(pages).toHaveLength(1);

    const firstCell = pages[0].systems[0].cells[0];

    // 1. Verify RH Triad
    const rhGlyphs = firstCell.rightHand.glyphs;
    expect(rhGlyphs).toHaveLength(3);

    // Sorted ascending by pitch: C4 (bottom-right), E4 (center-left), G4 (top-right)
    const c4 = rhGlyphs.find(g => g.kind === 'note' && g.letter === 'C');
    const e4 = rhGlyphs.find(g => g.kind === 'note' && g.letter === 'E');
    const g4 = rhGlyphs.find(g => g.kind === 'note' && g.letter === 'G');

    expect(c4).toBeDefined();
    expect(e4).toBeDefined();
    expect(g4).toBeDefined();

    if (c4?.kind === 'note' && e4?.kind === 'note' && g4?.kind === 'note') {
      // RH Heuristic: Thumb (1) = Pink (#EC407A), Middle (3) = Orange (#FB8C00), Pinky (5) = Purple (#7B1FA2)
      expect(c4.finger).toBe(1);
      expect(c4.color).toBe('#EC407A');
      expect(c4.position).toBe('bottom-right');

      expect(e4.finger).toBe(3);
      expect(e4.color).toBe('#FB8C00');
      expect(e4.position).toBe('center-left');

      expect(g4.finger).toBe(5);
      expect(g4.color).toBe('#7B1FA2');
      expect(g4.position).toBe('top-right');
    }

    // 2. Verify LH Triad
    const lhGlyphs = firstCell.leftHand.glyphs;
    expect(lhGlyphs).toHaveLength(3);

    const c3 = lhGlyphs.find(g => g.kind === 'note' && g.letter === 'C');
    const e3 = lhGlyphs.find(g => g.kind === 'note' && g.letter === 'E');
    const g3 = lhGlyphs.find(g => g.kind === 'note' && g.letter === 'G');

    if (c3?.kind === 'note' && e3?.kind === 'note' && g3?.kind === 'note') {
      // LH Heuristic: lowest (C3) = Pinky (5 = Purple #7B1FA2), middle (E3) = Middle (3 = Orange #FB8C00), highest (G3) = Thumb (1 = Red #D32F2F)
      expect(c3.finger).toBe(5);
      expect(c3.color).toBe('#7B1FA2');
      expect(c3.position).toBe('bottom-right');

      expect(e3.finger).toBe(3);
      expect(e3.color).toBe('#FB8C00');
      expect(e3.position).toBe('center-left');

      expect(g3.finger).toBe(1);
      expect(g3.color).toBe('#D32F2F');
      expect(g3.position).toBe('top-right');
    }
  });

  it('generates 3 stacked sustain arrows with top arrow matching highest pitch', () => {
    const pages = allocateScore(richScore);
    // Cell index 1 is a sustain cell for the 2-beat triad
    const sustainCell = pages[0].systems[0].cells[1];

    const rhArrows = sustainCell.rightHand.glyphs.filter(g => g.kind === 'arrow');
    expect(rhArrows).toHaveLength(3);

    // Slot 0 = highest pitch (G4, pinky = #7B1FA2 Purple)
    // Slot 1 = middle pitch (E4, middle = #FB8C00 Orange)
    // Slot 2 = lowest pitch (C4, thumb = #EC407A Pink)
    const slot0 = rhArrows.find(a => a.verticalSlot === 0);
    const slot1 = rhArrows.find(a => a.verticalSlot === 1);
    const slot2 = rhArrows.find(a => a.verticalSlot === 2);

    expect(slot0?.color).toBe('#7B1FA2'); // Highest pitch (G4) = Top arrow
    expect(slot1?.color).toBe('#FB8C00'); // Middle pitch (E4) = Mid arrow
    expect(slot2?.color).toBe('#EC407A'); // Lowest pitch (C4) = Bottom arrow
  });

  it('renders valid SVG and PDF with all features', async () => {
    const svgs = transcribeScoreToSvg(richScore);
    expect(svgs).toHaveLength(1);
    const svg = svgs[0];

    // Contains notes
    expect(svg).toContain('>C<');
    expect(svg).toContain('>E<');
    expect(svg).toContain('>G<');
    // Contains accidental dot for F#4
    expect(svg).toContain('<circle');
    // Contains square diacritic for C2
    expect(svg).toContain('<rect');
    // Contains star diacritic for C5
    expect(svg).toContain('>*</text>');

    // PDF generation
    const pdfBytes = await transcribeScoreToPdf(richScore);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
