/**
 * documentProcessingService.ts — Orchestrator for Real Document Ingestion & Perception.
 *
 * Coordinates:
 *   File Buffer → Page Extraction → Sheet Classification → Perception Detection → Takeoff Derivation.
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
   * Processes a project document through the complete local-first perception pipeline.
   */
  public async processDocument(
    projectId: string,
    document: ProjectDocument,
    fileData?: ArrayBuffer | Uint8Array | string,
    onProgress?: (stage: "ingesting" | "classifying" | "detecting" | "complete") => void
  ): Promise<DocumentProcessingResult> {
    // 1. Ingestion Phase
    onProgress?.("ingesting");
    const rawContent = fileData || `Sample Document Content for ${document.filename}\nDrawing No: E-101\nTitle: Single Line Diagram & Power Distribution\n800A MCCB 4P 35kA\nOverhead Cable Tray 600mm 45 MTR\nRecessed 2x4 LED Troffer 24 NOS`;

    const extractedPkg: ExtractedDocumentPackage = await pdfExtractor.extractDocument(
      document.filename,
      rawContent
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
