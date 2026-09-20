# Occupational Octaves Transcriber (Sub-Project 1) Design Specification

## 1. Overview & Objectives
The goal of this project is to build an **Occupational Octaves (OO) Transcriber** in TypeScript. 
The transcriber takes an intermediate, measure-based score JSON (designed for ease of conversion from sheet music / MusicXML) and renders publication-quality PDF scores conforming to the official Occupational Octaves piano notation standard (Lee D. Stockner method).

Sub-Project 1 focuses strictly on:
1. Standardizing the intermediate measure-based score data format.
2. The core transcriber engine (grid allocation, pitch/octave/accidental mapping, fingering heuristics, sustain arrow propagation, multi-note glyph layouts).
3. Vector PDF generation via `pdf-lib` and interactive browser/SVG rendering preview.
*(Sheet music ingestion, OCR/OMR, and LLM simplification pipelines belong to Sub-Project 2).*

---

## 2. Data Schema: Intermediate Measure Model

The input format represents standard musical time (measures, beats, pitches, and durations) rather than fixed page visual coordinates, allowing automatic cell division and pagination.

```typescript
export type ScientificPitch = string; // e.g. "C4", "F#4", "Bb3", "G1", "C8"

export interface NoteEvent {
  offset: number;     // Start beat within the measure (e.g. 0.0, 0.5, 1.0)
  duration: number;   // Duration in beats (e.g. 0.5 = 8th note, 1.0 = quarter note)
  notes: ScientificPitch[]; // One or more pitches sounding simultaneously
  fingers?: number[]; // Optional explicit finger assignments (1 to 5) per note
}

export interface Measure {
  number: number;
  timeSignature?: [number, number]; // Defaults to score metadata if omitted
  rightHand: NoteEvent[];
  leftHand: NoteEvent[];
}

export interface ScoreMetadata {
  title?: string;
  composer?: string;
  arranger?: string;
  transcriber?: string;
  timeSignature: [number, number]; // e.g. [4, 4] or [3, 4]
  keySignature?: string;           // e.g. "G", "Db"
  baseSubdivision?: number;        // Optional override: beat length of 1 cell (e.g. 0.5)
}

export interface Score {
  metadata: ScoreMetadata;
  measures: Measure[];
}
```

---

## 3. Occupational Octaves Notation Rules

### 3.1 Fingering & Color Mapping
The color of each note letter and its subsequent sustain arrow is determined strictly by the finger playing it:
- **Finger 1 (Thumb)**: `#D32F2F` (Red)
- **Finger 2 (Index)**: `#2E7D32` (Green)
- **Finger 3 (Middle)**: `#FB8C00` (Orange)
- **Finger 4 (Ring)**: `#1976D2` (Blue)
- **Finger 5 (Pinky)**: `#7B1FA2` (Purple)
- *Right-Hand Voicing Accent*: `#EC407A` (Pink)

*Fingering Heuristic Fallback*: When `fingers` is omitted in the input JSON, a standard ergonomic piano heuristic assigns fingering based on hand position and melodic pitch ascent/descent:
- **Right Hand**: Higher pitches map toward Finger 5 (Pinky), lower pitches toward Finger 1 (Thumb).
- **Left Hand**: Higher pitches map toward Finger 1 (Thumb), lower pitches toward Finger 5 (Pinky).

### 3.2 Pitch Letter & Casing
White key pitches map to letters `A` through `G`. Casing follows the 88-key piano register:
- **Octaves 0–2**: Alternating lowercase/uppercase register designations (`C`, `d`, `e`, `f`, `g`, `A`, `B`).
- **Octave 3–4 (Middle)**: Standard base letters.
- **Octaves 5–8**: Uppercase / lowercase register designations.

### 3.3 Octave Diacritic Markers
Centered directly above the note letter:
- **Octave 0 (A0–B0)**: `▲` (Triangle)
- **Octave 1–2 (C1–B2)**: `▪` (Square)
- **Octave 3–4 (C3–B4)**: No marker (plain letter)
- **Octave 5 (C5–B5)**: `*` (Star)
- **Octave 6 (C6–B6)**: `+` (Plus)
- **Octave 7–8 (C7–C8)**: `✓` (Checkmark)

