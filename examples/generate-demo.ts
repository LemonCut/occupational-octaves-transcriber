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
        // LH single notes in C-position: G=4 (Blue), B=2 (Green), A=3 (Orange), E=5 (Purple)
        { offset: 0.0, duration: 0.5, notes: ['G2'] },
        { offset: 0.5, duration: 0.5, notes: ['B2'] },
        { offset: 1.0, duration: 0.5, notes: ['G3'] },
        { offset: 1.5, duration: 0.5, notes: ['A3'] },
        { offset: 2.0, duration: 0.5, notes: ['B3'] },
        { offset: 2.5, duration: 0.5, notes: ['A3'] },
        { offset: 3.0, duration: 0.5, notes: ['G3'] },
        { offset: 3.5, duration: 0.5, notes: ['E4'] }
      ]
    },
    {
      number: 2,
      rightHand: [
        // Chord dyad holding for 2 beats: interval heuristic assigns 1, 3 (thumb + middle) for a 3rd
        { offset: 0.0, duration: 2.0, notes: ['B4', 'D5'] }
      ],
      leftHand: [
        // LH single notes in C-position: C4=1 (Red), B3=2 (Green), A3=3 (Orange), G3=4 (Blue), D4=2 (Green)
        { offset: 0.0, duration: 0.5, notes: ['D4'] },
        { offset: 0.5, duration: 0.5, notes: ['C4'] },
        { offset: 1.0, duration: 0.5, notes: ['B3'] },
        { offset: 1.5, duration: 0.5, notes: ['A3'] },
        { offset: 2.0, duration: 0.5, notes: ['G3'] },
        { offset: 2.5, duration: 0.5, notes: ['A3'] },
        { offset: 3.0, duration: 0.5, notes: ['B3'] },
        { offset: 3.5, duration: 0.5, notes: ['D4'] }
      ]
    },
    {
      number: 3,
      // Measure 3 demonstrating triads & non-explicit (heuristic) fingerings
      rightHand: [
        // RH Triad holding for 2 beats: no explicit fingers -> heuristic assigns 1, 3, 5 (Pink, Orange, Purple)
        // Propagates 3 sustain arrows sorted by pitch (slot 0 top = D5, slot 1 mid = B4, slot 2 bot = G4)
        { offset: 0.0, duration: 2.0, notes: ['G4', 'B4', 'D5'] },
        // C Major triad in higher octave
        { offset: 2.0, duration: 2.0, notes: ['C5', 'E5', 'G5'] }
      ],
      leftHand: [
        // LH Triad holding for 2 beats: no explicit fingers -> heuristic assigns 5, 3, 1 (Purple, Orange, Red)
        // With '▪' square octave markers on G2 & B2
        { offset: 0.0, duration: 2.0, notes: ['G2', 'B2', 'D3'] },
        { offset: 2.0, duration: 2.0, notes: ['C3', 'E3', 'G3'] }
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
