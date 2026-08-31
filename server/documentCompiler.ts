import { MasterDocumentJSON, DocumentComponent } from "../src/types";

export async function compileDocx(masterJson: MasterDocumentJSON): Promise<Buffer> {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } = docx;

  const children: any[] = [];
  const colors = masterJson.metadata?.colors || { primary: "#4F46E5" };
  const primaryColor = (colors.primary || "#4F46E5").replace("#", "");

  for (const item of masterJson.structure) {
    const content = item.content || item;
    switch (item.type) {
      case 'cover_page':
        if (content.title) {
          children.push(new Paragraph({
            text: content.title,
            heading: HeadingLevel.TITLE,
            spacing: { before: 2400, after: 400 },
            alignment: docx.AlignmentType.CENTER
          }));
        }
        if (content.subtitle) {
          children.push(new Paragraph({
            text: content.subtitle,
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 1200 },
            alignment: docx.AlignmentType.CENTER
          }));
        }
        break;

      case 'heading_1':
        children.push(new Paragraph({
          text: content.text || content,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }));
        break;

      case 'heading_2':
        children.push(new Paragraph({
          text: content.text || content,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 }
        }));
        break;

      case 'paragraph':
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: typeof content === 'string' ? content : (content.text || JSON.stringify(content)),
              color: item.styles?.bold ? primaryColor : '333333',
              bold: item.styles?.bold || false,
              italics: item.styles?.italic || false,
            }),
          ],
          spacing: { after: 200 },
        }));
        break;

      case 'callout_box':
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: `💡 ${content.text || content}`,
              italics: true,
              bold: true,
            }),
          ],
          shading: {
            type: docx.ShadingType.CLEAR,
            color: "auto",
            fill: "F3F4F6", // Light gray
          },
          spacing: { before: 200, after: 200 },
        }));
        break;

      case 'table':
        if (content.headers && content.rows) {
          const rows = [
            new TableRow({
              children: content.headers.map((header: string) => 
                new TableCell({
                  children: [new Paragraph({ text: header, bold: true })],
                  shading: { fill: primaryColor },
                })
              )
            }),
            ...content.rows.map((row: string[]) => 
              new TableRow({
                children: row.map((cell: string) => 
                  new TableCell({
                    children: [new Paragraph({ text: String(cell) })],
                  })
                )
              })
            )
          ];
          children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          children.push(new Paragraph({ text: "" })); // spacing after table
        }
        break;

      case 'bullet_list':
        const bullets = Array.isArray(content) ? content : (content.bullets || content.items || []);
        if (Array.isArray(bullets)) {
          for (const bullet of bullets) {
            children.push(new Paragraph({
              text: String(bullet),
              bullet: { level: 0 },
              spacing: { after: 100 }
            }));
          }
        }
        break;
    }
  }

  const doc = new Document({
    creator: "A.R.I.A. Workspace",
    title: masterJson.metadata.title || "Document",
    sections: [{ properties: {}, children }],
  });

  return (await Packer.toBuffer(doc)) as Buffer;
}

