/**
 * documentPipeline.test.ts — Unit & Integration tests for Document Pipeline.
 *
 * Tests:
 * 1. Compressed PDF (FlateDecode) Stream Extraction & Decompression
 * 2. PDF Page Extraction & Dimension Classification
 * 3. Title Block Metadata Parsing (Drawing No, Scale, Rev, Discipline)
 * 4. Discipline Sheet Classification Heuristics
 * 5. Honest Scanned / Raster Drawing Detection (Zero Hallucinated Takeoffs)
 * 6. Non-negotiable Reality Check: Missing / 0-byte input throws explicit error
 * 7. End-to-End Ingestion, Perception & Coordinate Normalization
 */

import { pdfExtractor } from "./pdfExtractor";
import { sheetClassifier } from "./sheetClassifier";
import { drawingPerceptionEngine } from "./drawingPerceptionEngine";
import { documentProcessingService } from "./documentProcessingService";
import { fileDialogService, type DocumentSource } from "./fileDialogService";
import type { ProjectDocument } from "../data/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

/**
 * Helper to construct a genuine binary PDF containing a FlateDecode compressed stream.
 */
async function createFlateCompressedPdf(): Promise<Uint8Array> {
  const streamContent = `
    BT
    /F1 12 Tf
    (DRAWING NO: SLD-401) Tj
    (TITLE: 11kV SUBSTATION SINGLE LINE DIAGRAM) Tj
    (SCALE: 1:100) Tj
    (REV: 1) Tj
    (800A MCCB 4P 35kA 2 NOS) Tj
    (1600kVA TRANSFORMER 11kV/415V 1 NOS) Tj
    (OVERHEAD CABLE TRAY 600MM 60 MTR) Tj
    ET
  `;

  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(streamContent));
  writer.close();
  const resp = new Response(cs.readable);
  const compressedBuffer = await resp.arrayBuffer();
  const compressedBytes = new Uint8Array(compressedBuffer);

  const prefix = new TextEncoder().encode(
    "%PDF-1.4\n1 0 obj\n<< /Type /Page /MediaBox [0 0 2592 1728] /Filter /FlateDecode /Length " +
      compressedBytes.length +
      " >>\nstream\n"
  );
  const suffix = new TextEncoder().encode("\nendstream\nendobj\n%%EOF");

  const total = new Uint8Array(prefix.length + compressedBytes.length + suffix.length);
  total.set(prefix, 0);
  total.set(compressedBytes, prefix.length);
  total.set(suffix, prefix.length + compressedBytes.length);
  return total;
}

