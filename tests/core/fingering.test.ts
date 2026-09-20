import { describe, it, expect } from 'vitest';
import { getFingerColor, resolveFingerings } from '../../src/core/fingering.js';

describe('Fingering Resolver', () => {
  it('maps finger numbers 1-5 to exact ring colors', () => {
    expect(getFingerColor(1)).toBe('#D32F2F'); // Red
    expect(getFingerColor(2)).toBe('#2E7D32'); // Green
    expect(getFingerColor(3)).toBe('#FB8C00'); // Orange
    expect(getFingerColor(4)).toBe('#1976D2'); // Blue
    expect(getFingerColor(5)).toBe('#7B1FA2'); // Purple
  });

  it('uses explicit fingering when supplied', () => {
    const fingers = resolveFingerings(['C4', 'E4'], 'RH', [1, 3]);
    expect(fingers).toEqual([1, 3]);
  });

  it('assigns heuristic fingering for ascending RH notes', () => {
    const fingers = resolveFingerings(['C4', 'E4', 'G4'], 'RH');
    expect(fingers[0]).toBeLessThan(fingers[1]);
    expect(fingers[1]).toBeLessThan(fingers[2]);
  });

  it('assigns heuristic fingering for ascending LH notes (higher pitch = lower finger number)', () => {
    const fingers = resolveFingerings(['C3', 'G3'], 'LH');
    expect(fingers[0]).toBe(5); // Low note -> pinky
    expect(fingers[1]).toBe(1); // High note -> thumb
  });
});
