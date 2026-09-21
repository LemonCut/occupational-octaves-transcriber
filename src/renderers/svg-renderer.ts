import { Page, CellGlyph } from '../types/layout.js';
import { ARROW_SVG_PATH, ARROW_METRICS, PAGE_METRICS } from './arrow.js';
import { FONT_METRICS } from './typography.js';

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
  const noteCount = glyphs.filter(g => g.kind === 'note').length;

  for (const g of glyphs) {
    if (g.kind === 'arrow') {
      // Scale arrow based on whether single or stacked
      let arrowWidth = 46;
      let targetCenterY = y + h / 2;

      if (arrowCount === 2) {
        arrowWidth = 38;
        targetCenterY = g.verticalSlot === 0 ? y + h * 0.35 : y + h * 0.65;
      } else if (arrowCount >= 3) {
        arrowWidth = 32;
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
      let gy = y + h / 2 + 8 + FONT_METRICS.singleNoteYOffset;
      let fontSize = FONT_METRICS.singleNote;

      if (noteCount === 2) {
        fontSize = FONT_METRICS.dyadNote;
        if (g.position === 'bottom-left') {
          gx = x + w * 0.32;
          gy = y + h * 0.78;
        } else if (g.position === 'top-right') {
          gx = x + w * 0.68;
          gy = y + h * 0.50;
        }
      } else if (noteCount >= 3) {
        fontSize = FONT_METRICS.triadNote;
        if (g.position === 'top-right') {
          gx = x + w * 0.70;
          gy = y + h * 0.40;
        } else if (g.position === 'center-left') {
          gx = x + w * 0.30;
          gy = y + h * 0.60;
        } else if (g.position === 'bottom-right') {
          gx = x + w * 0.70;
          gy = y + h * 0.80;
        }
      }

      // Note Letter
      out += `<text x="${gx}" y="${gy}" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="${fontSize}" fill="${g.color}" text-anchor="middle">${g.letter}</text>\n`;

      // Octave diacritic positioned with consistent clearance above letter top
      const capHeight = fontSize * 0.72;
      const letterTop = gy - capHeight;
      const sqHalf = FONT_METRICS.squareSize / 2;

      if (g.octaveMarker === 'star') {
        const starY = letterTop - FONT_METRICS.diacriticGap + 0.40 * FONT_METRICS.diacriticSize;
        out += `<text x="${gx}" y="${starY.toFixed(2)}" font-family="Helvetica, Arial, sans-serif" font-size="${FONT_METRICS.diacriticSize}" fill="${g.color}" text-anchor="middle">*</text>\n`;
      } else if (g.octaveMarker === 'square') {
        const rectY = letterTop - FONT_METRICS.diacriticGap - FONT_METRICS.squareSize;
        out += `<rect x="${(gx - sqHalf).toFixed(2)}" y="${rectY.toFixed(2)}" width="${FONT_METRICS.squareSize}" height="${FONT_METRICS.squareSize}" fill="${g.color}"/>\n`;
      } else if (g.octaveMarker === 'plus') {
        const plusY = letterTop - FONT_METRICS.diacriticGap + 0.15 * FONT_METRICS.diacriticSize;
        out += `<text x="${gx}" y="${plusY.toFixed(2)}" font-family="Helvetica, Arial, sans-serif" font-size="${FONT_METRICS.diacriticSize}" fill="${g.color}" text-anchor="middle">+</text>\n`;
      }

      // Accidental dot vertically centered with the letter
      const approxCharWidth = fontSize * 0.55;
      const dotY = gy - capHeight * 0.5;
      if (g.accidental === 'sharp') {
        out += `<circle cx="${(gx + approxCharWidth / 2 + 5).toFixed(2)}" cy="${dotY.toFixed(2)}" r="${FONT_METRICS.dotRadius}" fill="#000000"/>\n`;
      } else if (g.accidental === 'flat') {
        out += `<circle cx="${(gx - approxCharWidth / 2 - 5).toFixed(2)}" cy="${dotY.toFixed(2)}" r="${FONT_METRICS.dotRadius}" fill="#000000"/>\n`;
      }
    }
  }
  return out;
}
