# Occupational Octaves Transcriber Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript-based Occupational Octaves transcriber engine that converts measure-based score JSON into publication-grade vector PDF scores and interactive browser SVG previews.

**Architecture:** A pure TypeScript pipeline composed of:
1. Type definitions for measure-based musical input and visual grid layout.
2. Pitch, octave, and accidental mappers translating scientific pitch (`C4`, `F#3`, `Bb5`) into OO letters and diacritics.
3. Fingering resolver mapping fingerings to the 5 ring colors with ergonomic heuristic fallbacks.
4. Multi-note layout engine positioning chords in staggered arrangements (2-note: bottom-left/top-right; 3-note: bottom-right/center-left/top-right).
5. Grid quantizer packing measures into 8-box systems and 4-system pages with sustain arrow (`→`) propagation.
6. Dual renderers: browser SVG component and `pdf-lib` vector PDF generator.

**Tech Stack:** TypeScript, Node.js, `pdf-lib`, Vitest.

**Spec:** [2026-09-20-occupational-octaves-transcriber-design.md](file:///Users/choconnor/Projects/occupational-octaves-transcriber/docs/superpowers/specs/2026-09-20-occupational-octaves-transcriber-design.md)

## Global Constraints
- Pure TypeScript / JavaScript with zero native C or canvas bindings, guaranteeing 100% portability in both browser and Node.js.
- Layout geometry strictly conforms to 8 boxes per system and 4 systems per page.
- Exact finger color hex codes: Finger 1 (Red: `#D32F2F`), Finger 2 (Green: `#2E7D32`), Finger 3 (Orange: `#FB8C00`), Finger 4 (Blue: `#1976D2`), Finger 5 (Purple: `#7B1FA2`), RH Accent (Pink: `#EC407A`).
- Multi-note layout in half-cells: 1 note centered; 2 notes: bottom-left and top-right; 3 notes: bottom-right, center-left, top-right.
- Headers and footers are omitted for this initial transcriber milestone.

## Review Focus
- Floating-point beat offsets with minute rounding errors snap cleanly to cell boundaries.
- Enharmonic accidentals (`#` vs `b`) map to proper sharp dots (top-right) vs flat dots (top-left).
- Sustain arrows (`→`) accurately track across system and page boundaries when a long-held note spans multiple systems.
- 3-note simultaneous chords render cleanly within cell boundaries without diacritic collisions.
- Empty beats/measures render as crisp, unpolluted blank boxes.

---

### Task 1: Project Scaffolding & Build Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: TypeScript compile toolchain and Vitest automated test runner.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "occupational-octaves-transcriber",
  "version": "0.1.0",
  "description": "Occupational Octaves notation transcriber and PDF generator",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "pdf-lib": "^1.17.1"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
});
```

- [ ] **Step 4: Install dependencies and verify environment**

Run: `npm install && npx vitest --version`  
Expected: Clean install and vitest prints version without errors.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts package-lock.json
git commit -m "chore: initialize project scaffolding with typescript and vitest"
```

---

### Task 2: Core Data Types

**Files:**
- Create: `src/types/score.ts`
- Create: `src/types/layout.ts`
- Test: `tests/types/types.test.ts`

**Interfaces:**
- Produces: `Score`, `Measure`, `NoteEvent`, `ScientificPitch`, `Page`, `System`, `GridCell`, `Glyph`, `AccidentalDot`, `OctaveMarker`.

- [ ] **Step 1: Write type contract test**

```typescript
// tests/types/types.test.ts
import { describe, it, expect } from 'vitest';
import { Score } from '../../src/types/score.js';
import { Page, GridCell } from '../../src/types/layout.js';

describe('Data Contracts', () => {
  it('should instantiate a valid score object', () => {
    const score: Score = {
      metadata: { timeSignature: [4, 4], title: 'Test' },
      measures: [
        {
          number: 1,
          rightHand: [{ offset: 0, duration: 1, notes: ['C4'], fingers: [1] }],
          leftHand: []
        }
      ]
    };
    expect(score.measures).toHaveLength(1);
    expect(score.measures[0].rightHand[0].notes[0]).toBe('C4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/types/types.test.ts`  
