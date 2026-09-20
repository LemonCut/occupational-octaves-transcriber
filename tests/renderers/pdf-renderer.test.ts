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
