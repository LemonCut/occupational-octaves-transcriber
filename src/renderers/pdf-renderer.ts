import { PDFDocument, rgb, StandardFonts, RGB } from 'pdf-lib';
import { Page, FingerColor, CellGlyph } from '../types/layout.js';
import { ARROW_SVG_PATH, ARROW_METRICS, PAGE_METRICS } from './arrow.js';

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

  for (const g of glyphs) {
    const color = hexToRgb(g.color);

    if (g.kind === 'arrow') {
      let arrowWidth = 34;
      let targetCenterY = y + h / 2;

      if (arrowCount === 2) {
        arrowWidth = 28;
        // In PDF (+Y up): slot 0 is top (0.65), slot 1 is bottom (0.35)
        targetCenterY = g.verticalSlot === 0 ? y + h * 0.65 : y + h * 0.35;
      } else if (arrowCount >= 3) {
        arrowWidth = 24;
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
      let gy = y + h / 2 - 8;
      let fontSize = 24;

      if (g.position === 'bottom-left') {
        gx = x + w * 0.35;
        gy = y + h * 0.22;
        fontSize = 17;
      } else if (g.position === 'top-right') {
        gx = x + w * 0.65;
        gy = y + h * 0.58;
        fontSize = 17;
      } else if (g.position === 'bottom-right') {
        gx = x + w * 0.7;
        gy = y + h * 0.22;
        fontSize = 15;
      } else if (g.position === 'center-left') {
        gx = x + w * 0.3;
        gy = y + h * 0.42;
        fontSize = 15;
      }

      const letterWidth = fontBold.widthOfTextAtSize(g.letter, fontSize);
      pdfPage.drawText(g.letter, {
        x: gx - letterWidth / 2,
        y: gy,
        size: fontSize,
        font: fontBold,
        color
      });

      // Octave diacritic
      if (g.octaveMarker === 'star') {
        pdfPage.drawText('*', {
          x: gx - 3,
          y: gy + fontSize - 2,
          size: 14,
          font: fontRegular,
          color
        });
      } else if (g.octaveMarker === 'square') {
        pdfPage.drawRectangle({
          x: gx - 3,
          y: gy + fontSize,
          width: 6,
          height: 6,
          color
        });
      } else if (g.octaveMarker === 'plus') {
        pdfPage.drawText('+', {
          x: gx - 4,
          y: gy + fontSize - 2,
          size: 14,
          font: fontRegular,
          color
        });
      }

      // Accidental dot
      if (g.accidental === 'sharp') {
        pdfPage.drawCircle({
          x: gx + letterWidth / 2 + 5,
          y: gy + fontSize * 0.72,
          size: 2.5,
          color: rgb(0, 0, 0)
        });
      } else if (g.accidental === 'flat') {
        pdfPage.drawCircle({
          x: gx - letterWidth / 2 - 5,
          y: gy + fontSize * 0.72,
          size: 2.5,
          color: rgb(0, 0, 0)
        });
      }
    }
  }
}