Expected: FAIL (Cannot find module `../../src/types/score.js`).

- [ ] **Step 3: Implement `src/types/score.ts` and `src/types/layout.ts`**

```typescript
// src/types/score.ts
export type ScientificPitch = string; // e.g. "C4", "F#4", "Bb3"

export interface NoteEvent {
  offset: number;
  duration: number;
  notes: ScientificPitch[];
  fingers?: number[];
}

export interface Measure {
  number: number;
  timeSignature?: [number, number];
  rightHand: NoteEvent[];
  leftHand: NoteEvent[];
}

export interface ScoreMetadata {
  title?: string;
  composer?: string;
  arranger?: string;
  transcriber?: string;
  timeSignature: [number, number];
  keySignature?: string;
  baseSubdivision?: number;
}

export interface Score {
  metadata: ScoreMetadata;
  measures: Measure[];
}
```

```typescript
// src/types/layout.ts
export type FingerColor = '#D32F2F' | '#2E7D32' | '#FB8C00' | '#1976D2' | '#7B1FA2' | '#EC407A';

export type OctaveMarker = 'none' | 'triangle' | 'square' | 'star' | 'plus' | 'checkmark';
export type AccidentalDot = 'none' | 'sharp' | 'flat';

export type GlyphPosition = 'center' | 'bottom-left' | 'top-right' | 'bottom-right' | 'center-left';

export interface NoteGlyph {
  kind: 'note';
  letter: string;
  octaveMarker: OctaveMarker;
  accidental: AccidentalDot;
  color: FingerColor;
  finger: number;
  position: GlyphPosition;
}

export interface ArrowGlyph {
  kind: 'arrow';
  color: FingerColor;
  verticalSlot: number; // 0 = top, 1 = mid, 2 = bottom
}

export type CellGlyph = NoteGlyph | ArrowGlyph;

export interface HandCell {
  glyphs: CellGlyph[];
}

export interface GridCell {
  measureNumber: number;
  cellIndexInSystem: number;
  rightHand: HandCell;
  leftHand: HandCell;
}

export interface System {
  systemIndex: number;
  cells: GridCell[]; // Exactly 8 cells
}

export interface Page {
  pageNumber: number;
  systems: System[]; // Up to 4 systems
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/types/types.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/ tests/types/
git commit -m "feat(types): define score schema and layout data contracts"
```

---

### Task 3: Pitch, Octave & Accidental Mapper

**Files:**
- Create: `src/core/pitch-mapper.ts`
- Test: `tests/core/pitch-mapper.test.ts`

**Interfaces:**
- Produces: `parseScientificPitch(pitch: ScientificPitch): { letter: string; octaveMarker: OctaveMarker; accidental: AccidentalDot }`

- [ ] **Step 1: Write failing tests for pitch mapper**

```typescript
// tests/core/pitch-mapper.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/pitch-mapper.test.ts`  
Expected: FAIL (Cannot find module `../../src/core/pitch-mapper.js`).

- [ ] **Step 3: Implement `src/core/pitch-mapper.ts`**

```typescript
// src/core/pitch-mapper.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/pitch-mapper.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/pitch-mapper.ts tests/core/pitch-mapper.test.ts
git commit -m "feat(core): implement scientific pitch to OO notation mapper"
```

---

### Task 4: Fingering Resolver & Color Mapping

**Files:**
- Create: `src/core/fingering.ts`
- Test: `tests/core/fingering.test.ts`

**Interfaces:**
- Produces: `getFingerColor(finger: number): FingerColor`
- Produces: `resolveFingerings(notes: ScientificPitch[], hand: 'RH' | 'LH', explicitFingers?: number[]): number[]`

- [ ] **Step 1: Write failing tests for fingering resolver**

```typescript
// tests/core/fingering.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/fingering.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/fingering.ts`**

