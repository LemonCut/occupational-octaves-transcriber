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
