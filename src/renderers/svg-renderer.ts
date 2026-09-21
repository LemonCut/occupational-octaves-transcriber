import { Page, CellGlyph } from '../types/layout.js';
import { ARROW_SVG_PATH, ARROW_METRICS, PAGE_METRICS } from './arrow.js';

export function renderPageToSvg(page: Page): string {
  const { pageWidth, pageHeight, margin, systemHeight, systemGap, colWidth, halfCellHeight } = PAGE_METRICS;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageWidth} ${pageHeight}" width="${pageWidth}" height="${pageHeight}">\n`;
  svg += `<rect width="${pageWidth}" height="${pageHeight}" fill="#ffffff"/>\n`;

  page.systems.forEach((system, sysIdx) => {
    const yTop = margin + sysIdx * (systemHeight + systemGap);

    // System outer box
    svg += `<rect x="${margin}" y="${yTop}" width="${pageWidth - 2 * margin}" height="${systemHeight}" fill="none" stroke="#000000" stroke-width="1.5"/>\n`;
    // Middle horizontal dividing line between RH and LH
    svg += `<line x1="${margin}" y1="${yTop + halfCellHeight}" x2="${pageWidth - margin}" y2="${yTop + halfCellHeight}" stroke="#000000" stroke-width="1"/>\n`;

    system.cells.forEach((cell, cellIdx) => {
      const xLeft = margin + cellIdx * colWidth;
      // Vertical cell divider
      if (cellIdx > 0) {
        svg += `<line x1="${xLeft}" y1="${yTop}" x2="${xLeft}" y2="${yTop + systemHeight}" stroke="#000000" stroke-width="1"/>\n`;
      }

      // Render RH glyphs (top half)
      svg += renderGlyphs(cell.rightHand.glyphs, xLeft, yTop, colWidth, halfCellHeight);
      // Render LH glyphs (bottom half)
      svg += renderGlyphs(cell.leftHand.glyphs, xLeft, yTop + halfCellHeight, colWidth, halfCellHeight);
    });
  });

  svg += `</svg>`;
  return svg;
}

function renderGlyphs(glyphs: CellGlyph[], x: number, y: number, w: number, h: number): string {
  let out = '';
  const arrowCount = glyphs.filter(g => g.kind === 'arrow').length;

  for (const g of glyphs) {
    if (g.kind === 'arrow') {
      // Scale arrow based on whether single or stacked
      let arrowWidth = 44;
      let targetCenterY = y + h / 2;

      if (arrowCount === 2) {
        arrowWidth = 36;
        targetCenterY = g.verticalSlot === 0 ? y + h * 0.35 : y + h * 0.65;
      } else if (arrowCount >= 3) {
        arrowWidth = 30;
        if (g.verticalSlot === 0) targetCenterY = y + h * 0.22;
        else if (g.verticalSlot === 1) targetCenterY = y + h * 0.50;
        else targetCenterY = y + h * 0.78;
      }

      const scale = arrowWidth / ARROW_METRICS.originalWidth;
      const arrowX = x + (w - arrowWidth) / 2;
      const arrowY = targetCenterY - ARROW_METRICS.centerY * scale;

      out += `<g transform="translate(${arrowX.toFixed(2)}, ${arrowY.toFixed(2)}) scale(${scale.toFixed(4)})">\n`;
      out += `  <path d="${ARROW_SVG_PATH}" fill="${g.color}"/>\n`;
      out += `</g>\n`;
    } else if (g.kind === 'note') {
      let gx = x + w / 2;
      let gy = y + h / 2 + 8;
      let fontSize = 24;

      if (g.position === 'bottom-left') {
        gx = x + w * 0.35;
        gy = y + h * 0.78;
        fontSize = 17;
      } else if (g.position === 'top-right') {
        gx = x + w * 0.65;
        gy = y + h * 0.42;
        fontSize = 17;
      } else if (g.position === 'bottom-right') {
        gx = x + w * 0.7;
        gy = y + h * 0.78;
        fontSize = 15;
      } else if (g.position === 'center-left') {
        gx = x + w * 0.3;
        gy = y + h * 0.58;
        fontSize = 15;
      }

      // Note Letter
      out += `<text x="${gx}" y="${gy}" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${g.color}" text-anchor="middle">${g.letter}</text>\n`;

      // Octave diacritic
      if (g.octaveMarker === 'star') {
        out += `<text x="${gx}" y="${gy - fontSize + 3}" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${g.color}" text-anchor="middle">*</text>\n`;
      } else if (g.octaveMarker === 'square') {
        out += `<rect x="${gx - 3}" y="${gy - fontSize}" width="6" height="6" fill="${g.color}"/>\n`;
      } else if (g.octaveMarker === 'plus') {
        out += `<text x="${gx}" y="${gy - fontSize + 3}" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${g.color}" text-anchor="middle">+</text>\n`;
      }

      // Accidental dot
      const approxCharWidth = fontSize * 0.6;
      if (g.accidental === 'sharp') {
        out += `<circle cx="${gx + approxCharWidth / 2 + 5}" cy="${gy - fontSize * 0.72}" r="2.5" fill="#000000"/>\n`;
      } else if (g.accidental === 'flat') {
        out += `<circle cx="${gx - approxCharWidth / 2 - 5}" cy="${gy - fontSize * 0.72}" r="2.5" fill="#000000"/>\n`;
      }
    }
  }
  return out;
}
