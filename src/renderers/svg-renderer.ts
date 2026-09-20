import { Page, GridCell, CellGlyph } from '../types/layout.js';

export function renderPageToSvg(page: Page): string {
  const width = 800;
  const height = 1050;
  const margin = 40;
  const systemHeight = 160;
  const systemGap = 40;
  const colWidth = (width - 2 * margin) / 8;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `<rect width="${width}" height="${height}" fill="#ffffff"/>\n`;

  page.systems.forEach((system, sysIdx) => {
    const yTop = margin + sysIdx * (systemHeight + systemGap);

    // System outer box
    svg += `<rect x="${margin}" y="${yTop}" width="${width - 2 * margin}" height="${systemHeight}" fill="none" stroke="#000000" stroke-width="1.5"/>\n`;
    // Middle horizontal dividing line between RH and LH
    svg += `<line x1="${margin}" y1="${yTop + systemHeight / 2}" x2="${width - margin}" y2="${yTop + systemHeight / 2}" stroke="#000000" stroke-width="1"/>\n`;

    system.cells.forEach((cell, cellIdx) => {
      const xLeft = margin + cellIdx * colWidth;
      // Vertical cell divider
      if (cellIdx > 0) {
        svg += `<line x1="${xLeft}" y1="${yTop}" x2="${xLeft}" y2="${yTop + systemHeight}" stroke="#000000" stroke-width="1"/>\n`;
      }

      // Render RH glyphs (top half)
      svg += renderGlyphs(cell.rightHand.glyphs, xLeft, yTop, colWidth, systemHeight / 2);
      // Render LH glyphs (bottom half)
      svg += renderGlyphs(cell.leftHand.glyphs, xLeft, yTop + systemHeight / 2, colWidth, systemHeight / 2);
    });
  });

  svg += `</svg>`;
  return svg;
}

function renderGlyphs(glyphs: CellGlyph[], x: number, y: number, w: number, h: number): string {
  let out = '';
  for (const g of glyphs) {
    if (g.kind === 'arrow') {
      const arrowY = y + h / 2;
      out += `<path d="M ${x + 15} ${arrowY} L ${x + w - 15} ${arrowY} M ${x + w - 25} ${arrowY - 6} L ${x + w - 15} ${arrowY} L ${x + w - 25} ${arrowY + 6}" stroke="${g.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n`;
    } else if (g.kind === 'note') {
      let gx = x + w / 2;
      let gy = y + h / 2 + 10;
      let fontSize = 28;

      if (g.position === 'bottom-left') {
        gx = x + w * 0.35;
        gy = y + h * 0.75;
        fontSize = 20;
      } else if (g.position === 'top-right') {
        gx = x + w * 0.65;
        gy = y + h * 0.4;
        fontSize = 20;
      } else if (g.position === 'bottom-right') {
        gx = x + w * 0.7;
        gy = y + h * 0.75;
        fontSize = 18;
      } else if (g.position === 'center-left') {
        gx = x + w * 0.3;
        gy = y + h * 0.55;
        fontSize = 18;
      }

      // Note Letter
      out += `<text x="${gx}" y="${gy}" font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${g.color}" text-anchor="middle">${g.letter}</text>\n`;

      // Octave diacritic
      if (g.octaveMarker === 'star') {
        out += `<text x="${gx}" y="${gy - fontSize + 4}" font-size="14" fill="${g.color}" text-anchor="middle">*</text>\n`;
      } else if (g.octaveMarker === 'square') {
        out += `<rect x="${gx - 3.5}" y="${gy - fontSize + 2}" width="7" height="7" fill="${g.color}"/>\n`;
      } else if (g.octaveMarker === 'plus') {
        out += `<text x="${gx}" y="${gy - fontSize + 4}" font-size="14" fill="${g.color}" text-anchor="middle">+</text>\n`;
      }

      // Accidental dot
      if (g.accidental === 'sharp') {
        out += `<circle cx="${gx + fontSize * 0.35}" cy="${gy - fontSize * 0.75}" r="3.5" fill="#000000"/>\n`;
      } else if (g.accidental === 'flat') {
        out += `<circle cx="${gx - fontSize * 0.35}" cy="${gy - fontSize * 0.75}" r="3.5" fill="#000000"/>\n`;
      }
    }
  }
  return out;
}
