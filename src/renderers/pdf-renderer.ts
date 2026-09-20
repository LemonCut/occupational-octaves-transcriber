import { PDFDocument, rgb, StandardFonts, RGB } from 'pdf-lib';
import { Page, FingerColor, CellGlyph } from '../types/layout.js';

function hexToRgb(hex: FingerColor): RGB {
  const num = parseInt(hex.replace('#', ''), 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

export async function renderPagesToPdf(pages: Page[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 612; // Letter
  const pageHeight = 792;
  const margin = 36;
  const systemHeight = 120;
  const systemGap = 30;
  const colWidth = (pageWidth - 2 * margin) / 8;

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
        start: { x: margin, y: yTop + systemHeight / 2 },
        end: { x: pageWidth - margin, y: yTop + systemHeight / 2 },
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

        // Render RH (upper half: yTop + systemHeight/2 to yTop + systemHeight)
        renderCellHalf(cell.rightHand.glyphs, xLeft, yTop + systemHeight / 2, colWidth, systemHeight / 2, pdfPage, fontBold, fontRegular);
        // Render LH (lower half: yTop to yTop + systemHeight/2)
        renderCellHalf(cell.leftHand.glyphs, xLeft, yTop, colWidth, systemHeight / 2, pdfPage, fontBold, fontRegular);
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
  for (const g of glyphs) {
    const color = hexToRgb(g.color);

    if (g.kind === 'arrow') {
      const arrowY = y + h / 2;
      pdfPage.drawLine({
        start: { x: x + 10, y: arrowY },
        end: { x: x + w - 10, y: arrowY },
        color,
        thickness: 2.5
      });
      // Arrowhead
      pdfPage.drawLine({
        start: { x: x + w - 18, y: arrowY + 4 },
        end: { x: x + w - 10, y: arrowY },
        color,
        thickness: 2.5
      });
      pdfPage.drawLine({
        start: { x: x + w - 18, y: arrowY - 4 },
        end: { x: x + w - 10, y: arrowY },
        color,
        thickness: 2.5
      });
    } else if (g.kind === 'note') {
      let gx = x + w / 2;
      let gy = y + h / 2 - 8;
      let fontSize = 24;

      if (g.position === 'bottom-left') {
        gx = x + w * 0.35;
        gy = y + h * 0.25;
        fontSize = 17;
      } else if (g.position === 'top-right') {
        gx = x + w * 0.65;
        gy = y + h * 0.6;
        fontSize = 17;
      } else if (g.position === 'bottom-right') {
        gx = x + w * 0.7;
        gy = y + h * 0.25;
        fontSize = 15;
      } else if (g.position === 'center-left') {
        gx = x + w * 0.3;
        gy = y + h * 0.45;
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
          y: gy + fontSize * 0.75,
          size: 2.5,
          color: rgb(0, 0, 0)
        });
      } else if (g.accidental === 'flat') {
        pdfPage.drawCircle({
          x: gx - letterWidth / 2 - 5,
          y: gy + fontSize * 0.75,
          size: 2.5,
          color: rgb(0, 0, 0)
        });
      }
    }
  }
}
