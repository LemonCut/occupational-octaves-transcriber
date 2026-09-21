import { PDFDocument, rgb, StandardFonts, RGB } from 'pdf-lib';
import { Page, FingerColor, CellGlyph } from '../types/layout.js';
import { ARROW_SVG_PATH, ARROW_METRICS, PAGE_METRICS } from './arrow.js';
import { FONT_METRICS } from './typography.js';

function hexToRgb(hex: FingerColor): RGB {
  const num = parseInt(hex.replace('#', ''), 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

export async function renderPagesToPdf(pages: Page[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const { pageWidth, pageHeight, margin, systemHeight, systemGap, colWidth, halfCellHeight } = PAGE_METRICS;

  for (const pageModel of pages) {
    const pdfPage = doc.addPage([pageWidth, pageHeight]);

    pageModel.systems.forEach((system, sysIdx) => {
      const yTop = pageHeight - margin - (sysIdx + 1) * systemHeight - sysIdx * systemGap;

      // Outer system box
      pdfPage.drawRectangle({
        x: margin,
        y: yTop,
        width: pageWidth - 2 * margin,
        height: systemHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5
      });

      // Horizontal line dividing RH & LH
      pdfPage.drawLine({
        start: { x: margin, y: yTop + halfCellHeight },
        end: { x: pageWidth - margin, y: yTop + halfCellHeight },
        color: rgb(0, 0, 0),
        thickness: 1
      });

      system.cells.forEach((cell, cellIdx) => {
        const xLeft = margin + cellIdx * colWidth;

        // Vertical divider
        if (cellIdx > 0) {
          pdfPage.drawLine({
            start: { x: xLeft, y: yTop },
            end: { x: xLeft, y: yTop + systemHeight },
            color: rgb(0, 0, 0),
            thickness: 1
          });
        }

        // Render RH (upper half: yTop + halfCellHeight to yTop + systemHeight)
        renderCellHalf(cell.rightHand.glyphs, xLeft, yTop + halfCellHeight, colWidth, halfCellHeight, pdfPage, fontBold, fontRegular);
        // Render LH (lower half: yTop to yTop + halfCellHeight)
        renderCellHalf(cell.leftHand.glyphs, xLeft, yTop, colWidth, halfCellHeight, pdfPage, fontBold, fontRegular);
      });
    });
  }

  return await doc.save();
}

function renderCellHalf(
  glyphs: CellGlyph[],
  x: number,
  y: number,
  w: number,
  h: number,
  pdfPage: any,
  fontBold: any,
  fontRegular: any
) {
  const arrowCount = glyphs.filter(g => g.kind === 'arrow').length;
  const noteCount = glyphs.filter(g => g.kind === 'note').length;

  for (const g of glyphs) {
    const color = hexToRgb(g.color);

    if (g.kind === 'arrow') {
      let arrowWidth = 46;
      let targetCenterY = y + h / 2;

      if (arrowCount === 2) {
        arrowWidth = 38;
        // In PDF (+Y up): slot 0 is top (0.65), slot 1 is bottom (0.35)
        targetCenterY = g.verticalSlot === 0 ? y + h * 0.65 : y + h * 0.35;
      } else if (arrowCount >= 3) {
        arrowWidth = 32;
        if (g.verticalSlot === 0) targetCenterY = y + h * 0.78;
        else if (g.verticalSlot === 1) targetCenterY = y + h * 0.50;
        else targetCenterY = y + h * 0.22;
      }

      const scale = arrowWidth / ARROW_METRICS.originalWidth;
      const arrowX = x + (w - arrowWidth) / 2;
      // In pdf-lib drawSvgPath, y is the top-left of the SVG path, which extends downwards by originalHeight * scale
      const arrowY = targetCenterY + ARROW_METRICS.centerY * scale;

      pdfPage.drawSvgPath(ARROW_SVG_PATH, {
        x: arrowX,
        y: arrowY,
        scale,
        color
      });
    } else if (g.kind === 'note') {
      let gx = x + w / 2;
      let gy = y + h / 2 - 8 - FONT_METRICS.singleNoteYOffset;
      let fontSize = FONT_METRICS.singleNote;

      if (noteCount === 2) {
        fontSize = FONT_METRICS.dyadNote;
        if (g.position === 'bottom-left') {
          gx = x + w * 0.32;
          gy = y + h * 0.22;
        } else if (g.position === 'top-right') {
          gx = x + w * 0.68;
          gy = y + h * 0.50;
        }
      } else if (noteCount >= 3) {
        fontSize = FONT_METRICS.triadNote;
        if (g.position === 'top-right') {
          gx = x + w * 0.70;
          gy = y + h * 0.60;
        } else if (g.position === 'center-left') {
          gx = x + w * 0.30;
          gy = y + h * 0.40;
        } else if (g.position === 'bottom-right') {
          gx = x + w * 0.70;
          gy = y + h * 0.20;
        }
      }

      const letterWidth = fontBold.widthOfTextAtSize(g.letter, fontSize);
      pdfPage.drawText(g.letter, {
        x: gx - letterWidth / 2,
        y: gy,
        size: fontSize,
        font: fontBold,
        color
      });

      // Octave diacritic positioned with consistent clearance above letter top
      const capHeight = fontSize * 0.72;
      const letterTop = gy + capHeight;
      const sqHalf = FONT_METRICS.squareSize / 2;

      if (g.octaveMarker === 'star') {
        const starY = letterTop + FONT_METRICS.diacriticGap - 0.40 * FONT_METRICS.diacriticSize;
        pdfPage.drawText('*', {
          x: gx - 3,
          y: starY,
          size: FONT_METRICS.diacriticSize,
          font: fontRegular,
          color
        });
      } else if (g.octaveMarker === 'square') {
        const rectY = letterTop + FONT_METRICS.diacriticGap;
        pdfPage.drawRectangle({
          x: gx - sqHalf,
          y: rectY,
          width: FONT_METRICS.squareSize,
          height: FONT_METRICS.squareSize,
          color
        });
      } else if (g.octaveMarker === 'plus') {
        const plusY = letterTop + FONT_METRICS.diacriticGap - 0.15 * FONT_METRICS.diacriticSize;
        pdfPage.drawText('+', {
          x: gx - 4,
          y: plusY,
          size: FONT_METRICS.diacriticSize,
          font: fontRegular,
          color
        });
      }

      // Accidental dot vertically centered with the letter
      const dotY = gy + capHeight * 0.5;
      if (g.accidental === 'sharp') {
        pdfPage.drawCircle({
          x: gx + letterWidth / 2 + 5,
          y: dotY,
          size: FONT_METRICS.dotRadius,
          color: rgb(0, 0, 0)
        });
      } else if (g.accidental === 'flat') {
        pdfPage.drawCircle({
          x: gx - letterWidth / 2 - 5,
          y: dotY,
          size: FONT_METRICS.dotRadius,
          color: rgb(0, 0, 0)
        });
      }
    }
  }
}
