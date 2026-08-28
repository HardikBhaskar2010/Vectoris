/**
 * pdfExtractor.ts — Local-first PDF & Drawing Page Extractor.
 *
 * Extracts page counts, sheet dimensions, decompressed text content streams (FlateDecode),
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
 * Extracts visible string operators (Tj / TJ / ') from PDF stream text.
 */
function extractTextFromStream(streamText: string): string[] {
  const lines: string[] = [];

  // 1. Literal strings in parentheses: (text) Tj or (text) '
  const parenRegex = /\(([^)]*)\)\s*(?:T[jJ]|'|")/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(streamText)) !== null) {
    const clean = match[1]
      .replace(/\\([()\\])/g, "$1")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .trim();
    if (clean.length > 0) lines.push(clean);
  }

  // 2. Array of strings: [(text) 120 (more text)] TJ
  const bracketRegex = /\[([^\]]*)\]\s*TJ/gi;
  while ((match = bracketRegex.exec(streamText)) !== null) {
    const inner = match[1];
    const itemRegex = /\(([^)]*)\)/g;
    let itemMatch: RegExpExecArray | null;
    const parts: string[] = [];
    while ((itemMatch = itemRegex.exec(inner)) !== null) {
      parts.push(itemMatch[1].replace(/\\([()\\])/g, "$1"));
    }
    const combined = parts.join("").trim();
    if (combined.length > 0) lines.push(combined);
  }

  // 3. If stream contains BT ... ET text blocks without standard Tj, parse lines
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

  return lines;
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

      // Extract and decompress text from this page's streams
      const pageText = await this.extractPageText(chunk.byteStart, chunk.byteEnd, bytes);
      const dimensions = this.extractDimensions(chunk.rawText);

      const lines = pageText
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const titleBlock = this.extractTitleBlock(lines, pageNum);

      extractedPages.push({
        pageNumber: pageNum,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: dimensions.width / (dimensions.height || 1),
        format: dimensions.format,
        rawText: pageText,
        lines,
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
   * Extracts text from uncompressed and FlateDecode streams in a page chunk using byte-level parsing.
   */
  private async extractPageText(
    byteStart: number,
    byteEnd: number,
    fullBytes: Uint8Array
  ): Promise<string> {
    const extractedLines: string[] = [];
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
          const lines = extractTextFromStream(decompressedStr);
          extractedLines.push(...lines);
        }
      } else {
        const plainStr = latin1Decoder.decode(streamBytes);
        const lines = extractTextFromStream(plainStr);
        extractedLines.push(...lines);
      }

      curSearch = streamInfo.nextSearchPos;
    }

    // Also extract text operators outside stream blocks if any
    const chunkText = latin1Decoder.decode(fullBytes.subarray(byteStart, byteEnd));
    const directLines = extractTextFromStream(chunkText);
    for (const dl of directLines) {
      if (!extractedLines.includes(dl)) {
        extractedLines.push(dl);
      }
    }

    return extractedLines.join("\n");
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
   */
  public extractTitleBlock(lines: string[], pageNum: number): ExtractedPage["titleBlock"] {
    let sheetNumber = `E-${String(100 + pageNum).padStart(3, "0")}`;
    let sheetTitle = `Electrical Drawing Sheet ${pageNum}`;
    let scale = "1:100";
    let revision = "Rev 0";
    let discipline = "Electrical";

    const sheetIdRegex = /\b([A-Z]{1,3}[-–_.]?\d{2,4}[A-Z]?)\b/i;
    const scaleRegex = /\b(SCALE|SCALE\s*:)\s*([1-9][0-9]*:[1-9][0-9]*|[1-9]\/[0-9]+"=\s*[1-9]'?-?0"?|NTS)\b/i;
    const revRegex = /\b(REV|REVISION|REV\s*:)\s*([0-9A-Z]+)\b/i;

    for (const line of lines) {
      if (/DRAWING\s*(NO|NUMBER)|SHEET\s*(NO|NUMBER)/i.test(line)) {
        const match = line.match(sheetIdRegex);
        if (match) sheetNumber = match[1].toUpperCase();
      } else if (!sheetNumber.startsWith("E-1") && sheetIdRegex.test(line)) {
        const match = line.match(sheetIdRegex);
        if (match && /^(E|EP|EL|FA|SLD|P|M|C)\d+/i.test(match[1])) {
          sheetNumber = match[1].toUpperCase();
        }
      }

      const scaleMatch = line.match(scaleRegex);
      if (scaleMatch) scale = scaleMatch[2];

      const revMatch = line.match(revRegex);
      if (revMatch) revision = `Rev ${revMatch[2]}`;

      const titlePrefixMatch = line.match(/^(TITLE|SHEET TITLE|DRAWING TITLE|SHEET NAME)\s*[:.-]\s*(.+)/i);
      if (titlePrefixMatch && titlePrefixMatch[2].trim().length > 2) {
        sheetTitle = titlePrefixMatch[2].trim();
      } else if (
        sheetTitle.startsWith("Electrical Drawing Sheet") &&
        /(SINGLE\s*LINE\s*DIAGRAM|POWER\s*DISTRIBUTION|LIGHTING\s*LAYOUT|CABLE\s*TRAY\s*PLAN|PANEL\s*SCHEDULE|EQUIPMENT\s*LAYOUT)/i.test(
          line
        ) &&
        line.length < 60
      ) {
        sheetTitle = line.trim();
      }
    }

    return {
      sheetNumber,
      sheetTitle,
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
      titleBlock: {
        sheetNumber: `E-${String(100 + pageNum).padStart(3, "0")}`,
        sheetTitle: `Drawing Sheet ${pageNum}`,
        scale: "1:100",
        revision: "Rev 0",
        discipline: "Electrical",
      },
    };
  }
}

export const pdfExtractor = new PdfExtractor();
