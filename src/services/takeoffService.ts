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
} from "../data/types";
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
}

export const takeoffService = new TakeoffService();
