/**
 * evidenceProvenance.test.ts — Unit and Integration tests for Evidence & Geometry Provenance.
 *
 * Requirements Tested:
 * 1. PDF text stream geometry extraction & coordinate normalization (0.0 - 1.0).
 * 2. Faithful coordinate grounding in DrawingPerceptionEngine (spatialConfidence: 'grounded').
 * 3. Elimination of synthetic index-based grid placement (fallback is strictly null & 'unavailable').
 * 4. Honest raster / scanned drawing handling (no fake OCR, extractionMode: 'vector_text_only — raster OCR deferred').
 * 5. Elimination of fabricated sheet fallbacks in AI Tool implementations (explicit not_found error).
 * 6. Agent runtime evidence grounding (evidence is null/unavailable when ungrounded, zero canned package/sheet names).
 */

import { pdfExtractor, type ExtractedPage } from "./pdfExtractor";
import { sheetClassifier } from "./sheetClassifier";
import { drawingPerceptionEngine } from "./drawingPerceptionEngine";
import { toolRegistry } from "../ai/tools/toolRegistry";
import { agentRuntime } from "../ai/runtime/agentRuntime";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runEvidenceProvenanceTests(): Promise<void> {
  console.log("Starting Evidence & Geometry Provenance unit tests...");

  // ── 1. PDF Text Stream Geometry Extraction & Coordinate Normalization ──────────
  const sampleStreamWithGeometry = `
    %PDF-1.4
    1 0 obj
    << /Type /Page /MediaBox [0 0 2000 1000] >>
    stream
    BT
    /F1 14 Tf
    1 0 0 1 200 800 Tm
    (DRAWING NO: E-101) Tj
    1 0 0 1 200 700 Tm
    (TITLE: SUBSTATION POWER DISTRIBUTION PLAN) Tj
    1 0 0 1 400 500 Tm
    (800A MCCB 4P 35kA 2 NOS) Tj
    1 0 0 1 600 300 Tm
    (OVERHEAD CABLE TRAY 600MM 45 MTR) Tj
    ET
    endstream
    endobj
    %%EOF
  `;

  const extractedDoc = await pdfExtractor.extractDocument(
    "Substation_Geometry.pdf",
    new TextEncoder().encode(sampleStreamWithGeometry)
  );

  assert(extractedDoc.pages.length === 1, "Expected 1 page extracted");
  const pageWithGeom = extractedDoc.pages[0];
  assert(pageWithGeom.width === 2000, `Expected width 2000, got ${pageWithGeom.width}`);
  assert(pageWithGeom.height === 1000, `Expected height 1000, got ${pageWithGeom.height}`);
  assert(
    pageWithGeom.textItems !== undefined && pageWithGeom.textItems.length >= 4,
    `Expected at least 4 text items with geometry, got ${pageWithGeom.textItems?.length}`
  );

  // Check normalized coordinates for (800A MCCB 4P 35kA 2 NOS) at PDF (400, 500)
  const mccbItem = pageWithGeom.textItems?.find((t) => t.text.includes("800A MCCB"));
  assert(Boolean(mccbItem), "Expected 800A MCCB text item with geometry");
  if (mccbItem) {
    assert(
      mccbItem.normalizedCoordinates.x >= 0.19 && mccbItem.normalizedCoordinates.x <= 0.21,
      `Expected normalized X ~0.20 (400/2000), got ${mccbItem.normalizedCoordinates.x}`
    );
    assert(
      mccbItem.normalizedCoordinates.y >= 0.48 && mccbItem.normalizedCoordinates.y <= 0.52,
      `Expected normalized Y ~0.50 (top-down), got ${mccbItem.normalizedCoordinates.y}`
    );
    assert(
      mccbItem.bbox[0] <= mccbItem.bbox[2],
      "Expected valid bbox [ymin <= ymax]"
    );
    assert(
      mccbItem.bbox[1] <= mccbItem.bbox[3],
      "Expected valid bbox [xmin <= xmax]"
    );
  }

  // ── 2. Faithful Coordinate Grounding in DrawingPerceptionEngine ────────────────
  const classification = sheetClassifier.classifyPage(pageWithGeom);
  assert(
    classification.sheetId === "E-101",
    `Expected sheetId E-101, got ${classification.sheetId}`
  );

  const perceptionResult = drawingPerceptionEngine.processSheet(
    "proj-test",
    "doc-test",
    "Substation_Geometry.pdf",
    pageWithGeom,
    classification
  );

  assert(perceptionResult.detections.length >= 2, "Expected at least 2 detections");
  const groundedDet = perceptionResult.detections.find((d) => d.label.includes("MCCB"));
  assert(Boolean(groundedDet), "Expected MCCB detection");
  if (groundedDet) {
    assert(groundedDet.coordinates !== null && groundedDet.coordinates !== undefined, "Expected non-null coordinates");
    assert(
      groundedDet.spatialConfidence === "grounded",
      `Expected spatialConfidence 'grounded', got ${groundedDet.spatialConfidence}`
    );
    assert(
      groundedDet.spatial_confidence === "grounded",
      `Expected spatial_confidence 'grounded', got ${groundedDet.spatial_confidence}`
    );
    assert(
      groundedDet.coordinates!.x >= 0.19 && groundedDet.coordinates!.x <= 0.21,
      `Expected X ~0.20, got ${groundedDet.coordinates!.x}`
    );
  }

  // ── 3. Missing Geometry Fallback is Strictly Null / Unavailable (No Grid Math) ─
  const pageWithoutGeom: ExtractedPage = {
    pageNumber: 1,
    width: 2592,
    height: 1728,
    aspectRatio: 1.5,
    format: "ARCH_D",
    rawText: "800A MCCB 4P 35kA 1 NOS\nOVERHEAD CABLE TRAY 600MM 45 MTR",
    lines: ["800A MCCB 4P 35kA 1 NOS", "OVERHEAD CABLE TRAY 600MM 45 MTR"],
    textItems: [], // No geometry available
    titleBlock: {
      sheetNumber: "E-201",
      sheetTitle: "Unlocated Single Line Diagram",
      discipline: "Electrical",
    },
  };

  const unlocatedClassification = sheetClassifier.classifyPage(pageWithoutGeom);
  const unlocatedResult = drawingPerceptionEngine.processSheet(
    "proj-test",
    "doc-test-2",
    "Unlocated.pdf",
    pageWithoutGeom,
    unlocatedClassification
  );

  assert(unlocatedResult.detections.length >= 2, "Expected detections from text lines");
  for (const det of unlocatedResult.detections) {
    assert(
      det.coordinates === null,
      `Expected coordinates to be strictly null when geometry is unavailable, got ${JSON.stringify(det.coordinates)}`
    );
    assert(
      det.spatialConfidence === "unavailable",
      `Expected spatialConfidence 'unavailable', got ${det.spatialConfidence}`
    );
    assert(
      det.spatial_confidence === "unavailable",
      `Expected spatial_confidence 'unavailable', got ${det.spatial_confidence}`
    );
  }

  // Verify that lineItems also have null source_coordinates and spatial_confidence: 'unavailable'
  for (const item of unlocatedResult.lineItems) {
    assert(
      item.source_coordinates === null,
      `Expected lineItem source_coordinates to be null, got ${JSON.stringify(item.source_coordinates)}`
    );
    assert(
      item.spatial_confidence === "unavailable",
      `Expected lineItem spatial_confidence 'unavailable', got ${item.spatial_confidence}`
    );
  }

  // ── 4. Honest Raster / Scanned PDF Handling (Deferred OCR) ─────────────────────
  const rasterPage: ExtractedPage = {
    pageNumber: 1,
    width: 2592,
    height: 1728,
    aspectRatio: 1.5,
    format: "ARCH_D",
    rawText: "",
    lines: [],
    textItems: [],
    extractionMode: "vector_text_only — raster OCR deferred",
    titleBlock: undefined,
  };

  const rasterClassification = sheetClassifier.classifyPage(rasterPage);
  assert(
    rasterClassification.drawingType === "raster_scan",
    `Expected drawingType 'raster_scan', got ${rasterClassification.drawingType}`
  );
  assert(
    rasterClassification.confidence === 0.0,
    `Expected confidence 0.0 for raster scan, got ${rasterClassification.confidence}`
  );

  const rasterPerception = drawingPerceptionEngine.processSheet(
    "proj-test",
    "doc-raster",
    "Scanned_Blueprint.pdf",
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
  assert(
    rasterPerception.sheet.is_empty === true,
    "Expected raster sheet to be marked is_empty: true"
  );

  // ── 5. AI Tool Implementations: Explicit Not-Found vs Fabricated Fallbacks ─────
  const toolContext = {
    projectId: "p1",
    userRole: "viewer" as const,
    userId: "u-viewer",
  };

  // Test non-existent sheet request in inspect_drawing_region
  const nonExistentSheetRes = await toolRegistry.executeTool(
    "inspect_drawing_region",
    { sheetNumber: "E-NON-EXISTENT-999" },
    toolContext
  );

  assert(
    nonExistentSheetRes.success === false,
    "Expected inspect_drawing_region to fail for non-existent sheet"
  );
  assert(
    nonExistentSheetRes.error_code === "not_found",
    `Expected error_code 'not_found', got ${nonExistentSheetRes.error_code}`
  );
  assert(
    nonExistentSheetRes.message?.includes("not found") === true,
    "Expected clear not-found error message"
  );

  // Test missing sheetNumber parameter
  const missingParamRes = await toolRegistry.executeTool(
    "inspect_drawing_region",
    {},
    toolContext
  );
  assert(
    missingParamRes.success === false,
    "Expected failure when sheetNumber parameter is omitted"
  );
  assert(
    missingParamRes.error_code === "validation_failed",
    `Expected error_code 'validation_failed', got ${missingParamRes.error_code}`
  );

  // Test non-existent line item
  const nonExistentLineItemRes = await toolRegistry.executeTool(
    "get_line_item",
    { lineItemId: "li-does-not-exist" },
    toolContext
  );
  assert(
    nonExistentLineItemRes.success === false && nonExistentLineItemRes.error_code === "not_found",
    "Expected get_line_item to fail with not_found for non-existent item"
  );

  // ── 6. Agent Runtime Evidence Grounding Reality ───────────────────────────────
  // Pure calculation request should have NO fabricated drawing package or sheet
  const calcInvestigation = await agentRuntime.runInvestigation({
    inquiry: "Calculate electrical load for 100 kVA at 480V 3-phase",
    projectId: null,
    userRole: "editor",
    userId: "u-calc",
  });

  assert(
    calcInvestigation.evidence === undefined || calcInvestigation.evidence === null,
    "Expected no drawing evidence attached to pure electrical calculation"
  );

  console.log("All Evidence & Geometry Provenance unit tests passed successfully!");
}