```typescript
// src/core/fingering.ts
import { ScientificPitch } from '../types/score.js';
import { FingerColor } from '../types/layout.js';

const FINGER_COLORS: Record<number, FingerColor> = {
  1: '#D32F2F', // Red (Thumb)
  2: '#2E7D32', // Green (Index)
  3: '#FB8C00', // Orange (Middle)
  4: '#1976D2', // Blue (Ring)
  5: '#7B1FA2'  // Purple (Pinky)
};

export function getFingerColor(finger: number): FingerColor {
  return FINGER_COLORS[finger] || '#D32F2F';
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
    return hand === 'RH' ? [1] : [1];
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/fingering.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/fingering.ts tests/core/fingering.test.ts
git commit -m "feat(core): implement fingering resolution and color mapping"
```

---

### Task 5: Multi-Note Half-Cell Layout Engine

**Files:**
- Create: `src/core/layout-engine.ts`
- Test: `tests/core/layout-engine.test.ts`

**Interfaces:**
- Produces: `layoutHandCell(notes: ScientificPitch[], fingers: number[]): NoteGlyph[]`

- [ ] **Step 1: Write failing tests for layout engine**

```typescript
// tests/core/layout-engine.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/layout-engine.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/layout-engine.ts`**

```typescript
// src/core/layout-engine.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/layout-engine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/layout-engine.ts tests/core/layout-engine.test.ts
git commit -m "feat(core): implement multi-note chord layout positioning"
```

---

### Task 6: Grid Quantizer, System Packing & Sustain Propagation

**Files:**
- Create: `src/core/grid-allocator.ts`
- Test: `tests/core/grid-allocator.test.ts`

**Interfaces:**
- Produces: `allocateScore(score: Score): Page[]`

- [ ] **Step 1: Write failing tests for grid allocator**

```typescript
// tests/core/grid-allocator.test.ts
import { describe, it, expect } from 'vitest';
import { allocateScore } from '../../src/core/grid-allocator.js';
import { Score } from '../../src/types/score.js';

describe('Grid Allocator', () => {
  it('allocates 1 measure in 4/4 with 8th notes to 1 system with 8 cells', () => {
    const score: Score = {
      metadata: { timeSignature: [4, 4] },
      measures: [
        {
          number: 1,
          rightHand: [
            { offset: 0.0, duration: 1.0, notes: ['E4'], fingers: [1] } // spans 2 cells
          ],
          leftHand: [
            { offset: 0.0, duration: 0.5, notes: ['C3'], fingers: [5] }
          ]
        }
      ]
    };

    const pages = allocateScore(score);
    expect(pages).toHaveLength(1);
    expect(pages[0].systems).toHaveLength(1);
    expect(pages[0].systems[0].cells).toHaveLength(8);

    // Cell 0: note in RH, note in LH
    const cell0 = pages[0].systems[0].cells[0];
    expect(cell0.rightHand.glyphs[0].kind).toBe('note');
    expect(cell0.leftHand.glyphs[0].kind).toBe('note');

    // Cell 1: sustain arrow in RH, empty in LH
    const cell1 = pages[0].systems[0].cells[1];
    expect(cell1.rightHand.glyphs[0].kind).toBe('arrow');
    expect(cell1.leftHand.glyphs).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/grid-allocator.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/grid-allocator.ts`**

```typescript
// src/core/grid-allocator.ts
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
        const noteGlyphs = layoutHandCell(ev.notes, fingers);

        if (startCell < cellsPerMeasure) {
          slots[startCell].push(...noteGlyphs);
        }

        // Add sustain arrows in subsequent cells
        for (let s = 1; s < span && startCell + s < cellsPerMeasure; s++) {
          for (let n = 0; n < ev.notes.length; n++) {
            const color = getFingerColor(fingers[n]);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/grid-allocator.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/grid-allocator.ts tests/core/grid-allocator.test.ts
git commit -m "feat(core): implement grid allocation and sustain propagation"
```

---

### Task 7: SVG Browser Preview Renderer

**Files:**
- Create: `src/renderers/svg-renderer.ts`
- Test: `tests/renderers/svg-renderer.test.ts`

