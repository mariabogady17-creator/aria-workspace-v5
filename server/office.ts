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
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "A.R.I.A. Workspace";

  const sheets = content.sheets?.length
    ? content.sheets
    : [{ name: "Hoja1", rows: (content.paragraphs || []).map((p) => [p]) }];

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name?.slice(0, 31) || "Hoja");
    for (const row of s.rows || []) ws.addRow(row);
    // header styling
    if (ws.rowCount > 0) {
      ws.getRow(1).font = { bold: true };
      ws.columns.forEach((c: any) => (c.width = 24));
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
