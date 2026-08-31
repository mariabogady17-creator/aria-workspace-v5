import path from "path";
import fs from "fs";
import crypto from "crypto";
import { docsDir } from "./db";

/**
 * A.R.I.A. Workspace - Office document generation (pure Node, no Python).
 * Replaces ARIA Fusion's officecli: create .docx / .xlsx / .pptx from chat.
 */

export interface OfficeContent {
  title?: string;
  paragraphs?: string[]; // docx
  sheets?: { name: string; rows: string[][] }[]; // xlsx
  slides?: { title: string; bullets?: string[]; notes?: string }[]; // pptx
}

function safeName(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._\-áéíóúñÁÉÍÓÚÑ ]/g, "_");
  const rand = crypto.randomBytes(3).toString("hex");
  return `${Date.now()}_${rand}_${base}`;
}

async function buildDocx(content: OfficeContent): Promise<Buffer> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const children: any[] = [];
  if (content.title) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: content.title, bold: true, size: 56 })],
      })
    );
  }
  for (const p of content.paragraphs || []) {
    const isHeading = /^#{1,3}\s/.test(p);
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        ...(isHeading ? { heading: HeadingLevel.HEADING_2 } : {}),
        children: [new TextRun({ text: p.replace(/^#{1,3}\s/, ""), bold: isHeading, size: isHeading ? 36 : 24 })],
      })
    );
  }

  const doc = new Document({
    creator: "A.R.I.A. Workspace",
    title: content.title || "Documento A.R.I.A.",
    sections: [{ children: children.length ? children : [new Paragraph({ children: [new TextRun("")] })] }],
  });
  return (await Packer.toBuffer(doc)) as Buffer;
}

async function buildXlsx(content: OfficeContent): Promise<Buffer> {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const wb = new ExcelJS.Workbook();
  wb.creator = "A.R.I.A. Workspace";

  // Handle MasterDocumentJSON format (metadata.type + structure/sheets)
  let sheets = content.sheets;
  if (!sheets && (content as any).metadata) {
    const master = content as any;
    // Try top-level sheets array
    if (Array.isArray(master.sheets)) {
      sheets = master.sheets;
    }
    // Try structure array with sheet types
    else if (Array.isArray(master.structure)) {
      const sheetItems = master.structure.filter((i: any) => i.type === 'sheet' || i.content?.tables || i.headers || i.rows);
      if (sheetItems.length > 0) {
        sheets = sheetItems.map((item: any) => {
          const c = item.content || item;
          if (c.tables && c.tables.length > 0) {
            return {
              name: c.name || "Hoja",
              rows: [
                c.tables[0].headers || [],
                ...(c.tables[0].rows || [])
              ]
            };
          }
          if (c.headers || c.rows) {
            return { name: c.name || "Hoja", rows: [c.headers || [], ...(c.rows || [])] };
          }
          return { name: "Hoja", rows: [] };
        });
      }
    }
    // Try top-level paragraphs as single-column data
    if (!sheets && Array.isArray(master.paragraphs)) {
      sheets = [{ name: "Contenido", rows: master.paragraphs.map((p: string) => [p]) }];
    }
  }

  sheets = sheets?.length ? sheets : [{ name: "Hoja1", rows: (content.paragraphs || []).map((p) => [p]) }];

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name?.slice(0, 31) || "Hoja");
    for (let row of s.rows || []) {
      if (row && !Array.isArray(row) && typeof row === 'object') {
         if ('formula' in row && Object.keys(row).length === 1) {
           row = [row] as any;
         } else {
           row = Object.values(row) as any;
         }
      }
      ws.addRow(row);
    }
    
    // Premium header styling
    if (ws.rowCount > 0) {
      const headerRow = ws.getRow(1);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Segoe UI' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'medium', color: { argb: 'FFF59E0B' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        };
      });
      const colCount = headerRow.actualCellCount || 10;
      for (let i = 1; i <= colCount; i++) {
        ws.getColumn(i).width = 24;
      }
      // Zebra striping for data rows
      for (let r = 2; r <= ws.rowCount; r++) {
        ws.getRow(r).eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
          };
          if (r % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          }
        });
      }
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

async function buildPptx(content: OfficeContent): Promise<Buffer> {
  const pptxgen = (await import("pptxgenjs")).default;
  const pptx = new pptxgen();
  pptx.author = "A.R.I.A. Workspace";
  pptx.theme = { headFontFace: "Segoe UI", bodyFontFace: "Segoe UI" };

  const slides = content.slides?.length
    ? content.slides
    : [{ title: content.title || "Presentación A.R.I.A.", bullets: content.paragraphs || [] }];

  // Title slide
  if (content.title) {
    const cover = pptx.addSlide();
    cover.background = { color: "1A1A2E" };
    cover.addText(content.title, {
      x: 0.8, y: 2.4, w: 8.4, h: 1.6,
      fontSize: 40, bold: true, color: "818CF8", align: "center",
    });
  }

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: "1A1A2E" };
    slide.addText(s.title || "", {
      x: 0.6, y: 0.4, w: 8.8, h: 1,
      fontSize: 30, bold: true, color: "818CF8",
    });
    if (s.bullets && s.bullets.length > 0) {
      slide.addText(
        s.bullets.map((b) => ({ text: b, options: { bullet: { code: "25CF" }, breakLine: true } })),
        { x: 0.8, y: 1.6, w: 8.4, h: 5, fontSize: 18, color: "E5E2E1", valign: "top" }
      );
    }
    if (s.notes) slide.addNotes(s.notes);
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(out as ArrayBuffer);
}

export async function createOfficeDocument(
  filename: string,
  content: OfficeContent
): Promise<{ name: string; url: string }> {
  const ext = path.extname(filename).toLowerCase();
  let buffer: Buffer;

  if (ext === ".docx") buffer = await buildDocx(content);
  else if (ext === ".xlsx") buffer = await buildXlsx(content);
  else if (ext === ".pptx") buffer = await buildPptx(content);
  else throw new Error(`Extensión no soportada: ${ext}. Usa .docx, .xlsx o .pptx`);

  const name = safeName(filename);
  fs.writeFileSync(path.join(docsDir(), name), buffer);
  return { name, url: `/api/files/${name}` };
}
