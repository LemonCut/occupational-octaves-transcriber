import { ScientificPitch } from '../types/score.js';
import { NoteGlyph, GlyphPosition } from '../types/layout.js';
import { parseScientificPitch } from './pitch-mapper.js';
import { getFingerColor } from './fingering.js';

function pitchToMidi(pitch: ScientificPitch): number {
  const match = pitch.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return 60;
  const [, letter, acc, octStr] = match;
  const baseSemis: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = baseSemis[letter.toUpperCase()] ?? 0;
  if (acc === '#') semi += 1;
  if (acc === 'b') semi -= 1;
  return (parseInt(octStr, 10) + 1) * 12 + semi;
}

export function layoutHandCell(notes: ScientificPitch[], fingers: number[]): NoteGlyph[] {
  if (notes.length === 0) return [];

  // Sort notes ascending by pitch
  const items = notes.map((p, i) => ({
    pitch: p,
    finger: fingers[i] ?? 1,
    midi: pitchToMidi(p)
  }));
  items.sort((a, b) => a.midi - b.midi);

  let positions: GlyphPosition[] = ['center'];
  if (items.length === 2) {
    positions = ['bottom-left', 'top-right'];
  } else if (items.length === 3) {
    positions = ['bottom-right', 'center-left', 'top-right'];
  }

  return items.map((item, idx) => {
    const parsed = parseScientificPitch(item.pitch);
    const color = getFingerColor(item.finger);
    const position = positions[idx] || 'center';

    return {
      kind: 'note',
      letter: parsed.letter,
      octaveMarker: parsed.octaveMarker,
      accidental: parsed.accidental,
      color,
      finger: item.finger,
      position
    };
  });
}
