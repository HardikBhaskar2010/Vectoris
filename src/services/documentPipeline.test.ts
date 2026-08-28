/**
 * documentPipeline.test.ts — Unit & Integration tests for Document Pipeline.
 *
 * Tests:
 * 1. PDF Page Extraction & Dimension Classification
 * 2. Title Block Metadata Parsing
 * 3. Discipline Sheet Classification Heuristics
 * 4. Drawing Perception Engine & Coordinate Normalization
 * 5. End-to-end Document Processing Service
 */

import { pdfExtractor } from "./pdfExtractor";
import { sheetClassifier } from "./sheetClassifier";
import { drawingPerceptionEngine } from "./drawingPerceptionEngine";
import { documentProcessingService } from "./documentProcessingService";
import type { ProjectDocument } from "../data/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runDocumentPipelineTests(): Promise<void> {
  console.log("Starting Document Pipeline & Perception unit tests...");

  // Test 1: PDF Extractor on Raw Stream
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

  const extracted = await pdfExtractor.extractDocument("Sample_SLD.pdf", samplePdfStream);
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

  // Test 2: Sheet Classification
  const powerPage = extracted.pages[0];
  const powerClassification = sheetClassifier.classifyPage(powerPage);
  assert(
    powerClassification.category === "Power Distribution",
    `Expected category 'Power Distribution', got '${powerClassification.category}'`
  );
  assert(powerClassification.confidence >= 0.8, "Expected classification confidence >= 0.8");
  assert(powerClassification.drawingType === "single_line", "Expected drawingType 'single_line'");

  // Test 3: Lighting Sheet Classification
  const lightingPage = {
    pageNumber: 2,
    width: 2592,
    height: 1728,
    aspectRatio: 1.5,
    format: "ARCH_D" as const,
    rawText: "DRAWING NO: EL-102\nLIGHTING & LUMINAIRE FIXTURE LAYOUT\n2x4 LED Troffer 24 NOS\nEmergency Exit Light 4 NOS",
    lines: [
      "DRAWING NO: EL-102",
      "LIGHTING & LUMINAIRE FIXTURE LAYOUT",
      "2x4 LED Troffer 24 NOS",
      "Emergency Exit Light 4 NOS",
    ],
    titleBlock: {
      sheetNumber: "EL-102",
      sheetTitle: "LIGHTING & LUMINAIRE FIXTURE LAYOUT",
      scale: "1:50",
      revision: "Rev 0",
      discipline: "Lighting",
    },
  };

  const lightingClassification = sheetClassifier.classifyPage(lightingPage);
  assert(
    lightingClassification.category === "Lighting & Fixtures",
    `Expected category 'Lighting & Fixtures', got '${lightingClassification.category}'`
  );

  // Test 4: Drawing Perception Engine
  const perceptionResult = drawingPerceptionEngine.processSheet(
    "proj-123",
    "doc-456",
    "LightingPackage.pdf",
    lightingPage,
    lightingClassification
  );

  assert(perceptionResult.sheet.project_id === "proj-123", "Expected sheet.project_id to match");
  assert(perceptionResult.detections.length >= 2, "Expected at least 2 detected equipment items");
  assert(perceptionResult.lineItems.length >= 2, "Expected at least 2 derived takeoff line items");

  const det1 = perceptionResult.detections[0];
  assert(
    det1.coordinates !== undefined && det1.coordinates.x >= 0 && det1.coordinates.x <= 1.0,
    "Expected normalized X coordinate between 0.0 and 1.0"
  );
  assert(
    det1.coordinates !== undefined && det1.coordinates.y >= 0 && det1.coordinates.y <= 1.0,
    "Expected normalized Y coordinate between 0.0 and 1.0"
  );
  assert(det1.status === "proposed", "Expected detection status to be 'proposed'");
  assert(det1.model_version === "v2.4-perception", "Expected model version 'v2.4-perception'");

  // Test 5: End-to-End Document Processing Service
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

  const fullResult = await documentProcessingService.processDocument(
    "proj-123",
    testDoc,
    samplePdfStream
  );

  assert(fullResult.documentId === "doc-test-1", "Expected documentId match in processing result");
  assert(fullResult.sheets.length >= 1, "Expected at least 1 sheet in result");
  assert(fullResult.detections.length >= 1, "Expected at least 1 detection in result");
  assert(fullResult.lineItems.length >= 1, "Expected at least 1 line item in result");

  console.log("All Document Pipeline & Perception unit tests passed successfully!");
}