### 3.4 Accidentals (Black Keys)
Directional solid dots indicate chromatic alterations:
- **Sharp (`#`)**: Solid black dot (`•`) placed at the **top right** of the letter (e.g., `F•` = F#).
- **Flat (`b`)**: Solid black dot (`•`) placed at the **top left** of the letter (e.g., `•A` = Ab).

### 3.5 Sustains & Holds
- If a note's `duration` spans beyond its initial starting cell, every subsequent cell within that duration contains a centered horizontal arrow (`→`).
- The arrow's color matches the finger color of the held note.

### 3.6 Multi-Note Glyph Placement (Chords & Polyphony)
Within a single half-cell (RH top half or LH bottom half), multiple simultaneous notes are arranged in a staggered layout to prevent diacritic and accidental collisions:
- **1 Note**: Centered in the half-cell.
- **2 Notes (`notes.length == 2`)**:
  - Lower pitch: **Bottom-left** of the half-cell.
  - Higher pitch: **Top-right** of the half-cell.
- **3 Notes (`notes.length == 3`)**:
  - Lowest pitch: **Bottom-right** of the half-cell.
  - Middle pitch: **Center-left** of the half-cell.
  - Highest pitch: **Top-right** of the half-cell.
- **Sustaining Chords**: Subsequent cells contain stacked horizontal arrows (`→`) aligned with the vertical position and matching the color of each held note in the chord.

---

## 4. Grid Allocation & System Packing

### 4.1 Cell Resolution
1. The engine calculates the greatest common divisor of all note durations and offsets in the score (defaulting to eighth notes = `0.5` beats if not smaller).
2. `cellDuration` = base subdivision (e.g. `0.5`).
3. For each note:
   - `startCell = round(offset / cellDuration)`
   - `spanCells = max(1, round(duration / cellDuration))`

### 4.2 System & Page Wrapping
- **System**: A single horizontal row containing **exactly 8 boxes**, split horizontally into RH (upper) and LH (lower).
- **Page**: Exactly **4 systems** per page.
- **Header/Footer Policy**: Headers and footers are omitted for initial transcription rendering, focusing exclusively on grid geometry and notation accuracy.

---

## 5. Software Architecture & Components

```
src/
├── types/
│   ├── score.ts          # Input measure-based Score schema
│   └── layout.ts         # Visual grid models (Page, System, Cell, Glyph)
├── core/
│   ├── pitch-mapper.ts   # Scientific pitch -> OO letter, case, octave marker, accidental dot
│   ├── fingering.ts      # Explicit fingering lookup & heuristic fallback + color mapping
│   ├── layout-engine.ts  # Multi-note cell placement (1-note, 2-note diagonal, 3-note staggered)
│   └── grid-allocator.ts # Measures -> 8-box systems & pages with sustain arrow expansion
├── renderers/
│   ├── pdf-renderer.ts   # Pure TypeScript vector PDF generator using `pdf-lib`
│   └── svg-renderer.ts   # Browser DOM/SVG component for live preview and future editing hooks
└── index.ts              # Unified entry point
```

---

## 6. Verification & Test Plan

1. **Unit Tests**:
   - `pitch-mapper.test.ts`: Verify translation across standard pitch inputs (e.g., `G1` -> `g` + square; `F#4` -> `F•`; `Ab5` -> `•a` + star).
   - `fingering.test.ts`: Verify 1-to-1 finger color assignment and ergonomic heuristic ordering.
   - `layout-engine.test.ts`: Verify coordinate positioning for 1-note, 2-note (bottom-left + top-right), and 3-note (bottom-right, center-left, top-right) configurations.
   - `grid-allocator.test.ts`: Verify 4/4 and 3/4 measures correctly fill 8-cell systems and expand multi-beat notes into colored sustain arrows.
2. **Integration Fixture Test**:
   - Test fixture based on **Chopin's Prelude Op. 28, No. 3** (measures 1–4 from sample score).
   - Assert exact cell matrix contents (notes, colors, arrows, blank rest cells) and output valid PDF bytes.
