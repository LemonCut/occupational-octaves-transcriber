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
