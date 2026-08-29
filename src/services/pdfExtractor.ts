/**
 * pdfExtractor.ts — Local-first PDF & Drawing Page Extractor.
 *
 * Extracts page counts, sheet dimensions, decompressed text content streams (FlateDecode),
 * text item coordinates / bounding boxes, and title block metadata from engineering drawing packages.
 */

export interface ExtractedTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  normalizedCoordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  bbox: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized (0.0 - 1.0)
}

export interface ExtractedPage {
  pageNumber: number;
  width: number;
  height: number;
  aspectRatio: number;
  format: "ARCH_D" | "ARCH_E" | "ISO_A0" | "ISO_A1" | "LETTER" | "CUSTOM";
  rawText: string;
  lines: string[];
  textItems?: ExtractedTextItem[];
  extractionMode?: "vector_text" | "vector_text_only — raster OCR deferred";
  titleBlock?: {
    sheetNumber?: string;
    sheetTitle?: string;
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

/**
 * Decompresses zlib / deflate compressed stream bytes using standard Web API DecompressionStream.
 */
async function decompressFlate(compressedBytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined" || compressedBytes.length === 0) {
    return null;
  }

  // Attempt 1: Standard zlib / deflate
  try {
    const ds = new DecompressionStream("deflate");
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(compressedBytes);
        controller.close();
      },
    });
    const decompressedStream = stream.pipeThrough(ds);
    const response = new Response(decompressedStream);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    // Attempt 2: Raw deflate (omitting 2-byte zlib header)
    try {
      const dsRaw = new DecompressionStream("deflate-raw");
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(compressedBytes);
          controller.close();
        },
      });
      const decompressedStream = stream.pipeThrough(dsRaw);
      const response = new Response(decompressedStream);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }
}

/**
 * Byte-level search for stream ... endstream markers to guarantee exact byte slice extraction.
 */