**Interfaces:**
- Produces: `renderPageToSvg(page: Page): string`

- [ ] **Step 1: Write failing test for SVG renderer**

```typescript
// tests/renderers/svg-renderer.test.ts
import { describe, it, expect } from 'vitest';
import { renderPageToSvg } from '../../src/renderers/svg-renderer.js';
import { Page } from '../../src/types/layout.js';

describe('SVG Renderer', () => {
  it('renders an SVG with 4 system grids and note glyphs', () => {
    const dummyPage: Page = {
      pageNumber: 1,
      systems: [
        {
          systemIndex: 0,
          cells: Array.from({ length: 8 }, (_, i) => ({
            measureNumber: 1,
            cellIndexInSystem: i,
            rightHand: {
              glyphs: i === 0 ? [{
                kind: 'note',
                letter: 'E',
                octaveMarker: 'none',
                accidental: 'none',
                color: '#2E7D32',
                finger: 2,
                position: 'center'
              }] : []
            },
            leftHand: { glyphs: [] }
          }))
        }
      ]
    };

    const svg = renderPageToSvg(dummyPage);
    expect(svg).toContain('<svg');
    expect(svg).toContain('fill="#2E7D32"');
    expect(svg).toContain('>E<');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/renderers/svg-renderer.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/renderers/svg-renderer.ts`**

