/**
 * documentProcessingService.ts — Orchestrator for Real Document Ingestion & Perception.
 *
 * Coordinates:
 *   Raw File Bytes (Uint8Array) → Page Extraction → Sheet Classification → Perception Detection → Takeoff Derivation.
 *
 * STRICT REALITY INVARIANT:
 *   Zero fabricated sample content or fallback records. Missing or unreadable bytes
 *   explicitly fail with an honest error state.
 */

import { pdfExtractor, type ExtractedDocumentPackage } from "./pdfExtractor";
import { sheetClassifier } from "./sheetClassifier";
import { drawingPerceptionEngine, type PerceptionResult } from "./drawingPerceptionEngine";
import type { Detection, LineItem, Sheet, ProjectDocument } from "../data/types";

export interface DocumentProcessingResult {
  documentId: string;
  filename: string;
  pageCount: number;
  sheets: Sheet[];
  detections: Detection[];
  lineItems: LineItem[];
}

export class DocumentProcessingService {
  /**
   * Processes a project document through the complete local-first perception pipeline using real file bytes.
   */
  public async processDocument(
    projectId: string,
    document: ProjectDocument,
    fileBytes?: Uint8Array | ArrayBuffer,
    onProgress?: (stage: "ingesting" | "classifying" | "detecting" | "complete") => void
  ): Promise<DocumentProcessingResult> {
    if (!fileBytes) {
      throw new Error(`Document processing failed: No readable file bytes provided for [${document.filename}].`);
    }

    const bytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);
    if (bytes.length === 0) {
      throw new Error(`Document processing failed: File bytes for [${document.filename}] are 0 bytes.`);
    }

    // 1. Ingestion Phase
    onProgress?.("ingesting");
    const extractedPkg: ExtractedDocumentPackage = await pdfExtractor.extractDocument(
      document.filename,
      bytes
    );

    // 2. Classification Phase
    onProgress?.("classifying");
    const allSheets: Sheet[] = [];
    const allDetections: Detection[] = [];
    const allLineItems: LineItem[] = [];

    // 3. Perception Phase
    onProgress?.("detecting");
    for (const page of extractedPkg.pages) {
      const classification = sheetClassifier.classifyPage(page);
      const perception: PerceptionResult = drawingPerceptionEngine.processSheet(
        projectId,
        document.id,
        document.filename,
        page,
        classification
      );

      allSheets.push(perception.sheet);
      allDetections.push(...perception.detections);
      allLineItems.push(...perception.lineItems);
    }

    onProgress?.("complete");

    return {
      documentId: document.id,
      filename: document.filename,
      pageCount: extractedPkg.pageCount,
      sheets: allSheets,
      detections: allDetections,
      lineItems: allLineItems,
    };
  }
}

export const documentProcessingService = new DocumentProcessingService();
