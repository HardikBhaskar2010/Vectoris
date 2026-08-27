/**
 * documentService.ts — Document domain & storage reference service.
 *
 * Implements persistence for drawing packages and documents via Supabase PostgREST & RPCs.
 * Enforces local-first storage mode with local_reference pointers.
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { mapDbDocumentToDomain } from "./domainMappers";
import type { ProjectDocument, DocumentFormat } from "../data/types";
import type { SelectedFileMetadata } from "./fileDialogService";

class DocumentService {
  /**
   * Retrieves all non-deleted documents for a given project from Supabase.
   */
  public async getDocuments(projectId: string): Promise<ProjectDocument[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.warn("Failed to fetch documents from Supabase:", error.message);
        return [];
      }

      if (!data) return [];
      return data.map((row) => mapDbDocumentToDomain(row));
    } catch (err) {
      console.warn("DocumentService.getDocuments error:", err);
      return [];
    }
  }

  /**
   * Persists document metadata and local-first storage references to Supabase.
   */
  public async createDocuments(
    projectId: string,
    files: Array<{
      id?: string;
      filename: string;
      format: DocumentFormat;
      size_mb: number;
      file_path?: string;
      storage_reference?: string;
    }>
  ): Promise<ProjectDocument[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User must be authenticated to add documents");
    }

    const insertPayloads = files.map((f) => {
      const localRef = f.storage_reference || `projects/${projectId}/documents/${f.id || "doc"}/${f.filename}`;
      return {
        ...(f.id ? { id: f.id } : {}),
        project_id: projectId,
        filename: f.filename,
        format: f.format,
        upload_status: "queued" as const,
        storage_mode: "local" as const,
        local_reference: localRef,
        uploaded_by: user.id,
      };
    });

    const { data: createdRows, error } = await supabase
      .from("documents")
      .insert(insertPayloads)
      .select();

    if (error || !createdRows) {
      console.error("Failed to insert documents in Supabase:", error?.message);
      throw new Error(error?.message || "Failed to persist documents");
    }

    return createdRows.map((row, idx) => {
      const domainDoc = mapDbDocumentToDomain(row);
      // Preserve client-calculated size_mb and file_path
      domainDoc.size_mb = files[idx]?.size_mb || 0;
      domainDoc.file_path = files[idx]?.file_path;
      return domainDoc;
    });
  }

  /**
   * Soft-deletes a document via secure RPC.
   */
  public async softDeleteDocument(documentId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.rpc("soft_delete_document", {
      p_document_id: documentId,
    });

    if (error) {
      console.error("Failed to delete document via RPC:", error.message);
      throw new Error(error.message);
    }
  }
}

export const documentService = new DocumentService();
