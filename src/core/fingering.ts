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

export function resolveFingerings(
  notes: ScientificPitch[],
  hand: 'RH' | 'LH',
  explicitFingers?: number[]
): number[] {
  if (explicitFingers && explicitFingers.length === notes.length) {
    return [...explicitFingers];
  }

  if (notes.length === 1) {
    return [1];
  }

  // Sort indices by pitch
  const indexed = notes.map((p, i) => ({ pitch: p, midi: pitchToMidi(p), origIndex: i }));
  indexed.sort((a, b) => a.midi - b.midi);

  const assigned = new Array<number>(notes.length);
  if (hand === 'RH') {
    // RH: lowest note = thumb (1), highest = pinky (5)
    if (indexed.length === 2) {
      assigned[indexed[0].origIndex] = 1;
      assigned[indexed[1].origIndex] = 5;
    } else if (indexed.length === 3) {
      assigned[indexed[0].origIndex] = 1;
      assigned[indexed[1].origIndex] = 3;
      assigned[indexed[2].origIndex] = 5;
    } else {
      indexed.forEach((item, idx) => {
        assigned[item.origIndex] = Math.min(5, Math.max(1, idx + 1));
      });
    }
  } else {
    // LH: lowest note = pinky (5), highest = thumb (1)
    if (indexed.length === 2) {
      assigned[indexed[0].origIndex] = 5;
      assigned[indexed[1].origIndex] = 1;
    } else if (indexed.length === 3) {
      assigned[indexed[0].origIndex] = 5;
      assigned[indexed[1].origIndex] = 3;
      assigned[indexed[2].origIndex] = 1;
    } else {
      indexed.forEach((item, idx) => {
        assigned[item.origIndex] = Math.min(5, Math.max(1, 5 - idx));
      });
    }
  }

  return assigned;
}
