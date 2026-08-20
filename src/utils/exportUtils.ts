export const exportDocx = async (messages: { role: string; content: string }[], filename: string) => {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
  const content = messages.map(m => m.content).join("\n\n");
  
  const paragraphs = content.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return new Paragraph({ children: [] });

    // Handle Headers
    if (trimmed.startsWith('# ')) {
      return new Paragraph({
        text: trimmed.replace('# ', ''),
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
      });
    }
    if (trimmed.startsWith('## ')) {
      return new Paragraph({
        text: trimmed.replace('## ', ''),
        heading: HeadingLevel.HEADING_2,
      });
    }
    if (trimmed.startsWith('### ')) {
      return new Paragraph({
        text: trimmed.replace('### ', ''),
        heading: HeadingLevel.HEADING_3,
      });
    }

    // Handle bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return new Paragraph({
        children: [new TextRun(trimmed.substring(2))],
        bullet: { level: 0 }
      });
    }

    // Handle Bold Text
    const textRuns = [];
    const boldParts = trimmed.split(/(\*\*.*?\*\*)/g);
    boldParts.forEach(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        textRuns.push(new TextRun({ text: part.slice(2, -2), bold: true }));
      } else if (part) {
        textRuns.push(new TextRun(part));
      }
    });

    return new Paragraph({ children: textRuns });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportExcel = async (messages: { role: string; content: string }[], filename: string) => {
  const exceljs = await import('exceljs');
  const ExcelJS = exceljs.default || exceljs;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  const content = messages.map(m => m.content).join("\n");
  const rows = content.split('\n').filter(line => line.trim().length > 0 && !line.includes('---|'));
  
  rows.forEach((row, idx) => {
    // Basic Markdown Table Parser
    const cells = row.split('|').map(c => c.trim()).filter(c => c.length > 0);
    const finalCells = cells.length > 0 ? cells : [row.trim()];
    const addedRow = worksheet.addRow(finalCells);

    // Style Header Row
    if (idx === 0) {
      addedRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F46E5' } // Indigo color
        };
        cell.border = {
          top: {style:'thin'},
          left: {style:'thin'},
          bottom: {style:'thin'},
          right: {style:'thin'}
        };
      });
    } else {
      addedRow.eachCell(cell => {
        cell.border = {
          top: {style:'thin'},
          left: {style:'thin'},
          bottom: {style:'thin'},
          right: {style:'thin'}
        };
      });
    }
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, cell => {
      const colLength = cell.value ? cell.value.toString().length : 10;
      if (colLength > maxLength) {
        maxLength = colLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportPptx = async (messages: { role: string; content: string }[], filename: string) => {
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen();
  
  const content = messages.map(m => m.content).join("\n");
  
  // Create Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "131313" };
  titleSlide.addText(filename, { x: 1, y: 2, w: 8, fontSize: 36, bold: true, color: "818cf8", align: "center" });

  // Split content by headers to create multiple slides
  const slidesContent = content.split(/(?=# )/g);

  slidesContent.forEach(slideText => {
    if (!slideText.trim()) return;
    
    const lines = slideText.trim().split('\n');
    const header = lines[0].replace(/^#+\s/, '');
    const bodyText = lines.slice(1).join('\n').trim();

    const slide = pptx.addSlide();
    slide.background = { color: "1A1A1A" };
    
    // Slide Title
    slide.addText(header, { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 24, bold: true, color: "818cf8" });
    
    // Slide Body
    if (bodyText) {
      slide.addText(bodyText, { x: 0.5, y: 1.5, w: 9, h: 4, fontSize: 16, color: "E5E2E1", valign: 'top' });
    }
  });

  await pptx.writeFile({ fileName: `${filename}.pptx` });
};