function findStreamInBytes(
  bytes: Uint8Array,
  startSearchPos: number
): { streamStart: number; streamEnd: number; nextSearchPos: number } | null {
  const streamPattern = [115, 116, 114, 101, 97, 109]; // "stream"
  const endstreamPattern = [101, 110, 100, 115, 116, 114, 101, 97, 109]; // "endstream"

  let sPos = -1;
  for (let i = startSearchPos; i <= bytes.length - 6; i++) {
    let match = true;
    for (let j = 0; j < 6; j++) {
      if (bytes[i + j] !== streamPattern[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      sPos = i;
      break;
    }
  }
  if (sPos === -1) return null;

  let streamStart = sPos + 6;
  if (bytes[streamStart] === 13 && bytes[streamStart + 1] === 10) {
    streamStart += 2; // \r\n
  } else if (bytes[streamStart] === 10) {
    streamStart += 1; // \n
  } else if (bytes[streamStart] === 13) {
    streamStart += 1; // \r
  }

  let ePos = -1;
  for (let i = streamStart; i <= bytes.length - 9; i++) {
    let match = true;
    for (let j = 0; j < 9; j++) {
      if (bytes[i + j] !== endstreamPattern[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      ePos = i;
      break;
    }
  }
  if (ePos === -1) return null;

  let streamEnd = ePos;
  while (
    streamEnd > streamStart &&
    (bytes[streamEnd - 1] === 10 || bytes[streamEnd - 1] === 13 || bytes[streamEnd - 1] === 32)
  ) {
    streamEnd--;
  }

  return {
    streamStart,
    streamEnd,
    nextSearchPos: ePos + 9,
  };
}

/**
 * Extracts visible string operators (Tj / TJ / ') and exact text geometry from PDF stream text.
 */
function extractTextAndGeometryFromStream(
  streamText: string,
  pageWidth: number,
  pageHeight: number
): { lines: string[]; textItems: ExtractedTextItem[] } {
  const lines: string[] = [];
  const textItems: ExtractedTextItem[] = [];

  const safePageW = Math.max(1, pageWidth);
  const safePageH = Math.max(1, pageHeight);

  // Helper to build a normalized text item
  const buildTextItem = (str: string, x: number, y: number, fSize: number): ExtractedTextItem => {
    const estWidthPts = Math.max(1, str.length * fSize * 0.6);
    const estHeightPts = Math.max(1, fSize);

    // In PDF coordinates: (0,0) is bottom-left, y points up
    // In UI coordinates: (0,0) is top-left, y points down
    const normX = Math.max(0, Math.min(1, Math.round((x / safePageW) * 10000) / 10000));
    const normY = Math.max(0, Math.min(1, Math.round(((safePageH - (y + estHeightPts)) / safePageH) * 10000) / 10000));
    const normW = Math.max(0.0001, Math.min(1, Math.round((estWidthPts / safePageW) * 10000) / 10000));
    const normH = Math.max(0.0001, Math.min(1, Math.round((estHeightPts / safePageH) * 10000) / 10000));

    const ymin = normY;
    const xmin = normX;
    const ymax = Math.max(0, Math.min(1, Math.round(((safePageH - y) / safePageH) * 10000) / 10000));
    const xmax = Math.max(0, Math.min(1, Math.round(((x + estWidthPts) / safePageW) * 10000) / 10000));

    return {
      text: str,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      width: Math.round(estWidthPts * 100) / 100,
      height: Math.round(estHeightPts * 100) / 100,
      normalizedCoordinates: {
        x: normX,
        y: normY,
        width: normW,
        height: normH,
      },
      bbox: [ymin, xmin, ymax, xmax],
    };
  };

  // State machine tracking PDF text placement operators
  const tokenRegex = /(?:(\((?:[^()\\]|\\.)*\))\s*(Tj|'|"))|(?:\[((?:[^\]\\]|\\.)*)\]\s*TJ)|(?:(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm)|(?:(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(Td|TD))|(?:(-?\d+(?:\.\d+)?)\s+TL)|(?:\/(\w+)\s+(-?\d+(?:\.\d+)?)\s+Tf)|(T\*)|(BT)|(ET)/g;

  let curX = 0;
  let curY = 0;
  let lineStartX = 0;
  let lineStartY = 0;
  let fontSize = 12;
  let leading = 14;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(streamText)) !== null) {
    // 1. Literal string Tj / ' / "
    if (match[1] !== undefined) {
      const rawStr = match[1].slice(1, -1);
      const clean = rawStr
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .trim();
      const op = match[2];

      if (op === "'" || op === '"') {
        lineStartY -= leading;
        curX = lineStartX;
        curY = lineStartY;
      }

      if (clean.length > 0) {
        lines.push(clean);
        textItems.push(buildTextItem(clean, curX, curY, fontSize));
        curX += clean.length * fontSize * 0.6;
      }
    }
    // 2. Bracketed array TJ
    else if (match[3] !== undefined) {
      const inner = match[3];
      const partRegex = /\(([^)]*)\)/g;
      let partMatch: RegExpExecArray | null;
      const parts: string[] = [];
      while ((partMatch = partRegex.exec(inner)) !== null) {
        parts.push(partMatch[1].replace(/\\([()\\])/g, "$1"));
      }
      const combined = parts.join("").trim();
      if (combined.length > 0) {
        lines.push(combined);
        textItems.push(buildTextItem(combined, curX, curY, fontSize));
        curX += combined.length * fontSize * 0.6;
      }
    }
    // 3. Set text matrix Tm
    else if (match[4] !== undefined) {
      const a = parseFloat(match[4]);
      const b = parseFloat(match[5]);
      const e = parseFloat(match[8]);
      const f = parseFloat(match[9]);
      curX = e;
      curY = f;
      lineStartX = e;
      lineStartY = f;
      const scaleFromMatrix = Math.sqrt(a * a + b * b);
      if (scaleFromMatrix > 0) fontSize = scaleFromMatrix;
    }
    // 4. Move text position Td / TD
    else if (match[10] !== undefined) {
      const dx = parseFloat(match[10]);
      const dy = parseFloat(match[11]);
      const op = match[12];
      lineStartX += dx;
      lineStartY += dy;
      curX = lineStartX;
      curY = lineStartY;
      if (op === "TD") {
        leading = -dy;
      }
    }
    // 5. Leading TL
    else if (match[13] !== undefined) {
      leading = parseFloat(match[13]);
    }
    // 6. Font selection Tf
    else if (match[14] !== undefined) {
      const parsedSize = parseFloat(match[15]);
      if (parsedSize > 0) fontSize = parsedSize;
    }
    // 7. Newline T*
    else if (match[16] !== undefined) {
      lineStartY -= leading;
      curX = lineStartX;
      curY = lineStartY;
    }
    // 8. BT
    else if (match[17] !== undefined) {
      curX = 0;
      curY = 0;
      lineStartX = 0;
      lineStartY = 0;
    }
  }

  // Fallback if no lines matched via regex tokenizer but stream has plain text
  if (lines.length === 0 && (streamText.includes("BT") || streamText.includes("ET"))) {
    const rawLines = streamText.split(/[\r\n]+/);
    for (const l of rawLines) {
      const clean = l.replace(/[^a-zA-Z0-9\s.,_\-/#:()]/g, " ").trim();
      if (
        clean.length > 3 &&
        !clean.startsWith("stream") &&
        !clean.startsWith("endstream") &&
        !clean.startsWith("endobj")
      ) {
        lines.push(clean);
      }
    }
  }

  return { lines, textItems };
}

export class PdfExtractor {
  /**
   * Parses an ArrayBuffer or binary Uint8Array of a PDF drawing into structured pages.
   */
  public async extractDocument(
    filename: string,
    data: Uint8Array | ArrayBuffer | string
  ): Promise<ExtractedDocumentPackage> {
    let bytes: Uint8Array;

    if (typeof data === "string") {
      const encoder = new TextEncoder();
      bytes = encoder.encode(data);
    } else if (data instanceof Uint8Array) {
      bytes = data;
    } else {
      bytes = new Uint8Array(data);
    }

    if (bytes.length === 0) {
      throw new Error(`Cannot extract empty 0-byte document: ${filename}`);
    }

    const pages = await this.parsePdfPages(bytes);

    return {
      filename,
      pageCount: Math.max(1, pages.length),
      fileSizeBytes: bytes.length,
      pages: pages.length > 0 ? pages : [this.createEmptyPage(1, 2592, 1728)],
      extractedAt: new Date().toISOString(),
    };
  }

  /**
   * Scans raw PDF binary for page delimiters, decompresses Flate streams, and extracts text.
   */
  private async parsePdfPages(bytes: Uint8Array): Promise<ExtractedPage[]> {
    const latin1Decoder = new TextDecoder("latin1");
    const rawPdf = latin1Decoder.decode(bytes);

    // Identify page objects or page splits
    const pageChunks = this.splitIntoPages(rawPdf, bytes);
    const extractedPages: ExtractedPage[] = [];

    for (let i = 0; i < pageChunks.length; i++) {
      const chunk = pageChunks[i];
      const pageNum = i + 1;
      const dimensions = this.extractDimensions(chunk.rawText);

      // Extract and decompress text & geometry from this page's streams
      const { rawText, lines, textItems } = await this.extractPageTextAndGeometry(
        chunk.byteStart,
        chunk.byteEnd,
        bytes,
        dimensions.width,
        dimensions.height
      );

      const titleBlock = this.extractTitleBlock(lines, pageNum);
      const isRasterOrEmpty = lines.length === 0 || textItems.length === 0;

      extractedPages.push({
        pageNumber: pageNum,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: dimensions.width / (dimensions.height || 1),
        format: dimensions.format,
        rawText,
        lines,
        textItems,
        extractionMode: isRasterOrEmpty ? "vector_text_only — raster OCR deferred" : "vector_text",
        titleBlock,
      });
    }

    return extractedPages;
  }

  /**
   * Partitions the raw PDF into individual page chunks.
   */
  private splitIntoPages(
    rawPdf: string,
    bytes: Uint8Array
  ): Array<{ rawText: string; byteStart: number; byteEnd: number }> {
    const pages: Array<{ rawText: string; byteStart: number; byteEnd: number }> = [];

    // Find /Type /Page occurrences (not /Pages)
    const pageRegex = /\/Type\s*\/Page\b(?!\s*s)/gi;
    const matches: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = pageRegex.exec(rawPdf)) !== null) {
      matches.push(match.index);
    }

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i];
        const end = i + 1 < matches.length ? matches[i + 1] : rawPdf.length;
        pages.push({
          rawText: rawPdf.substring(start, end),
          byteStart: start,
          byteEnd: end,
        });
      }
      return pages;
    }

    // Fallback: check for form feed page breaks
    const formFeedSplits = rawPdf.split(/\f|\bPage\s+\d+\b/i);
    if (formFeedSplits.length > 1) {
      let cur = 0;
      for (const seg of formFeedSplits) {
        const segLen = seg.length;
        if (seg.trim().length > 0) {
          pages.push({
            rawText: seg,
            byteStart: cur,
            byteEnd: cur + segLen,
          });
        }
        cur += segLen + 1;
      }
      return pages;
    }

    // Entire document is a single page
    pages.push({
      rawText: rawPdf,
      byteStart: 0,
      byteEnd: bytes.length,
    });

    return pages;
  }

  /**
   * Extracts text and geometry from uncompressed and FlateDecode streams in a page chunk.
   */
  private async extractPageTextAndGeometry(
    byteStart: number,
    byteEnd: number,
    fullBytes: Uint8Array,
    pageWidth: number,
    pageHeight: number
  ): Promise<{ rawText: string; lines: string[]; textItems: ExtractedTextItem[] }> {
    const extractedLines: string[] = [];
    const extractedTextItems: ExtractedTextItem[] = [];
    const latin1Decoder = new TextDecoder("latin1");

    let curSearch = byteStart;
    while (curSearch < byteEnd) {
      const streamInfo = findStreamInBytes(fullBytes, curSearch);
      if (!streamInfo || streamInfo.streamStart >= byteEnd) {
        break;
      }

      // Inspect dictionary prefix before the stream
      const dictStart = Math.max(byteStart, streamInfo.streamStart - 300);
      const dictPrefix = latin1Decoder.decode(fullBytes.subarray(dictStart, streamInfo.streamStart));
      const isFlate = /\/Filter\s*(\/FlateDecode|\[\s*\/FlateDecode\s*\])/i.test(dictPrefix);

      // Check for explicit /Length in dictionary
      let endPos = streamInfo.streamEnd;
      const lengthMatch = dictPrefix.match(/\/Length\s+(\d+)/i);
      if (lengthMatch) {
        const explicitLen = parseInt(lengthMatch[1], 10);
        if (explicitLen > 0 && streamInfo.streamStart + explicitLen <= fullBytes.length) {
          endPos = streamInfo.streamStart + explicitLen;
        }
      }

      const streamBytes = fullBytes.subarray(streamInfo.streamStart, endPos);

      if (isFlate) {
        const decompressed = await decompressFlate(streamBytes);
        if (decompressed) {
          const utf8Decoder = new TextDecoder("utf-8", { fatal: false });
          const decompressedStr = utf8Decoder.decode(decompressed);
          const { lines, textItems } = extractTextAndGeometryFromStream(
            decompressedStr,
            pageWidth,
            pageHeight
          );
          extractedLines.push(...lines);
          extractedTextItems.push(...textItems);
        }
      } else {
        const plainStr = latin1Decoder.decode(streamBytes);
        const { lines, textItems } = extractTextAndGeometryFromStream(
          plainStr,
          pageWidth,
          pageHeight
        );
        extractedLines.push(...lines);
        extractedTextItems.push(...textItems);
      }

      curSearch = streamInfo.nextSearchPos;
    }

    // Also check text operators in chunk text outside streams if any
    const chunkText = latin1Decoder.decode(fullBytes.subarray(byteStart, byteEnd));
    const { lines: directLines, textItems: directItems } = extractTextAndGeometryFromStream(
      chunkText,
      pageWidth,
      pageHeight
    );
    for (let i = 0; i < directLines.length; i++) {
      const dl = directLines[i];
      if (!extractedLines.includes(dl)) {
        extractedLines.push(dl);
        if (directItems[i]) extractedTextItems.push(directItems[i]);
      }
    }

    return {
      rawText: extractedLines.join("\n"),
      lines: extractedLines,
      textItems: extractedTextItems,
    };
  }

  /**
   * Extracts MediaBox dimensions from page text.
   */
  private extractDimensions(chunk: string): {
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
    return { width: 2592, height: 1728, format: "ARCH_D" };
  }

  private classifyDimensions(w: number, h: number): ExtractedPage["format"] {
    const maxDim = Math.max(w, h);
    if (maxDim > 3000) return "ARCH_E";
    if (maxDim >= 2400) return "ARCH_D";
    if (maxDim >= 2000) return "ISO_A0";
    if (maxDim >= 1400) return "ISO_A1";
    if (maxDim <= 850) return "LETTER";
    return "CUSTOM";
  }

  /**
   * Detects title block metadata from extracted text lines.
   * Returns undefined if no title block or sheet metadata was found in text.
   */
  public extractTitleBlock(lines: string[], pageNum: number): ExtractedPage["titleBlock"] {
    let sheetNumber: string | undefined;
    let sheetTitle: string | undefined;
    let scale: string | undefined;
    let revision: string | undefined;
    let discipline: string | undefined;

    const sheetIdRegex = /\b([A-Z]{1,3}[-–_.]?\d{2,4}[A-Z]?)\b/i;
    const scaleRegex = /\b(?:SCALE|SCALE\s*:)\s*([1-9][0-9]*:[1-9][0-9]*|[1-9]\/[0-9]+"=\s*[1-9]'?-?0"?|NTS)\b/i;
    const revRegex = /\b(?:REV|REVISION|REV\s*:)\s*([0-9A-Z]+)\b/i;

    for (const line of lines) {
      if (/DRAWING\s*(?:NO|NUMBER)|SHEET\s*(?:NO|NUMBER)/i.test(line)) {
        const match = line.match(sheetIdRegex);
        if (match) sheetNumber = match[1].toUpperCase();
      } else if (!sheetNumber && sheetIdRegex.test(line)) {
        const match = line.match(sheetIdRegex);
        if (match && /^(E|EP|EL|FA|SLD|P|M|C|ARCH|STR)\d+/i.test(match[1])) {
          sheetNumber = match[1].toUpperCase();
        }
      }

      const scaleMatch = line.match(scaleRegex);
      if (scaleMatch) scale = scaleMatch[1];

      const revMatch = line.match(revRegex);
      if (revMatch) revision = `Rev ${revMatch[1]}`;

      const titlePrefixMatch = line.match(/^(?:TITLE|SHEET TITLE|DRAWING TITLE|SHEET NAME)\s*[:.-]\s*(.+)/i);
      if (titlePrefixMatch && titlePrefixMatch[1].trim().length > 2) {
        sheetTitle = titlePrefixMatch[1].trim();
      } else if (
        !sheetTitle &&
        /(?:SINGLE\s*LINE\s*DIAGRAM|POWER\s*DISTRIBUTION|LIGHTING\s*LAYOUT|CABLE\s*TRAY\s*PLAN|PANEL\s*SCHEDULE|EQUIPMENT\s*LAYOUT|SUBSTATION)/i.test(
          line
        ) &&
        line.length < 60
      ) {
        sheetTitle = line.trim();
      }

      if (!discipline) {
        if (/ELECTRICAL|POWER|LIGHTING|SUBSTATION|SINGLE LINE|CABLE TRAY/i.test(line)) {
          discipline = "Electrical";
        } else if (/MECHANICAL|HVAC|CHILLER|PIPING|PLUMBING/i.test(line)) {
          discipline = "Mechanical";
        }
      }
    }

    if (!sheetNumber && !sheetTitle && !scale && !revision && !discipline) {
      return undefined;
    }

    return {
      sheetNumber: sheetNumber || `Sheet-${pageNum}`,
      sheetTitle: sheetTitle || `Page ${pageNum}`,
      scale,
      revision,
      discipline,
    };
  }

  private createEmptyPage(pageNum: number, width: number, height: number): ExtractedPage {
    return {
      pageNumber: pageNum,
      width,
      height,
      aspectRatio: width / (height || 1),
      format: "ARCH_D",
      rawText: "",
      lines: [],
      textItems: [],
      extractionMode: "vector_text_only — raster OCR deferred",
      titleBlock: undefined,
    };
  }
}

export const pdfExtractor = new PdfExtractor();

