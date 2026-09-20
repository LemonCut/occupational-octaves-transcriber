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