```typescript
// src/renderers/svg-renderer.ts
import { Page, GridCell, CellGlyph } from '../types/layout.js';

export function renderPageToSvg(page: Page): string {
  const width = 800;
  const height = 1050;
  const margin = 40;
  const systemHeight = 160;
  const systemGap = 40;
  const colWidth = (width - 2 * margin) / 8;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `<rect width="${width}" height="${height}" fill="#ffffff"/>\n`;

  page.systems.forEach((system, sysIdx) => {
    const yTop = margin + sysIdx * (systemHeight + systemGap);

    // System outer box
    svg += `<rect x="${margin}" y="${yTop}" width="${width - 2 * margin}" height="${systemHeight}" fill="none" stroke="#000000" stroke-width="1.5"/>\n`;
    // Middle horizontal dividing line between RH and LH
    svg += `<line x1="${margin}" y1="${yTop + systemHeight / 2}" x2="${width - margin}" y2="${yTop + systemHeight / 2}" stroke="#000000" stroke-width="1"/>\n`;

    system.cells.forEach((cell, cellIdx) => {
      const xLeft = margin + cellIdx * colWidth;
      // Vertical cell divider
      if (cellIdx > 0) {
        svg += `<line x1="${xLeft}" y1="${yTop}" x2="${xLeft}" y2="${yTop + systemHeight}" stroke="#000000" stroke-width="1"/>\n`;
      }

      // Render RH glyphs (top half)
      svg += renderGlyphs(cell.rightHand.glyphs, xLeft, yTop, colWidth, systemHeight / 2);
      // Render LH glyphs (bottom half)
      svg += renderGlyphs(cell.leftHand.glyphs, xLeft, yTop + systemHeight / 2, colWidth, systemHeight / 2);
    });
  });

  svg += `</svg>`;
  return svg;
}

function renderGlyphs(glyphs: CellGlyph[], x: number, y: number, w: number, h: number): string {
  let out = '';
  for (const g of glyphs) {
    if (g.kind === 'arrow') {
      const arrowY = y + h / 2;
      out += `<path d="M ${x + 15} ${arrowY} L ${x + w - 15} ${arrowY} M ${x + w - 25} ${arrowY - 6} L ${x + w - 15} ${arrowY} L ${x + w - 25} ${arrowY + 6}" stroke="${g.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n`;
    } else if (g.kind === 'note') {
      let gx = x + w / 2;
      let gy = y + h / 2 + 10;
      let fontSize = 28;

      if (g.position === 'bottom-left') {
        gx = x + w * 0.35;
        gy = y + h * 0.75;
        fontSize = 20;
      } else if (g.position === 'top-right') {
        gx = x + w * 0.65;
        gy = y + h * 0.4;
        fontSize = 20;
      } else if (g.position === 'bottom-right') {
        gx = x + w * 0.7;
        gy = y + h * 0.75;
        fontSize = 18;
      } else if (g.position === 'center-left') {
        gx = x + w * 0.3;
        gy = y + h * 0.55;
        fontSize = 18;
      }

      // Note Letter
      out += `<text x="${gx}" y="${gy}" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${g.color}" text-anchor="middle">${g.letter}</text>\n`;

      // Octave diacritic
      if (g.octaveMarker === 'star') {
        out += `<text x="${gx}" y="${gy - fontSize + 4}" font-size="14" fill="${g.color}" text-anchor="middle">*</text>\n`;
      } else if (g.octaveMarker === 'square') {
        out += `<rect x="${gx - 3.5}" y="${gy - fontSize + 2}" width="7" height="7" fill="${g.color}"/>\n`;
      } else if (g.octaveMarker === 'plus') {
        out += `<text x="${gx}" y="${gy - fontSize + 4}" font-size="14" fill="${g.color}" text-anchor="middle">+</text>\n`;
      }

      // Accidental dot
      if (g.accidental === 'sharp') {
        out += `<circle cx="${gx + fontSize * 0.35}" cy="${gy - fontSize * 0.75}" r="3.5" fill="#000000"/>\n`;
      } else if (g.accidental === 'flat') {
        out += `<circle cx="${gx - fontSize * 0.35}" cy="${gy - fontSize * 0.75}" r="3.5" fill="#000000"/>\n`;
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/renderers/svg-renderer.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderers/svg-renderer.ts tests/renderers/svg-renderer.test.ts
git commit -m "feat(renderers): implement browser SVG preview renderer"
```

---

### Task 8: Vector PDF Generator (`pdf-lib`)

**Files:**
- Create: `src/renderers/pdf-renderer.ts`
- Test: `tests/renderers/pdf-renderer.test.ts`

**Interfaces:**
- Produces: `renderPagesToPdf(pages: Page[]): Promise<Uint8Array>`

- [ ] **Step 1: Write failing test for PDF generator**

```typescript
// tests/renderers/pdf-renderer.test.ts
import { describe, it, expect } from 'vitest';
import { renderPagesToPdf } from '../../src/renderers/pdf-renderer.js';
import { Page } from '../../src/types/layout.js';

describe('PDF Renderer', () => {
  it('generates a valid PDF byte buffer', async () => {
    const dummyPage: Page = {
      pageNumber: 1,
      systems: [
        {
          systemIndex: 0,
          cells: Array.from({ length: 8 }, (_, i) => ({
            measureNumber: 1,
            cellIndexInSystem: i,
            rightHand: {
              glyphs: i === 0 ? [{
                kind: 'note',
                letter: 'E',
                octaveMarker: 'none',
                accidental: 'none',
                color: '#2E7D32',
                finger: 2,
                position: 'center'
              }] : []
            },
            leftHand: { glyphs: [] }
          }))
        }
      ]
    };

    const pdfBytes = await renderPagesToPdf([dummyPage]);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500); // Valid PDF header and content
    // PDF Magic bytes check: %PDF-
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/renderers/pdf-renderer.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/renderers/pdf-renderer.ts`**

```typescript
// src/renderers/pdf-renderer.ts
import { PDFDocument, rgb, StandardFonts, RGB } from 'pdf-lib';
import { Page, FingerColor, CellGlyph } from '../types/layout.js';

function hexToRgb(hex: FingerColor): RGB {
  const num = parseInt(hex.replace('#', ''), 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

export async function renderPagesToPdf(pages: Page[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 612; // Letter
  const pageHeight = 792;
  const margin = 36;
  const systemHeight = 120;
  const systemGap = 30;
  const colWidth = (pageWidth - 2 * margin) / 8;

  for (const pageModel of pages) {
    const pdfPage = doc.addPage([pageWidth, pageHeight]);

    pageModel.systems.forEach((system, sysIdx) => {
      const yTop = pageHeight - margin - (sysIdx + 1) * systemHeight - sysIdx * systemGap;

      // Outer system box
      pdfPage.drawRectangle({
        x: margin,
        y: yTop,
        width: pageWidth - 2 * margin,
        height: systemHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5
      });

      // Horizontal line dividing RH & LH
      pdfPage.drawLine({
        start: { x: margin, y: yTop + systemHeight / 2 },
        end: { x: pageWidth - margin, y: yTop + systemHeight / 2 },
        color: rgb(0, 0, 0),
        thickness: 1
      });

      system.cells.forEach((cell, cellIdx) => {
        const xLeft = margin + cellIdx * colWidth;

        // Vertical divider
        if (cellIdx > 0) {
          pdfPage.drawLine({
            start: { x: xLeft, y: yTop },
            end: { x: xLeft, y: yTop + systemHeight },
            color: rgb(0, 0, 0),
            thickness: 1
          });
        }

        // Render RH (upper half: yTop + systemHeight/2 to yTop + systemHeight)
        renderCellHalf(cell.rightHand.glyphs, xLeft, yTop + systemHeight / 2, colWidth, systemHeight / 2, pdfPage, fontBold, fontRegular);
        // Render LH (lower half: yTop to yTop + systemHeight/2)
        renderCellHalf(cell.leftHand.glyphs, xLeft, yTop, colWidth, systemHeight / 2, pdfPage, fontBold, fontRegular);
      });
    });
  }

  return await doc.save();
}

function renderCellHalf(
  glyphs: CellGlyph[],
  x: number,
  y: number,
  w: number,
  h: number,
  pdfPage: any,
  fontBold: any,
  fontRegular: any
) {
  for (const g of glyphs) {
    const color = hexToRgb(g.color);

    if (g.kind === 'arrow') {
      const arrowY = y + h / 2;
      pdfPage.drawLine({
        start: { x: x + 10, y: arrowY },
        end: { x: x + w - 10, y: arrowY },
        color,
        thickness: 2.5
      });
      // Arrowhead
      pdfPage.drawLine({
        start: { x: x + w - 18, y: arrowY + 4 },
        end: { x: x + w - 10, y: arrowY },
        color,
        thickness: 2.5
      });
      pdfPage.drawLine({
        start: { x: x + w - 18, y: arrowY - 4 },
        end: { x: x + w - 10, y: arrowY },
        color,
        thickness: 2.5
      });
    } else if (g.kind === 'note') {
      let gx = x + w / 2;
      let gy = y + h / 2 - 8;
      let fontSize = 24;

      if (g.position === 'bottom-left') {
        gx = x + w * 0.35;
        gy = y + h * 0.25;
        fontSize = 17;
      } else if (g.position === 'top-right') {
        gx = x + w * 0.65;
        gy = y + h * 0.6;
        fontSize = 17;
      } else if (g.position === 'bottom-right') {
        gx = x + w * 0.7;
        gy = y + h * 0.25;
        fontSize = 15;
      } else if (g.position === 'center-left') {
        gx = x + w * 0.3;
        gy = y + h * 0.45;
        fontSize = 15;
      }

      const letterWidth = fontBold.widthOfTextAtSize(g.letter, fontSize);
      pdfPage.drawText(g.letter, {
        x: gx - letterWidth / 2,
        y: gy,
        size: fontSize,
        font: fontBold,
        color
      });

      // Octave diacritic
      if (g.octaveMarker === 'star') {
        pdfPage.drawText('*', {
          x: gx - 3,
          y: gy + fontSize - 2,
          size: 14,
          font: fontRegular,
          color
        });
      } else if (g.octaveMarker === 'square') {
        pdfPage.drawRectangle({
          x: gx - 3,
          y: gy + fontSize,
          width: 6,
          height: 6,
          color
        });
      } else if (g.octaveMarker === 'plus') {
        pdfPage.drawText('+', {
          x: gx - 4,
          y: gy + fontSize - 2,
          size: 14,
          font: fontRegular,
          color
        });
      }

      // Accidental dot
      if (g.accidental === 'sharp') {
        pdfPage.drawCircle({
          x: gx + letterWidth / 2 + 5,
          y: gy + fontSize * 0.75,
          size: 2.5,
          color: rgb(0, 0, 0)
        });
      } else if (g.accidental === 'flat') {
        pdfPage.drawCircle({
          x: gx - letterWidth / 2 - 5,
          y: gy + fontSize * 0.75,
          size: 2.5,
          color: rgb(0, 0, 0)
        });
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/renderers/pdf-renderer.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderers/pdf-renderer.ts tests/renderers/pdf-renderer.test.ts
git commit -m "feat(renderers): implement vector PDF generator using pdf-lib"
```

---

### Task 9: Integration Fixture Test & Package Entry Point

**Files:**
- Create: `src/index.ts`
- Create: `tests/integration/chopin-prelude.test.ts`

**Interfaces:**
- Produces: Complete library export: `transcribeScoreToPdf(score: Score): Promise<Uint8Array>`, `transcribeScoreToSvg(score: Score): string[]`.

- [ ] **Step 1: Write integration test for Chopin Prelude Op. 28, No. 3**

```typescript
// tests/integration/chopin-prelude.test.ts
import { describe, it, expect } from 'vitest';
import { transcribeScoreToPdf, transcribeScoreToSvg } from '../../src/index.js';
import { Score } from '../../src/types/score.js';

describe('Chopin Prelude Op. 28, No. 3 Integration', () => {
  it('transcribes opening measures to both SVG and PDF accurately', async () => {
    const chopinPreludeM1: Score = {
      metadata: {
        title: 'Prelude, Op. 28, No. 3',
        composer: 'Frederik Chopin',
        timeSignature: [4, 4]
      },
      measures: [
        {
          number: 1,
          rightHand: [],
          leftHand: [
            { offset: 0.0, duration: 0.5, notes: ['G2'], fingers: [5] },
            { offset: 0.5, duration: 0.5, notes: ['B2'], fingers: [4] },
            { offset: 1.0, duration: 0.5, notes: ['G3'], fingers: [1] },
            { offset: 1.5, duration: 0.5, notes: ['A3'], fingers: [3] },
            { offset: 2.0, duration: 0.5, notes: ['B3'], fingers: [4] },
            { offset: 2.5, duration: 0.5, notes: ['A3'], fingers: [3] },
            { offset: 3.0, duration: 0.5, notes: ['G3'], fingers: [5] },
            { offset: 3.5, duration: 0.5, notes: ['E4'], fingers: [1] }
          ]
        }
      ]
    };

    const svgs = transcribeScoreToSvg(chopinPreludeM1);
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toContain('>G<');
    expect(svgs[0]).toContain('>B<');

    const pdfBuffer = await transcribeScoreToPdf(chopinPreludeM1);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/chopin-prelude.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `src/index.ts`**

```typescript
// src/index.ts
export * from './types/score.js';
export * from './types/layout.js';
export * from './core/pitch-mapper.js';
export * from './core/fingering.js';
export * from './core/layout-engine.js';
export * from './core/grid-allocator.js';
export * from './renderers/svg-renderer.js';
export * from './renderers/pdf-renderer.js';

import { Score } from './types/score.js';
import { allocateScore } from './core/grid-allocator.js';
import { renderPageToSvg } from './renderers/svg-renderer.js';
import { renderPagesToPdf } from './renderers/pdf-renderer.js';

export function transcribeScoreToSvg(score: Score): string[] {
  const pages = allocateScore(score);
  return pages.map(renderPageToSvg);
}

export async function transcribeScoreToPdf(score: Score): Promise<Uint8Array> {
  const pages = allocateScore(score);
  return await renderPagesToPdf(pages);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run`  
Expected: All tests pass across the entire test suite.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/integration/chopin-prelude.test.ts
git commit -m "feat: implement public transcription API and Chopin prelude integration tests"
```
