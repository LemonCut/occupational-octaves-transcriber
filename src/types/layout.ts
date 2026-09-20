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
