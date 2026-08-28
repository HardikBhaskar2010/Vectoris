/**
 * pdfExtractor.ts — Local-first PDF & Drawing Page Extractor.
 *
 * Extracts page counts, sheet dimensions, text content streams,
 * and title block metadata from engineering drawing packages.
 */

export interface ExtractedPage {
  pageNumber: number;
  width: number;
  height: number;
  aspectRatio: number;
  format: "ARCH_D" | "ARCH_E" | "ISO_A0" | "ISO_A1" | "LETTER" | "CUSTOM";
  rawText: string;
  lines: string[];
  titleBlock?: {
    sheetNumber: string;
    sheetTitle: string;
    scale?: string;
    revision?: string;
    discipline?: string;
  };
}

export interface ExtractedDocumentPackage {
  filename: string;
  pageCount: number;
  fileSizeBytes: number;
  pages: ExtractedPage[];
  extractedAt: string;
}

export class PdfExtractor {
  /**
   * Parses an ArrayBuffer or binary string of a PDF or text drawing stream into structured pages.
   */
  public async extractDocument(
    filename: string,
    data: ArrayBuffer | Uint8Array | string
  ): Promise<ExtractedDocumentPackage> {
    let textContent = "";
    let sizeBytes = 0;

    if (typeof data === "string") {
      textContent = data;
      sizeBytes = data.length;
    } else {
      sizeBytes = data.byteLength;
      const decoder = new TextDecoder("utf-8", { fatal: false });
      textContent = decoder.decode(data);
    }

    const pages = this.parsePagesFromStream(textContent);

    return {
      filename,
      pageCount: Math.max(1, pages.length),
      fileSizeBytes: sizeBytes,
      pages: pages.length > 0 ? pages : [this.createFallbackPage(1, textContent)],
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Parses page objects, text chunks, and media boxes from raw PDF / text content.
   */
  private parsePagesFromStream(content: string): ExtractedPage[] {
    const pages: ExtractedPage[] = [];

    // Check for standard PDF page delimiters /Page
    const pageSplits = content.split(/\/Type\s*\/Page\b/i);

    if (pageSplits.length > 1) {
      for (let i = 1; i < pageSplits.length; i++) {
        const chunk = pageSplits[i];
        const pageText = this.extractTextFromPdfChunk(chunk);
        const dimensions = this.extractDimensionsFromPdfChunk(chunk);
        const lines = pageText
          .split(/[\r\n]+/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        const titleBlock = this.extractTitleBlock(lines, i);

        pages.push({
          pageNumber: i,
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: dimensions.width / (dimensions.height || 1),
          format: dimensions.format,
          rawText: pageText,
          lines,
          titleBlock,
        });
      }
    } else {
      // Fallback: Partition text by Form Feed or Page Break markers
      const textPages = content.split(/[\f]|\bPage\s+\d+\b/i);
      for (let i = 0; i < textPages.length; i++) {
        const pageText = textPages[i].trim();
        if (!pageText && textPages.length > 1) continue;

        const lines = pageText
          .split(/[\r\n]+/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        const titleBlock = this.extractTitleBlock(lines, i + 1);

        pages.push({
          pageNumber: i + 1,
          width: 3300,
          height: 2550,
          aspectRatio: 3300 / 2550,
          format: "ARCH_D",
          rawText: pageText,
          lines,
          titleBlock,
        });
      }
    }

    return pages;
  }

  /**
   * Extracts visible strings from PDF stream syntax.
   */
  private extractTextFromPdfChunk(chunk: string): string {
    const extracted: string[] = [];

    // Extract text in parentheses (Tj / TJ operators)
    const parenRegex = /\(([^)]+)\)\s*T[jJ]/g;
    let match: RegExpExecArray | null;
    while ((match = parenRegex.exec(chunk)) !== null) {
      extracted.push(match[1]);
    }

    // Extract text in brackets [(...)...] TJ
    const bracketRegex = /\[([^\]]+)\]\s*TJ/gi;
    while ((match = bracketRegex.exec(chunk)) !== null) {
      const inner = match[1];
      const innerMatch = inner.match(/\(([^)]+)\)/g);
      if (innerMatch) {
        extracted.push(innerMatch.map((s) => s.replace(/[()]/g, "")).join(" "));
      }
    }

    // If stream did not yield standard Tj, harvest plain alphanumeric lines
    if (extracted.length === 0) {
      const rawLines = chunk.split(/[\r\n]+/);
      for (const line of rawLines) {
        const clean = line.replace(/[^a-zA-Z0-9\s.,_\-/#:()]/g, " ").trim();
        if (clean.length > 3 && !clean.startsWith("endobj") && !clean.startsWith("stream")) {
          extracted.push(clean);
        }
      }
    }

    return extracted.join("\n");
  }

  /**
   * Extracts MediaBox dimensions from PDF chunk.
   */
  private extractDimensionsFromPdfChunk(chunk: string): {
    width: number;
    height: number;
    format: ExtractedPage["format"];
  } {
    const mediaBoxMatch = chunk.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/i);
    if (mediaBoxMatch) {
      const w = parseFloat(mediaBoxMatch[3]) - parseFloat(mediaBoxMatch[1]);
      const h = parseFloat(mediaBoxMatch[4]) - parseFloat(mediaBoxMatch[2]);
      return {
        width: Math.round(w),
        height: Math.round(h),
        format: this.classifyDimensions(w, h),
      };
    }
    // Default standard architectural sheet (24x36 inches at 72 dpi = 1728 x 2592 pt)
    return { width: 2592, height: 1728, format: "ARCH_D" };
  }

  private classifyDimensions(w: number, h: number): ExtractedPage["format"] {
    const maxDim = Math.max(w, h);
    const minDim = Math.min(w, h);

    if (maxDim > 3000) return "ARCH_E";
    if (maxDim >= 2400) return "ARCH_D";
    if (maxDim >= 2000) return "ISO_A0";
    if (maxDim >= 1400) return "ISO_A1";
    if (maxDim <= 850) return "LETTER";
    return "CUSTOM";
  }

  /**
   * Detects title block metadata from page lines.
   */
  public extractTitleBlock(lines: string[], pageNum: number): ExtractedPage["titleBlock"] {
    let sheetNumber = `E-${String(100 + pageNum).padStart(3, "0")}`;
    let sheetTitle = `Electrical Drawing Sheet ${pageNum}`;
    let scale = "1:100";
    let revision = "Rev 0";
    let discipline = "Electrical";

    // Common drawing sheet ID patterns (e.g. E-001, E-101, SLD-01, EP-102, EL-101, E-201A)
    const sheetIdRegex = /\b([A-Z]{1,3}[-–_.]?\d{2,4}[A-Z]?)\b/i;
    const scaleRegex = /\b(SCALE|SCALE\s*:)\s*([1-9][0-9]*:[1-9][0-9]*|[1-9]\/[0-9]+"=\s*[1-9]'?-?0"?|NTS)\b/i;
    const revRegex = /\b(REV|REVISION|REV\s*:)\s*([0-9A-Z]+)\b/i;

    for (const line of lines) {
      // Look for explicit sheet number tags
      if (/DRAWING\s*(NO|NUMBER)|SHEET\s*(NO|NUMBER)/i.test(line)) {
        const match = line.match(sheetIdRegex);
        if (match) sheetNumber = match[1].toUpperCase();
      } else if (!sheetNumber.startsWith("E-1") && sheetIdRegex.test(line)) {
        const match = line.match(sheetIdRegex);
        if (match && /^(E|EP|EL|FA|SLD|P|M|C)\d+/i.test(match[1])) {
          sheetNumber = match[1].toUpperCase();
        }
      }

      // Scale
      const scaleMatch = line.match(scaleRegex);
      if (scaleMatch) scale = scaleMatch[2];

      // Revision
      const revMatch = line.match(revRegex);
      if (revMatch) revision = `Rev ${revMatch[2]}`;

      // Sheet title heuristics
      const titlePrefixMatch = line.match(/^(TITLE|SHEET TITLE|DRAWING TITLE|SHEET NAME)\s*[:.-]\s*(.+)/i);
      if (titlePrefixMatch && titlePrefixMatch[2].trim().length > 2) {
        sheetTitle = titlePrefixMatch[2].trim();
      } else if (
        sheetTitle.startsWith("Electrical Drawing Sheet") &&
        /(SINGLE\s*LINE\s*DIAGRAM|POWER\s*DISTRIBUTION\s*LAYOUT|LIGHTING\s*LAYOUT|CABLE\s*TRAY\s*PLAN|PANEL\s*SCHEDULE|EQUIPMENT\s*LAYOUT)/i.test(
          line
        ) &&
        line.length < 60
      ) {
        sheetTitle = line.trim();
      }
    }

    if (/LIGHTING/i.test(sheetTitle)) discipline = "Lighting";
    else if (/POWER|FEEDER|SWITCHGEAR|SLD/i.test(sheetTitle)) discipline = "Power Distribution";
    else if (/CABLE\s*TRAY|CONDUIT/i.test(sheetTitle)) discipline = "Containment";

    return {
      sheetNumber,
      sheetTitle,
      scale,
      revision,
      discipline,
    };
  }

  private createFallbackPage(pageNum: number, text: string): ExtractedPage {
    const lines = text
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return {
      pageNumber: pageNum,
      width: 2592,
      height: 1728,
      aspectRatio: 2592 / 1728,
      format: "ARCH_D",
      rawText: text,
      lines,
      titleBlock: this.extractTitleBlock(lines, pageNum),
    };
  }
}

export const pdfExtractor = new PdfExtractor();
