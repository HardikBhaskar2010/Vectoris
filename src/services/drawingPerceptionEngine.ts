/**
 * drawingPerceptionEngine.ts — Local-first CAD & Drawing Perception Engine.
 *
 * Scans extracted drawing sheet text, geometry markers, schedule tables, and symbols
 * to produce genuine evidence-backed Detections and Takeoff Line Items with normalized coordinates.
 */

import type { Coordinates, Detection, LineItem, Sheet } from "../data/types";
import type { ExtractedPage } from "./pdfExtractor";
import type { ClassificationResult } from "./sheetClassifier";
import { generateId } from "./idService";

export interface PerceptionResult {
  sheet: Sheet;
  detections: Detection[];
  lineItems: LineItem[];
}

export class DrawingPerceptionEngine {
  /**
   * Processes an extracted sheet and derives genuine Detections and Takeoff Line Items.
   */
  public processSheet(
    projectId: string,
    documentId: string,
    documentName: string,
    page: ExtractedPage,
    classification: ClassificationResult
  ): PerceptionResult {
    const sheetDbId = generateId("sht");
    const sheetId = classification.sheetId;
    const sheetName = classification.sheetTitle;

    const detections: Detection[] = [];
    const lineItems: LineItem[] = [];

    // Honest raster / scanned drawing check: 0 text items produces 0 fabricated takeoffs
    if (page.lines.length === 0 || classification.drawingType === "raster_scan") {
      const emptySheet: Sheet = {
        id: sheetDbId,
        project_id: projectId,
        sheet_id: sheetId,
        name: sheetName,
        type: "raster_scan",
        detection_count: 0,
        document_name: documentName,
        is_empty: true,
      };

      return {
        sheet: emptySheet,
        detections: [],
        lineItems: [],
      };
    }

    // Parse schedules and lines
    const parsedEntries = this.extractComponentTagsAndSchedules(page.lines, classification);

    for (let i = 0; i < parsedEntries.length; i++) {
      const entry = parsedEntries[i];
      const detectionId = generateId("det");
      const lineItemId = generateId("li");

      // Resolve genuine geometric position from extracted text items if present.
      // If coordinates cannot be derived from geometry/text, explicitly set null and "unavailable".
      let itemCoordinates: Coordinates | null = null;
      let spatialConfidence: "grounded" | "unavailable" = "unavailable";

      if (page.textItems && page.textItems.length > 0) {
        const matchedItem = page.textItems.find(
          (ti) =>
            (entry.itemCode && ti.text.toUpperCase().includes(entry.itemCode.toUpperCase())) ||
            (entry.name && (ti.text.toUpperCase().includes(entry.name.toUpperCase()) || entry.name.toUpperCase().includes(ti.text.toUpperCase()))) ||
            (entry.specification && (ti.text.toUpperCase().includes(entry.specification.toUpperCase()) || entry.specification.toUpperCase().includes(ti.text.toUpperCase())))
        );

        if (matchedItem) {
          itemCoordinates = {
            x: matchedItem.normalizedCoordinates.x,
            y: matchedItem.normalizedCoordinates.y,
            width: matchedItem.normalizedCoordinates.width,
            height: matchedItem.normalizedCoordinates.height,
          };
          spatialConfidence = "grounded";
        }
      }

      let layerId = "layer-pf";
      if (entry.category === "Lighting & Fixtures") layerId = "layer-lt";
      else if (entry.category === "Cable Tray & Containment") layerId = "layer-ct";
      else if (entry.category === "Equipment & Mechanical Power") layerId = "layer-mech";

      const detection: Detection = {
        id: detectionId,
        sheet_id: sheetDbId,
        document_name: documentName,
        line_item_id: lineItemId,
        label: entry.itemCode || entry.name,
        category: entry.category,
        layer_id: layerId,
        quantity: entry.quantity,
        unit: entry.unit,
        status: "proposed",
        model_version: "v2.4-perception",
        coordinates: itemCoordinates,
        spatial_confidence: spatialConfidence,
        spatialConfidence: spatialConfidence,
      };

      detections.push(detection);

      const lineItem: LineItem = {
        id: lineItemId,
        project_id: projectId,
        item_code: entry.itemCode,
        name: entry.name,
        description: entry.description,
        specification: entry.specification,
        category: entry.category,
        quantity: entry.quantity,
        unit: entry.unit,
        source_document_id: documentId,
        source_document_name: documentName,
        source_sheet: sheetId,
        source_coordinates: itemCoordinates,
        spatial_confidence: spatialConfidence,
        status: "proposed",
        detection_source: "ai_detection",
        model_version: "v2.4-perception",
      };

      lineItems.push(lineItem);
    }

    const sheet: Sheet = {
      id: sheetDbId,
      project_id: projectId,
      sheet_id: sheetId,
      name: sheetName,
      type: classification.drawingType,
      detection_count: detections.length,
      document_name: documentName,
      is_empty: detections.length === 0,
    };

    return {
      sheet,
      detections,
      lineItems,
    };
  }

