import { Score, NoteEvent } from '../types/score.js';
import { Page, System, GridCell, CellGlyph } from '../types/layout.js';
import { layoutHandCell } from './layout-engine.js';
import { resolveFingerings, getFingerColor } from './fingering.js';

export function determineBaseSubdivision(score: Score): number {
  if (score.metadata.baseSubdivision) return score.metadata.baseSubdivision;
  let minDuration = 0.5; // default to eighth-note
  for (const m of score.measures) {
    for (const ev of [...m.rightHand, ...m.leftHand]) {
      if (ev.duration > 0 && ev.duration < minDuration) {
        minDuration = ev.duration;
      }
    }
  }
  return minDuration;
}

export function allocateScore(score: Score): Page[] {
  const cellDuration = determineBaseSubdivision(score);
  const beatsPerMeasure = score.metadata.timeSignature[0];
  const cellsPerMeasure = Math.round(beatsPerMeasure / cellDuration);

  // Linear cell collection
  const allCells: GridCell[] = [];

  for (const measure of score.measures) {
    const rhSlots: CellGlyph[][] = Array.from({ length: cellsPerMeasure }, () => []);
    const lhSlots: CellGlyph[][] = Array.from({ length: cellsPerMeasure }, () => []);

    const processEvents = (events: NoteEvent[], slots: CellGlyph[][], hand: 'RH' | 'LH') => {
      for (const ev of events) {
        const startCell = Math.round(ev.offset / cellDuration);
        const span = Math.max(1, Math.round(ev.duration / cellDuration));
        const fingers = resolveFingerings(ev.notes, hand, ev.fingers);
        const noteGlyphs = layoutHandCell(ev.notes, fingers, hand);

        if (startCell < cellsPerMeasure) {
          slots[startCell].push(...noteGlyphs);
        }

        // Add sustain arrows in subsequent cells
        for (let s = 1; s < span && startCell + s < cellsPerMeasure; s++) {
          for (let n = 0; n < ev.notes.length; n++) {
            const color = getFingerColor(fingers[n], hand);
            slots[startCell + s].push({
              kind: 'arrow',
              color,
              verticalSlot: n
            });
          }
        }
      }
    };

    processEvents(measure.rightHand, rhSlots, 'RH');
    processEvents(measure.leftHand, lhSlots, 'LH');

    for (let c = 0; c < cellsPerMeasure; c++) {
      allCells.push({
        measureNumber: measure.number,
        cellIndexInSystem: allCells.length % 8,
        rightHand: { glyphs: rhSlots[c] },
        leftHand: { glyphs: lhSlots[c] }
      });
    }
  }

  // Pack into 8-cell systems
  const systems: System[] = [];
  for (let i = 0; i < allCells.length; i += 8) {
    const chunk = allCells.slice(i, i + 8);
    // Pad to 8 if incomplete
    while (chunk.length < 8) {
      chunk.push({
        measureNumber: chunk[chunk.length - 1]?.measureNumber ?? 1,
        cellIndexInSystem: chunk.length,
        rightHand: { glyphs: [] },
        leftHand: { glyphs: [] }
      });
    }
    systems.push({
      systemIndex: systems.length,
      cells: chunk
    });
  }

  // Pack into 4-system pages
  const pages: Page[] = [];
  for (let p = 0; p < systems.length; p += 4) {
    pages.push({
      pageNumber: pages.length + 1,
      systems: systems.slice(p, p + 4)
    });
  }

  return pages;
}
