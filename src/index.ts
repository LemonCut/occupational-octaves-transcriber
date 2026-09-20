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
