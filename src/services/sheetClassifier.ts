/**
 * sheetClassifier.ts — Engineering Drawing Sheet Classifier.
 *
 * Classifies drawing sheets into canonical engineering disciplines and sheet types
 * based on title blocks, CAD layer names, drawing text, and schedule patterns.
 */

import type { ExtractedPage } from "./pdfExtractor";

export type SheetCategory =
  | "Power Distribution"
  | "Lighting & Fixtures"
  | "Cable Tray & Containment"
  | "Equipment & Mechanical Power"
  | "Panel & Demand Schedules"
  | "General & Legends"
  | "Unknown / Needs Review";

export type SheetDrawingType =
  | "floor_plan"
  | "single_line"
  | "schedule"
  | "notes"
  | "legend";

export interface ClassificationResult {
  sheetId: string;
  sheetTitle: string;
  category: SheetCategory;
  discipline: "Electrical" | "Mechanical" | "General";
  drawingType: SheetDrawingType;
  confidence: number;
  signals: string[];
}

export class SheetClassifier {
  /**
   * Classifies an extracted drawing page into a standard engineering category and type.
   */
  public classifyPage(page: ExtractedPage): ClassificationResult {
    const text = (page.rawText + " " + (page.titleBlock?.sheetTitle || "")).toLowerCase();
    const sheetNum = (page.titleBlock?.sheetNumber || `E-${page.pageNumber}`).toUpperCase();
    const sheetTitle = page.titleBlock?.sheetTitle || `Drawing Sheet ${page.pageNumber}`;
    const signals: string[] = [];

    // 1. Single Line Diagram / Main Power Distribution
    if (
      text.includes("single line") ||
      text.includes("sld") ||
      text.includes("switchgear") ||
      text.includes("transformer") ||
      text.includes("substation") ||
      text.includes("mccb") ||
      text.includes("busbar") ||
      sheetNum.startsWith("SLD")
    ) {
      signals.push("Detected Power Distribution / SLD nomenclature");
      return {
        sheetId: sheetNum,
        sheetTitle,
        category: "Power Distribution",
        discipline: "Electrical",
        drawingType: text.includes("single line") || sheetNum.startsWith("SLD") ? "single_line" : "floor_plan",
        confidence: 0.94,
        signals,
      };
    }

    // 2. Lighting & Fixtures
    if (
      text.includes("lighting") ||
      text.includes("luminaire") ||
      text.includes("troffer") ||
      text.includes("downlight") ||
      text.includes("emergency light") ||
      text.includes("exit sign") ||
      sheetNum.startsWith("EL") ||
      sheetNum.startsWith("LT")
    ) {
      signals.push("Detected Luminaire & Lighting Layout tags");
      return {
        sheetId: sheetNum,
        sheetTitle,
        category: "Lighting & Fixtures",
        discipline: "Electrical",
        drawingType: text.includes("schedule") ? "schedule" : "floor_plan",
        confidence: 0.92,
        signals,
      };
    }

    // 3. Cable Tray, Conduit & Containment
    if (
      text.includes("cable tray") ||
      text.includes("cable ladder") ||
      text.includes("trunking") ||
      text.includes("raceway") ||
      text.includes("conduit") ||
      sheetNum.startsWith("CT")
    ) {
      signals.push("Detected Cable Tray / Containment routing markers");
      return {
        sheetId: sheetNum,
        sheetTitle,
        category: "Cable Tray & Containment",
        discipline: "Electrical",
        drawingType: "floor_plan",
        confidence: 0.9,
        signals,
      };
    }

    // 4. Precision Air Conditioning & Equipment Power
    if (
      text.includes("pac unit") ||
      text.includes("precision air") ||
      text.includes("chiller") ||
      text.includes("refrigerant") ||
      text.includes("hvac power") ||
      text.includes("motor control") ||
      sheetNum.startsWith("M") ||
      sheetNum.startsWith("EM")
    ) {
      signals.push("Detected Mechanical Equipment & Precision Cooling power markers");
      return {
        sheetId: sheetNum,
        sheetTitle,
        category: "Equipment & Mechanical Power",
        discipline: "Mechanical",
        drawingType: text.includes("schedule") ? "schedule" : "floor_plan",
        confidence: 0.88,
        signals,
      };
    }

    // 5. Panel Schedules & Load Tables
    if (
      text.includes("panel schedule") ||
      text.includes("demand schedule") ||
      text.includes("load calculation") ||
      text.includes("schedule of quantities") ||
      text.includes("circuit schedule")
    ) {
      signals.push("Detected Panel Schedule / Tabular engineering load schedule");
      return {
        sheetId: sheetNum,
        sheetTitle,
        category: "Panel & Demand Schedules",
        discipline: "Electrical",
        drawingType: "schedule",
        confidence: 0.95,
        signals,
      };
    }

    // 6. General Notes, Legends & Symbols
    if (
      text.includes("legend") ||
      text.includes("symbols") ||
      text.includes("general notes") ||
      text.includes("abbreviations") ||
      sheetNum === "E-001" ||
      sheetNum === "E-000"
    ) {
      signals.push("Detected Standard Project Legend & Electrical Symbols sheet");
      return {
        sheetId: sheetNum,
        sheetTitle,
        category: "General & Legends",
        discipline: "General",
        drawingType: "legend",
        confidence: 0.91,
        signals,
      };
    }

    // Default Fallback
    signals.push("Ambiguous title block; categorized as general electrical review");
    return {
      sheetId: sheetNum,
      sheetTitle,
      category: "Unknown / Needs Review",
      discipline: "Electrical",
      drawingType: "floor_plan",
      confidence: 0.5,
      signals,
    };
  }
}

export const sheetClassifier = new SheetClassifier();
