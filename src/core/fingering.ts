import { ScientificPitch } from '../types/score.js';
import { FingerColor } from '../types/layout.js';

const FINGER_COLORS_LH: Record<number, FingerColor> = {
  1: '#D32F2F', // Red (Thumb)
  2: '#2E7D32', // Green (Index)
  3: '#FB8C00', // Orange (Middle)
  4: '#1976D2', // Blue (Ring)
  5: '#7B1FA2'  // Purple (Pinky)
};

const FINGER_COLORS_RH: Record<number, FingerColor> = {
  1: '#EC407A', // Pink (Thumb)
  2: '#2E7D32', // Green (Index)
  3: '#FB8C00', // Orange (Middle)
  4: '#1976D2', // Blue (Ring)
  5: '#7B1FA2'  // Purple (Pinky)
};

export function getFingerColor(finger: number, hand: 'RH' | 'LH' = 'LH'): FingerColor {
  const table = hand === 'RH' ? FINGER_COLORS_RH : FINGER_COLORS_LH;
  return table[finger] || (hand === 'RH' ? '#EC407A' : '#D32F2F');
}

function pitchToMidi(pitch: ScientificPitch): number {
  const match = pitch.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) return 60;
  const [, letter, acc, octStr] = match;
  const baseSemis: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = baseSemis[letter.toUpperCase()] ?? 0;
  if (acc === '#') semi += 1;
  if (acc === 'b') semi -= 1;
  const oct = parseInt(octStr, 10);
  return (oct + 1) * 12 + semi;
}

function getPitchLetter(pitch: ScientificPitch): string {
  const match = pitch.trim().match(/^([A-Ga-g])/);
  return match ? match[1].toUpperCase() : 'C';
}

/**
 * C-home position fingerings for single notes.
 * Right Hand (ascending from C):
 *   C -> 1 (Thumb, Pink)
 *   D -> 2 (Index, Green)
 *   E -> 3 (Middle, Orange)
 *   F -> 4 (Ring, Blue)
 *   G -> 5 (Pinky, Purple)
 *
 * Left Hand (descending from C):
 *   C -> 1 (Thumb, Red)
 *   B -> 2 (Index, Green)
 *   A -> 3 (Middle, Orange)
 *   G -> 4 (Ring, Blue)
 *   F -> 5 (Pinky, Purple)
 */
const C_POSITION_RH: Record<string, number> = {
  C: 1,
  D: 2,
  E: 3,
  F: 4,
  G: 5,
  A: 5,
  B: 1
};

const C_POSITION_LH: Record<string, number> = {
  C: 1,
  B: 2,
  A: 3,
  G: 4,
  F: 5,
  E: 5,
  D: 2
};

export function resolveFingerings(
  notes: ScientificPitch[],
  hand: 'RH' | 'LH',
  explicitFingers?: number[]
): number[] {
  if (explicitFingers && explicitFingers.length === notes.length) {
    return [...explicitFingers];
  }

  // Single note fallback to C-home position
  if (notes.length === 1) {
    const letter = getPitchLetter(notes[0]);
    const table = hand === 'RH' ? C_POSITION_RH : C_POSITION_LH;
    return [table[letter] ?? 1];
  }

  // Sort indices by pitch
  const indexed = notes.map((p, i) => ({ pitch: p, midi: pitchToMidi(p), origIndex: i }));
  indexed.sort((a, b) => a.midi - b.midi);

  const assigned = new Array<number>(notes.length);

  if (notes.length === 2) {
    // Dyad fingering based on interval span
    const semitones = Math.abs(indexed[1].midi - indexed[0].midi);

    if (hand === 'RH') {
      if (semitones <= 2) {
        // Seconds (e.g. C-D) -> [1, 2]
        assigned[indexed[0].origIndex] = 1;
        assigned[indexed[1].origIndex] = 2;
      } else if (semitones <= 4) {
        // Thirds (e.g. B-D, C-E) -> [1, 3]
        assigned[indexed[0].origIndex] = 1;
        assigned[indexed[1].origIndex] = 3;
      } else if (semitones <= 6) {
        // Fourths (e.g. C-F) -> [1, 4]
        assigned[indexed[0].origIndex] = 1;
        assigned[indexed[1].origIndex] = 4;
      } else {
        // Fifths, Sixths, Octaves (e.g. C-G, C-C) -> [1, 5]
        assigned[indexed[0].origIndex] = 1;
        assigned[indexed[1].origIndex] = 5;
      }
    } else {
      // LH: lowest note has higher finger (pinky = 5, thumb = 1)
      if (semitones <= 2) {
        // Seconds -> [2, 1]
        assigned[indexed[0].origIndex] = 2;
        assigned[indexed[1].origIndex] = 1;
      } else if (semitones <= 4) {
        // Thirds -> [3, 1]
        assigned[indexed[0].origIndex] = 3;
        assigned[indexed[1].origIndex] = 1;
      } else if (semitones <= 6) {
        // Fourths -> [4, 1]
        assigned[indexed[0].origIndex] = 4;
        assigned[indexed[1].origIndex] = 1;
      } else {
        // Fifths, Octaves -> [5, 1]
        assigned[indexed[0].origIndex] = 5;
        assigned[indexed[1].origIndex] = 1;
      }
    }
    return assigned;
  }

  if (notes.length === 3) {
    // Triad fingering:
    // Root position & close triads: RH [1, 3, 5], LH [5, 3, 1]
    const lowerInterval = indexed[1].midi - indexed[0].midi;
    const upperInterval = indexed[2].midi - indexed[1].midi;

    if (hand === 'RH') {
      if (lowerInterval <= 4 && upperInterval >= 5) {
        // 1st inversion (e.g. E-G-C, 3rd + 4th) -> [1, 2, 5]
        assigned[indexed[0].origIndex] = 1;
        assigned[indexed[1].origIndex] = 2;
        assigned[indexed[2].origIndex] = 5;
      } else {
        // Root position (e.g. C-E-G, 3rd + 3rd) -> [1, 3, 5]
        assigned[indexed[0].origIndex] = 1;
        assigned[indexed[1].origIndex] = 3;
        assigned[indexed[2].origIndex] = 5;
      }
    } else {
      if (lowerInterval >= 5 && upperInterval <= 4) {
        // 2nd inversion (e.g. G-C-E, 4th + 3rd) -> [5, 2, 1]
        assigned[indexed[0].origIndex] = 5;
        assigned[indexed[1].origIndex] = 2;
        assigned[indexed[2].origIndex] = 1;
      } else {
        // Root position (e.g. C-E-G) -> [5, 3, 1]
        assigned[indexed[0].origIndex] = 5;
        assigned[indexed[1].origIndex] = 3;
        assigned[indexed[2].origIndex] = 1;
      }
    }
    return assigned;
  }

  // 4+ notes: sequential distribution
  if (hand === 'RH') {
    indexed.forEach((item, idx) => {
      assigned[item.origIndex] = Math.min(5, Math.max(1, idx + 1));
    });
  } else {
    indexed.forEach((item, idx) => {
      assigned[item.origIndex] = Math.min(5, Math.max(1, 5 - idx));
    });
  }

  return assigned;
}
