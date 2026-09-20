import { describe, it, expect } from 'vitest';
import { parseScientificPitch } from '../../src/core/pitch-mapper.js';

describe('Pitch Mapper', () => {
  it('maps white keys in middle register', () => {
    const c4 = parseScientificPitch('C4');
    expect(c4.letter).toBe('C');
    expect(c4.octaveMarker).toBe('none');
    expect(c4.accidental).toBe('none');
  });

  it('maps sharp accidental to top-right dot', () => {
    const fs4 = parseScientificPitch('F#4');
    expect(fs4.letter).toBe('F');
    expect(fs4.accidental).toBe('sharp');
  });

  it('maps flat accidental to top-left dot', () => {
    const bb3 = parseScientificPitch('Bb3');
    expect(bb3.letter).toBe('B');
    expect(bb3.accidental).toBe('flat');
  });

  it('maps bass octave 1-2 to square marker', () => {
    const g1 = parseScientificPitch('G1');
    expect(g1.octaveMarker).toBe('square');
  });

  it('maps high register 5 to star marker', () => {
    const e5 = parseScientificPitch('E5');
    expect(e5.octaveMarker).toBe('star');
  });

  it('maps high register 6 to plus marker', () => {
    const c6 = parseScientificPitch('C6');
    expect(c6.octaveMarker).toBe('plus');
  });

  it('maps sub-contra register 0 to triangle marker', () => {
    const a0 = parseScientificPitch('A0');
    expect(a0.octaveMarker).toBe('triangle');
  });
});