export async function compileXlsx(masterJson: MasterDocumentJSON): Promise<Buffer> {
  const ExcelJSModule = await import("exceljs");
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const wb = new ExcelJS.Workbook();
  wb.creator = "A.R.I.A. Workspace";
  
  // ARGB Colors (FF + Hex)
  const colors = masterJson.metadata?.colors || { primary: "#4F46E5", secondary: "#818CF8", accent: "#F59E0B" };
  const primaryColor = (colors.primary || "#4F46E5").replace("#", "FF"); 
  const secondaryColor = (colors.secondary || "#818CF8").replace("#", "FF");
  const accentColor = (colors.accent || "#F59E0B").replace("#", "FF");

  // Premium thin border style
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
  };

  // Pre-procesar agresivamente la estructura
  let structureToProcess = masterJson.structure || [];
  
  // Normalizar: si la estructura no es un array, envolverla
  if (!Array.isArray(structureToProcess)) {
    structureToProcess = [structureToProcess];
  }

  // Handle top-level "sheets" array format (from system prompt)
  const topSheets = (masterJson as any).sheets;
  if (Array.isArray(topSheets) && topSheets.length > 0 && structureToProcess.length === 0) {
    structureToProcess = topSheets.map((s: any) => ({
      type: 'sheet',
      content: {
        name: s.name || "Hoja",
        tables: s.rows ? [{ headers: s.rows[0], rows: s.rows.slice(1) }] : []
      }
    }));
  }

  // Handle top-level "paragraphs" as text content (docx-style data in xlsx)
  const topParagraphs = (masterJson as any).paragraphs;
  if (Array.isArray(topParagraphs) && topParagraphs.length > 0 && structureToProcess.length === 0) {
    structureToProcess = [{
      type: 'sheet',
      content: {
        name: "Contenido",
        tables: [{
          headers: ["Contenido"],
          rows: topParagraphs.map((p: string) => [p])
        }]
      }
    }];
  }

  // Encontrar cualquier cosa que parezca una tabla
  const rawTables = structureToProcess.filter((item: any) => 
    item.type === 'table' || item.headers || item.rows || item.content?.headers || item.content?.rows || item.sheet?.headers || item.sheet?.rows
  );
  
  const hasSheets = structureToProcess.some((item: any) => item.type === 'sheet' || item.sheet);
  
  if (rawTables.length > 0 && !hasSheets) {
    structureToProcess = [{
      type: 'sheet',
      content: {
        name: "Datos",
        tables: rawTables.map((t: any) => {
          if (t.headers || t.rows) return t;
          if (t.content?.headers || t.content?.rows) return t.content;
          if (t.sheet?.headers || t.sheet?.rows) return t.sheet;
          return t;
        })
      }
    }];
  }

  for (const item of structureToProcess) {
    // Es una hoja si dice type: sheet O si tiene tables en algun lado O si directamente tiene headers/rows
    const isSheet = item.type === 'sheet' || item.tables || item.content?.tables || item.sheet?.tables || item.headers || item.rows || item.content?.headers || item.content?.rows;
    
    if (isSheet) {
      let sheetContent = item.sheet || item.content || item;
      
      // Si la hoja no tiene un array de tables, pero tiene headers/rows directamente, lo envolvemos
      if (!sheetContent.tables && (sheetContent.headers || sheetContent.rows)) {
        sheetContent = {
          name: sheetContent.name || "Hoja",
          tables: [sheetContent]
        };
      }

      // Si aun no hay tables, intentar buscar en el item raiz
      if (!sheetContent.tables && (item.headers || item.rows)) {
        sheetContent = {
          name: item.name || "Hoja",
          tables: [item]
        };
      }

      // Validacion de seguridad
      if (!sheetContent.tables || !Array.isArray(sheetContent.tables)) continue;

      const ws = wb.addWorksheet(sheetContent.name?.slice(0, 31) || "Hoja");
      ws.properties.defaultRowHeight = 25; // More breathing room
      
      let currentRowIndex = 2; // Start a bit lower for padding
      
      for (const table of sheetContent.tables) {
        const colCount = table.headers ? table.headers.length : (table.rows?.[0]?.length || 5);
        
        // 1. Beautiful Title Banner
        if (table.title) {
          const titleRow = ws.getRow(currentRowIndex);
          titleRow.height = 35;
          const cell = titleRow.getCell(2);
          cell.value = table.title.toUpperCase();
          cell.font = { bold: true, size: 16, color: { argb: primaryColor }, name: 'Segoe UI' };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          
          // Merge title across the table width
          const endCol = 1 + colCount;
          ws.mergeCells(currentRowIndex, 2, currentRowIndex, endCol);
          currentRowIndex += 2;
        }

        // 2. Freeze Panes for Headers if we are at the top
        if (currentRowIndex <= 5 && table.headers) {
           ws.views = [{ state: 'frozen', xSplit: 1, ySplit: currentRowIndex }];
        }

        let headerRowIndex = currentRowIndex;

        // 3. Stunning Headers
        if (table.headers) {
          const headerRow = ws.getRow(currentRowIndex);
          headerRow.height = 30;
          
          table.headers.forEach((headerText: string, i: number) => {
            const cell = headerRow.getCell(i + 2); // Start at col B for margin
            cell.value = headerText;
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12, name: 'Segoe UI' };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: primaryColor }
            };
            cell.border = {
              ...thinBorder,
              bottom: { style: 'medium', color: { argb: accentColor } } // Accent bottom border
            };
          });
          currentRowIndex++;
        }

        // 4. Data Rows with Zebra Striping
        if (table.rows) {
          table.rows.forEach((rowData: any[], rowIndex: number) => {
            const row = ws.getRow(currentRowIndex);
            row.height = 22;
            
            rowData.forEach((val: any, i: number) => {
              const cell = row.getCell(i + 2);
              if (val && typeof val === 'object' && val.formula) {
                cell.value = { formula: val.formula };
              } else {
                cell.value = val;
              }
              cell.font = { size: 11, name: 'Segoe UI', color: { argb: 'FF333333' } };
              cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
              cell.border = thinBorder;
              
              // Zebra Striping (Alternating light gray)
              if (rowIndex % 2 === 1) {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFF9FAFB' } // Very light gray
                };
              }
            });
            currentRowIndex++;
          });
        }
        
        // Auto-fit Columns (estimating width based on content)
        if (table.headers || table.rows) {
          for (let i = 0; i < colCount; i++) {
             let maxLength = table.headers?.[i]?.length || 10;
             table.rows?.forEach(r => {
                const len = r[i] ? r[i].toString().length : 0;
                if (len > maxLength) maxLength = len;
             });
             // Max width 50, Min width 15
             ws.getColumn(i + 2).width = Math.min(50, Math.max(15, maxLength + 5));
          }
          // Make first column (margin) tiny
          ws.getColumn(1).width = 3;
        }

        currentRowIndex += 3; // Spacing before next table
      }
    }
  }

  // Fallback if no sheets were found
  if (wb.worksheets.length === 0) {
     wb.addWorksheet("Datos A.R.I.A");
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function compilePptx(masterJson: MasterDocumentJSON): Promise<Buffer> {
  const pptxgenModule = await import("pptxgenjs");
  const pptxgen = pptxgenModule.default || pptxgenModule;
  const pptx = new pptxgen();
  pptx.author = "A.R.I.A. Workspace";
  
  const colors = masterJson.metadata?.colors || { primary: "#4F46E5", background: "#1A1A2E" };
  const primaryColor = (colors.primary || "#4F46E5").replace("#", "");
  const bgColor = (colors.background || "#1A1A2E").replace("#", "");

  // Render slides based on structure
  for (const item of masterJson.structure) {
    const content = item.content || item;
    
    if (item.type === 'cover_page') {
      const cover = pptx.addSlide();
      cover.background = { color: bgColor };
      cover.addText(content.title || "", {
        x: 0.5, y: 1.5, w: 9, h: 1.5,
        fontSize: 44, bold: true, color: primaryColor, align: "center",
      });
      if (content.subtitle) {
        cover.addText(content.subtitle, {
          x: 0.5, y: 3.5, w: 9, h: 1,
          fontSize: 24, color: "555555", align: "center",
        });
      }
    }
    else if (item.type === 'slide') {
      const slide = pptx.addSlide();
      slide.background = { color: bgColor };
      
      slide.addText(content.title || "", {
        x: 0.5, y: 0.3, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: primaryColor,
      });

      const components = content.components || [];
      if (components.length > 0) {
        let currentY = 1.5;
        for (const comp of components) {
          const compContent = comp.content || comp;
          if (comp.type === 'paragraph') {
            slide.addText(typeof compContent === 'string' ? compContent : compContent.text || "", { x: 0.5, y: currentY, w: 9, h: 1, fontSize: 18, color: "333333" });
            currentY += 1.2;
          } else if (comp.type === 'bullet_list') {
             const bullets = Array.isArray(compContent) ? compContent : (compContent.bullets || compContent.items || []);
             slide.addText(
               bullets.map((b: string) => ({ text: b, options: { bullet: true, breakLine: true } })),
               { x: 0.5, y: currentY, w: 9, h: 3, fontSize: 18, color: "333333", valign: "top" }
             );
             currentY += 3;
          }
        }
      }
    }
  }

  // Fallback slide if empty
  if (masterJson.structure.filter(s => s.type === 'cover_page' || s.type === 'slide').length === 0) {
     pptx.addSlide().addText("Presentación Generada", { x: 1, y: 2, w: 8, h: 1, align: "center", fontSize: 24 });
  }

  const out = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(out as ArrayBuffer);
}
