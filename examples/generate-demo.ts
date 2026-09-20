import fs from 'node:fs';
import path from 'node:path';
import { transcribeScoreToPdf, transcribeScoreToSvg, Score } from '../src/index.js';

// Opening 2 measures of Chopin Prelude Op. 28, No. 3 in G Major
const demoScore: Score = {
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
    },
    {
      number: 2,
      rightHand: [
        // Chord dyad holding for 2 beats (4 cells) with 2-note diagonal positioning
        { offset: 0.0, duration: 2.0, notes: ['B4', 'D5'], fingers: [1, 3] }
      ],
      leftHand: [
        { offset: 0.0, duration: 0.5, notes: ['D4'], fingers: [2] },
        { offset: 0.5, duration: 0.5, notes: ['C4'], fingers: [1] },
        { offset: 1.0, duration: 0.5, notes: ['B3'], fingers: [4] },
        { offset: 1.5, duration: 0.5, notes: ['A3'], fingers: [3] },
        { offset: 2.0, duration: 0.5, notes: ['G3'], fingers: [5] },
        { offset: 2.5, duration: 0.5, notes: ['A3'], fingers: [3] },
        { offset: 3.0, duration: 0.5, notes: ['B3'], fingers: [4] },
        { offset: 3.5, duration: 0.5, notes: ['D4'], fingers: [2] }
      ]
    }
  ]
};

async function main() {
  const outDir = path.resolve('output');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Generating Occupational Octaves demo PDF & SVG...');
  
  // 1. Generate PDF
  const pdfBytes = await transcribeScoreToPdf(demoScore);
  const pdfPath = path.join(outDir, 'chopin-prelude.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log(`✅ PDF written to: ${pdfPath}`);

  // 2. Generate SVG Preview
  const svgPages = transcribeScoreToSvg(demoScore);
  const svgPath = path.join(outDir, 'chopin-prelude.svg');
  fs.writeFileSync(svgPath, svgPages[0]);
  console.log(`✅ SVG preview written to: ${svgPath}`);
}

main().catch(console.error);
