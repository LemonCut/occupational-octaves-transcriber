import { describe, it, expect } from 'vitest';
import { getFingerColor, resolveFingerings } from '../../src/core/fingering.js';

describe('Fingering Resolver', () => {
  it('maps finger numbers 1-5 to exact ring colors for LH (red thumb) and RH (pink thumb)', () => {
    expect(getFingerColor(1, 'LH')).toBe('#D32F2F'); // Red for Left Hand thumb
    expect(getFingerColor(1, 'RH')).toBe('#EC407A'); // Pink for Right Hand thumb
    expect(getFingerColor(2, 'LH')).toBe('#2E7D32'); // Green
    expect(getFingerColor(2, 'RH')).toBe('#2E7D32'); // Green
    expect(getFingerColor(3)).toBe('#FB8C00'); // Orange
    expect(getFingerColor(4)).toBe('#1976D2'); // Blue
    expect(getFingerColor(5)).toBe('#7B1FA2'); // Purple
  });

  it('uses explicit fingering when supplied', () => {
    const fingers = resolveFingerings(['C4', 'E4'], 'RH', [1, 3]);
    expect(fingers).toEqual([1, 3]);
  });

  it('assigns C-home position fingerings for single notes', () => {
    // RH C-position ascending: C=1 (Pink), D=2 (Green), E=3 (Orange), F=4 (Blue), G=5 (Purple)
    expect(resolveFingerings(['C4'], 'RH')).toEqual([1]);
    expect(resolveFingerings(['D4'], 'RH')).toEqual([2]);
    expect(resolveFingerings(['E4'], 'RH')).toEqual([3]);
    expect(resolveFingerings(['F4'], 'RH')).toEqual([4]);
    expect(resolveFingerings(['G4'], 'RH')).toEqual([5]);

    // LH C-position descending: C=1 (Red), B=2 (Green), A=3 (Orange), G=4 (Blue), F=5 (Purple)
    expect(resolveFingerings(['C4'], 'LH')).toEqual([1]);
    expect(resolveFingerings(['B3'], 'LH')).toEqual([2]);
    expect(resolveFingerings(['A3'], 'LH')).toEqual([3]);
    expect(resolveFingerings(['G3'], 'LH')).toEqual([4]);
    expect(resolveFingerings(['F3'], 'LH')).toEqual([5]);
  });

  it('assigns interval-aware fingering for dyads without explicit fingers', () => {
    // Thirds (B-D, C-E) -> [1, 3] for RH, [3, 1] for LH
    expect(resolveFingerings(['B4', 'D5'], 'RH')).toEqual([1, 3]);
    expect(resolveFingerings(['C4', 'E4'], 'RH')).toEqual([1, 3]);
    expect(resolveFingerings(['A3', 'C4'], 'LH')).toEqual([3, 1]);

    // Seconds (C-D) -> [1, 2]
    expect(resolveFingerings(['C4', 'D4'], 'RH')).toEqual([1, 2]);

    // Fifths and Octaves -> [1, 5] for RH, [5, 1] for LH
    expect(resolveFingerings(['C4', 'G4'], 'RH')).toEqual([1, 5]);
    expect(resolveFingerings(['C3', 'G3'], 'LH')).toEqual([5, 1]);
    expect(resolveFingerings(['C4', 'C5'], 'RH')).toEqual([1, 5]);
  });

  it('assigns natural root position fingering for triads (RH 1-3-5, LH 5-3-1)', () => {
    expect(resolveFingerings(['C4', 'E4', 'G4'], 'RH')).toEqual([1, 3, 5]);
    expect(resolveFingerings(['C3', 'E3', 'G3'], 'LH')).toEqual([5, 3, 1]);
  });
});