export async function runDocumentPipelineTests(): Promise<void> {
  console.log("Starting Document Pipeline & Perception unit tests...");

  // Test 1: Real Binary PDF with FlateDecode Stream Decompression
  const flatePdfBytes = await createFlateCompressedPdf();
  const flateExtracted = await pdfExtractor.extractDocument("Substation_SLD_Compressed.pdf", flatePdfBytes);
  assert(flateExtracted.pageCount >= 1, "Expected at least 1 page from compressed PDF");
  assert(flateExtracted.pages[0].format === "ARCH_D", "Expected ARCH_D dimensions (2592 x 1728)");
  assert(
    flateExtracted.pages[0].titleBlock?.sheetNumber === "SLD-401",
    `Expected sheetNumber SLD-401 from decompressed stream, got ${flateExtracted.pages[0].titleBlock?.sheetNumber}`
  );
  assert(
    flateExtracted.pages[0].lines.length >= 4,
    `Expected at least 4 decompressed lines, got ${flateExtracted.pages[0].lines.length}`
  );

  // Test 2: Uncompressed Drawing Stream Parsing
  const samplePdfStream = `
    /Type /Page
    /MediaBox [0 0 2592 1728]
    (DRAWING NUMBER: E-101) Tj
    (TITLE: MAIN SWITCHGEAR & POWER DISTRIBUTION SINGLE LINE DIAGRAM) Tj
    (SCALE: 1:100) Tj
    (REV: 2) Tj
    (800A MCCB 4P 35kA 1 NOS) Tj
    (OVERHEAD CABLE TRAY 600MM 45 MTR) Tj
  `;

  const rawBytes = new TextEncoder().encode(samplePdfStream);
  const extracted = await pdfExtractor.extractDocument("Sample_SLD.pdf", rawBytes);
  assert(extracted.pageCount >= 1, "Expected at least 1 page extracted from sample PDF");
  assert(extracted.pages[0].format === "ARCH_D", "Expected ARCH_D sheet format classification");
  assert(
    extracted.pages[0].titleBlock?.sheetNumber === "E-101",
    `Expected sheetNumber E-101, got ${extracted.pages[0].titleBlock?.sheetNumber}`
  );
  assert(
    extracted.pages[0].titleBlock?.revision === "Rev 2",
    `Expected Rev 2, got ${extracted.pages[0].titleBlock?.revision}`
  );

  // Test 3: Discipline Sheet Classification
  const powerPage = extracted.pages[0];
  const powerClassification = sheetClassifier.classifyPage(powerPage);
  assert(
    powerClassification.category === "Power Distribution",
    `Expected category 'Power Distribution', got '${powerClassification.category}'`
  );
  assert(powerClassification.confidence >= 0.8, "Expected classification confidence >= 0.8");
  assert(powerClassification.drawingType === "single_line", "Expected drawingType 'single_line'");

  // Test 4: Honest Scanned / Raster PDF Detection (No Fake Line Items)
  const rasterPage = {
    pageNumber: 1,
    width: 2592,
    height: 1728,
    aspectRatio: 1.5,
    format: "ARCH_D" as const,
    rawText: "",
    lines: [],
    titleBlock: {
      sheetNumber: "SCAN-001",
      sheetTitle: "Scanned Drawing",
      discipline: "General",
    },
  };
  const rasterClassification = sheetClassifier.classifyPage(rasterPage);
  assert(
    rasterClassification.drawingType === "raster_scan",
    `Expected drawingType 'raster_scan', got '${rasterClassification.drawingType}'`
  );
  assert(
    rasterClassification.signals.some((s) => s.includes("visual perception / OCR required")),
    "Expected visual perception required signal for raster scan"
  );

  const rasterPerception = drawingPerceptionEngine.processSheet(
    "proj-123",
    "doc-raster",
    "scanned.pdf",
    rasterPage,
    rasterClassification
  );
  assert(
    rasterPerception.detections.length === 0,
    `Expected 0 detections for raster sheet, got ${rasterPerception.detections.length}`
  );
  assert(
    rasterPerception.lineItems.length === 0,
    `Expected 0 line items for raster sheet, got ${rasterPerception.lineItems.length}`
  );
  assert(rasterPerception.sheet.is_empty === true, "Expected raster sheet to be marked is_empty=true");

  // Test 5: Non-negotiable Reality Check — Missing / Empty bytes throws explicit Error
  const testDoc: ProjectDocument = {
    id: "doc-test-1",
    project_id: "proj-123",
    filename: "Power_Distribution_E101.pdf",
    format: "PDF",
    size_mb: 2.4,
    upload_status: "queued",
    sheet_count: null,
    uploaded_by: "Lead Engineer",
    uploaded_at: "Just now",
  };

  let threwOnMissing = false;
  try {
    await documentProcessingService.processDocument("proj-123", testDoc, undefined);
  } catch (err: any) {
    threwOnMissing = true;
    assert(err.message.includes("No readable file bytes provided"), "Expected clear missing bytes error");
  }
  assert(threwOnMissing, "Expected documentProcessingService to throw when file bytes are missing");

  // Test 6: End-to-End Pipeline via DocumentSource Boundary
  const docSource: DocumentSource = {
    type: "bytes",
    data: flatePdfBytes,
    filename: "Substation_SLD_Compressed.pdf",
  };

  const resolvedBytes = await fileDialogService.readDocumentBytes(docSource);
  assert(resolvedBytes.length === flatePdfBytes.length, "Expected resolved bytes length to match input");

  const fullResult = await documentProcessingService.processDocument(
    "proj-123",
    testDoc,
    resolvedBytes
  );

  assert(fullResult.documentId === "doc-test-1", "Expected documentId match in processing result");
  assert(fullResult.sheets.length >= 1, "Expected at least 1 sheet derived");
  assert(fullResult.detections.length >= 2, `Expected at least 2 detections, got ${fullResult.detections.length}`);
  assert(fullResult.lineItems.length >= 2, `Expected at least 2 line items, got ${fullResult.lineItems.length}`);

  const det1 = fullResult.detections[0];
  assert(
    det1.coordinates != null && det1.coordinates.x >= 0 && det1.coordinates.x <= 1.0,
    "Expected normalized X coordinate"
  );
  assert(
    det1.coordinates != null && det1.coordinates.y >= 0 && det1.coordinates.y <= 1.0,
    "Expected normalized Y coordinate"
  );
  assert(det1.status === "proposed", "Expected detection status to be 'proposed'");

  console.log("All Document Pipeline & Perception unit tests passed successfully!");
}
