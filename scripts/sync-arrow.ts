import fs from 'node:fs';
import path from 'node:path';

const svgPath = path.resolve('assets/right_arrow.svg');
const targetTs = path.resolve('src/renderers/arrow.ts');

if (!fs.existsSync(svgPath)) {
  console.error(`Error: ${svgPath} not found.`);
  process.exit(1);
}

const svgContent = fs.readFileSync(svgPath, 'utf-8');
const vbMatch = svgContent.match(/viewBox=["']\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*["']/);
const polyMatch = svgContent.match(/<polygon[^>]*points=["']([^"']+)["']/);
const pathMatch = svgContent.match(/<path[^>]*d=["']([^"']+)["']/);

let originalWidth = 164.48;
let originalHeight = 75.33;
if (vbMatch) {
  originalWidth = parseFloat(vbMatch[3]);
  originalHeight = parseFloat(vbMatch[4]);
}

let pathData = '';
if (polyMatch) {
  const numbers = polyMatch[1].trim().split(/[\s,]+/);
  const pairs: string[] = [];
  for (let i = 0; i < numbers.length; i += 2) {
    pairs.push(`${numbers[i]} ${numbers[i + 1]}`);
  }
  if (pairs.length > 0) {
    pathData = `M ${pairs[0]} ` + pairs.slice(1).map(pt => `L ${pt}`).join(' ') + ' Z';
  }
} else if (pathMatch) {
  pathData = pathMatch[1];
}

const centerY = (originalHeight / 2).toFixed(2);

const output = `// Converted from assets/right_arrow.svg (viewBox: 0 0 ${originalWidth} ${originalHeight})
export const ARROW_SVG_PATH = '${pathData}';

export const ARROW_METRICS = {
  originalWidth: ${originalWidth},
  originalHeight: ${originalHeight},
  centerY: ${centerY}
};

export const PAGE_METRICS = {
  pageWidth: 612,      // US Letter width in points
  pageHeight: 792,     // US Letter height in points
  margin: 36,
  systemHeight: 120,
  systemGap: 30,
  colWidth: 67.5,      // (612 - 2 * 36) / 8
  halfCellHeight: 60   // systemHeight / 2
};
`;

fs.writeFileSync(targetTs, output);
console.log(`✅ Synced assets/right_arrow.svg -> src/renderers/arrow.ts (width: ${originalWidth}, height: ${originalHeight})`);
