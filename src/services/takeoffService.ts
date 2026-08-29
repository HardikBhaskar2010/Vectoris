/**
 * takeoffService.ts — Takeoff, line item review, and verification domain service.
 *
 * Interacts with Postgres tables `takeoff_runs`, `line_items`, `correction_events`
 * via Supabase PostgREST & transactional RPCs (approve_line_item, reject_line_item).
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";
import {
  mapDbTakeoffRunToDomain,
  mapDbLineItemToDomain,
  mapDbCorrectionEventToDomain,
} from "./domainMappers";
import type {
  LineItem,
  CorrectionRecord,
  CorrectionType,
  TakeoffRunSummary,
  Sheet,
  Detection,
} from "../data/types";
import { offlineSyncService, isNetworkOfflineError } from "./offlineSyncService";
import type { Database } from "../data/database.types";

export interface ApproveLineItemParams {
  lineItemId: string;
  humanValue: string;
  correctionType: CorrectionType;
  reason?: string;
}

export interface RejectLineItemParams {
  lineItemId: string;
  correctionType: CorrectionType;
  reason: string;
}

export interface CreateManualLineItemPayload {
  projectId: string;
  name: string;
  itemCode?: string;
  category?: string;
  quantity: number;
  unit: string;
}

class TakeoffService {
  /**
   * Retrieves the latest takeoff run for a project from Supabase.
   */
  public async getTakeoff(projectId: string): Promise<TakeoffRunSummary | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data: runRow, error: runError } = await supabase
        .from("takeoff_runs")
        .select("*")
        .eq("project_id", projectId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (runError || !runRow) {
        return null;
      }

      // Count proposed and approved items
      const { count: totalCount } = await supabase
        .from("line_items")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      const { count: approvedCount } = await supabase
        .from("line_items")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "approved");

      return mapDbTakeoffRunToDomain(
        runRow,
        totalCount || 0,
        approvedCount || 0,
        0
      );
    } catch (err) {
      console.warn("TakeoffService.getTakeoff error:", err);
      return null;
    }
  }

  /**
   * Retrieves all line items for a project including their full correction event history.
   */
  public async getLineItems(projectId: string): Promise<LineItem[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("line_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (itemsError || !itemsData || itemsData.length === 0) {
        return [];
      }

      const itemIds = itemsData.map((li) => li.id);
      const { data: correctionsData } = await supabase
        .from("correction_events")
        .select("*")
        .in("line_item_id", itemIds)
        .order("created_at", { ascending: false });

      const correctionsByItem = new Map<string, CorrectionRecord[]>();
      if (correctionsData) {
        for (const c of correctionsData) {
          const list = correctionsByItem.get(c.line_item_id) || [];
          list.push(mapDbCorrectionEventToDomain(c));
          correctionsByItem.set(c.line_item_id, list);
        }
      }

      return itemsData.map((row) =>
        mapDbLineItemToDomain(row, correctionsByItem.get(row.id) || [])
      );
    } catch (err) {
      console.warn("TakeoffService.getLineItems error:", err);
      return [];
    }
  }

  /**
   * Approves a line item via transactional RPC with correction ledger logging.
   */
  public async approveLineItem(params: ApproveLineItemParams): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.rpc("approve_line_item", {
      p_line_item_id: params.lineItemId,
      p_human_value: params.humanValue,
      p_correction_type: params.correctionType,
      p_reason: params.reason || undefined,
    });

    if (error) {
      console.error("Failed to approve line item via RPC:", error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Rejects a line item via transactional RPC with reason logging.
   */
  public async rejectLineItem(params: RejectLineItemParams): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.rpc("reject_line_item", {
      p_line_item_id: params.lineItemId,
      p_correction_type: params.correctionType,
      p_reason: params.reason,
    });

    if (error) {
      console.error("Failed to reject line item via RPC:", error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Persists a manually created line item in Supabase.
   */
  public async createManualLineItem(payload: CreateManualLineItemPayload): Promise<LineItem> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured");
    }

    const { data: createdRow, error } = await supabase
      .from("line_items")
      .insert({
        project_id: payload.projectId,
        name: payload.name.trim(),
        item_code: payload.itemCode || "MANUAL",
        category: payload.category || "General",
        current_value: payload.quantity,
        unit_of_measure: payload.unit,
        source: "human_created",
        status: "proposed",
      })
      .select()
      .single();

    if (error || !createdRow) {
      console.error("Failed to insert manual line item:", error?.message);
      throw new Error(error?.message || "Failed to create line item");
    }

    return mapDbLineItemToDomain(createdRow, []);
  }

  /**
   * Retrieves the immutable correction event audit history for a single line item.
   */
  public async getCorrectionHistory(lineItemId: string): Promise<CorrectionRecord[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("correction_events")
        .select("*")
        .eq("line_item_id", lineItemId)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((row) => mapDbCorrectionEventToDomain(row));
    } catch (err) {
      console.warn("TakeoffService.getCorrectionHistory error:", err);
      return [];
    }
  }

  /**
   * Persists real processed drawing sheets, detections, and derived line items to Supabase.
   * If workstation is offline, safely enqueues the batch for automated replay upon reconnection.
   */
  public async persistProcessedDocumentResults(params: {
    projectId: string;
    documentId: string;
    sheets: Sheet[];
    detections: Detection[];
    lineItems: LineItem[];
  }): Promise<{ success: boolean; isOfflineQueued?: boolean; error?: string }> {
    if (!isSupabaseConfigured() || params.projectId.startsWith("p-") || params.projectId.startsWith("proj-")) {
      return { success: true };
    }

    if (!offlineSyncService.isOnline()) {
      if (!offlineSyncService.isReplayingActive()) {
        offlineSyncService.enqueue("document_processed_batch", {
          projectId: params.projectId,
          documentId: params.documentId,
          sheetCount: params.sheets.length,
          detectionCount: params.detections.length,
          lineItemCount: params.lineItems.length,
          sheets: params.sheets,
          detections: params.detections,
          lineItems: params.lineItems,
        });
      }
      return { success: false, isOfflineQueued: true, error: "Workstation is offline; queued for automatic synchronization." };
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || "00000000-0000-0000-0000-000000000000";

      // Map local sheet classification types to valid PostgreSQL enum sheet_classification variants:
      // ('floor_plan', 'schedule', 'single_line', 'legend', 'notes')
      const mapClassification = (t?: string): "floor_plan" | "schedule" | "single_line" | "legend" | "notes" => {
        if (!t) return "floor_plan";
        const lower = t.toLowerCase();
        if (lower.includes("single_line") || lower.includes("sld") || lower.includes("power_distribution")) return "single_line";
        if (lower.includes("schedule") || lower.includes("panel")) return "schedule";
        if (lower.includes("legend")) return "legend";
        if (lower.includes("notes")) return "notes";
        return "floor_plan";
      };

      // 1. Persist sheets to Supabase 'sheets' table
      const sheetIdMap = new Map<string, string>(); // local sheet id -> db sheet id
      if (params.sheets.length > 0) {
        const sheetInserts = params.sheets.map((s, idx) => ({
          document_id: params.documentId,
          sheet_index: idx + 1,
          classification: mapClassification(s.type || (s as any).category),
          page_width: 1000,
          page_height: 1000,
        }));

        const { data: dbSheets, error: sheetError } = await supabase
          .from("sheets")
          .upsert(sheetInserts, { onConflict: "document_id,sheet_index" })
          .select();

        if (sheetError) {
          throw new Error(`Failed to persist sheets: ${sheetError.message}`);
        }

        if (dbSheets) {
          dbSheets.forEach((dbS, idx) => {
            const localSheet = params.sheets[idx];
            if (localSheet) {
              sheetIdMap.set(localSheet.id, dbS.id);
              sheetIdMap.set(localSheet.sheet_id, dbS.id);
            }
          });
        }
      }

      // 2. Create or find active takeoff_runs record
      let takeoffRunId: string | null = null;
      const { data: runData, error: runError } = await supabase
        .from("takeoff_runs")
        .insert({
          project_id: params.projectId,
          triggered_by: userId,
          model_version: "v2.4-perception",
          status: "complete",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (runError) {
        throw new Error(`Failed to create takeoff run: ${runError.message}`);
      }

      if (runData) {
        takeoffRunId = runData.id;
        // Link document to takeoff run
        const { error: linkError } = await supabase.from("takeoff_run_documents").upsert({
          takeoff_run_id: takeoffRunId,
          document_id: params.documentId,
        });
        if (linkError) {
          console.warn("Failed to link takeoff run document:", linkError.message);
        }
      }

      // 3. Persist detections to Supabase 'detections' table
      if (takeoffRunId && params.detections.length > 0) {
        const validSheetId = Array.from(sheetIdMap.values())[0];
        if (validSheetId) {
          const detectionInserts = params.detections.map((d) => {
            const dbSheetId = sheetIdMap.get(d.sheet_id) || validSheetId;
            return {
              takeoff_run_id: takeoffRunId!,
              sheet_id: dbSheetId,
              component_type: d.category || "General",
              quantity: 1,
              geometry: d.coordinates ? { x: d.coordinates.x, y: d.coordinates.y, w: d.coordinates.width, h: d.coordinates.height } : null,
              source_coordinates: (d.coordinates || { x: 0, y: 0, width: 0, height: 0 }) as any,
              confidence: (d as any).confidence || 0.95,
              model_version: "v2.4-perception",
            };
          });

          const { error: detError } = await (supabase.from("detections") as any).insert(detectionInserts);
          if (detError) {
            throw new Error(`Failed to insert detections: ${detError.message}`);
          }
        }
      }

      // 4. Persist line items to Supabase 'line_items' table
      if (params.lineItems.length > 0) {
        const lineItemInserts = params.lineItems.map((li) => ({
          project_id: params.projectId,
          source: "ai_detection" as const,
          item_code: li.item_code || "AUTO",
          name: li.name,
          category: li.category || "General",
          current_value: li.quantity,
          unit_of_measure: li.unit,
          status: "proposed" as const,
        }));

        const { error: lineItemError } = await (supabase.from("line_items") as any).insert(lineItemInserts);
        if (lineItemError) {
          throw new Error(`Failed to insert line items: ${lineItemError.message}`);
        }
      }

      // 5. Update document status in Supabase 'documents' table
      const { error: docError } = await (supabase
        .from("documents") as any)
        .update({
          upload_status: "complete",
        })
        .eq("id", params.documentId);

      if (docError) {
        console.warn("Failed to update document upload_status on Supabase:", docError.message);
      }

      return { success: true };
    } catch (err: any) {
      console.warn("TakeoffService.persistProcessedDocumentResults error:", err);
      if (isNetworkOfflineError(err)) {
        if (!offlineSyncService.isReplayingActive()) {
          offlineSyncService.enqueue("document_processed_batch", {
            projectId: params.projectId,
            documentId: params.documentId,
            sheetCount: params.sheets.length,
            detectionCount: params.detections.length,
            lineItemCount: params.lineItems.length,
            sheets: params.sheets,
            detections: params.detections,
            lineItems: params.lineItems,
          });
        }
        return { success: false, isOfflineQueued: true, error: err?.message || "Workstation offline, enqueued for retry" };
      }
      return { success: false, isOfflineQueued: false, error: err?.message || "Failed to persist document processing to Supabase" };
    }
  }
}

export const takeoffService = new TakeoffService();