  /**
   * Scans text lines for electrical component tags, feeder routes, and schedule rows.
   */
  private extractComponentTagsAndSchedules(
    lines: string[],
    classification: ClassificationResult
  ): Array<{
    itemCode: string;
    name: string;
    description: string;
    specification: string;
    category: string;
    quantity: number;
    unit: string;
    confidence: number;
  }> {
    const results: Array<{
      itemCode: string;
      name: string;
      description: string;
      specification: string;
      category: string;
      quantity: number;
      unit: string;
      confidence: number;
    }> = [];

    // Tag and schedule regex matchers
    const qtyRegex = /\b(\d+(\.\d+)?)\s*(NOS|EA|MTR|RM|M|KGS|SETS|LOT|UNITS?)\b/i;
    const panelTagRegex = /\b(LP-[A-Z0-9]+|DB-[A-Z0-9]+|MCCB-[0-9]+[A-Z]?|\d+A\s+MCCB|\d+kVA\s+TR|SWG-[0-9]+|TR-[0-9]+|PAC-[0-9]+|LT-[0-9]+[A-Z]?|EM-[0-9]+[A-Z]?)\b/i;

    // 1. Scan for explicit structured items or schedule rows
    for (const line of lines) {
      if (line.length < 5) continue;

      const qtyMatch = line.match(qtyRegex);
      const tagMatch = line.match(panelTagRegex);

      if (tagMatch || qtyMatch) {
        const itemCode = tagMatch ? tagMatch[1].toUpperCase() : `ITM-${results.length + 1}`;
        const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
        const unit = qtyMatch ? qtyMatch[3].toUpperCase() : "NOS";

        let category = classification.category;
        if (itemCode.startsWith("LT") || line.toLowerCase().includes("light")) category = "Lighting & Fixtures";
        else if (itemCode.startsWith("CT") || line.toLowerCase().includes("tray")) category = "Cable Tray & Containment";
        else if (itemCode.startsWith("PAC") || itemCode.startsWith("EM")) category = "Equipment & Mechanical Power";
        else if (itemCode.startsWith("MCCB") || itemCode.startsWith("DB") || itemCode.startsWith("LP") || itemCode.startsWith("SWG"))
          category = "Power Distribution";

        results.push({
          itemCode,
          name: line.length > 70 ? line.slice(0, 70) + "…" : line,
          description: `Detected on sheet ${classification.sheetId}: ${line}`,
          specification: line,
          category,
          quantity: Math.max(1, qty),
          unit: unit === "M" ? "MTR" : unit === "EA" ? "NOS" : unit,
          confidence: 0.9,
        });
      }
    }

    // Do not fabricate fake line items if no tags or quantities were detected in the drawing text
    return results;
  }
}

export const drawingPerceptionEngine = new DrawingPerceptionEngine();

