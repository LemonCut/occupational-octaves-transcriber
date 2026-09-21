import { ScientificPitch } from '../types/score.js';
import { OctaveMarker, AccidentalDot } from '../types/layout.js';

export interface ParsedPitch {
  letter: string;
  octaveMarker: OctaveMarker;
  accidental: AccidentalDot;
  rawOctave: number;
}

export function parseScientificPitch(pitch: ScientificPitch): ParsedPitch {
  const match = pitch.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid scientific pitch notation: "${pitch}"`);
  }

  const [, rawLetter, acc, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const letter = rawLetter.toUpperCase();

  let accidental: AccidentalDot = 'none';
  if (acc === '#') accidental = 'sharp';
  else if (acc === 'b') accidental = 'flat';

  let octaveMarker: OctaveMarker = 'none';
  if (octave <= 0) {
    octaveMarker = 'triangle';
  } else if (octave === 1 || octave === 2) {
    octaveMarker = 'square';
  } else if (octave === 3 || octave === 4) {
    octaveMarker = 'none';
  } else if (octave === 5) {
    octaveMarker = 'star';
  } else if (octave === 6) {
    octaveMarker = 'plus';
  } else if (octave >= 7) {
    octaveMarker = 'checkmark';
  }

  return { letter, octaveMarker, accidental, rawOctave: octave };
}

export function pitchToMidi(pitch: ScientificPitch): number {
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
