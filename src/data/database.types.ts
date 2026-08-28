/**
 * database.types.ts — Supabase PostgreSQL schema type definitions.
 *
 * Generated/defined to match supabase/migrations/20260827000001_initial_schema.sql
 * and docs/03_ARCHITECTURE/DATA_MODEL_SCHEMA.md.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrgRole = "owner" | "admin" | "manager" | "editor" | "viewer";
export type StorageMode = "local" | "cloud";
export type UploadStatus =
  | "queued"
  | "ingesting"
  | "classifying"
  | "detecting"
  | "complete"
  | "parsed"
  | "error";
export type SheetClassification =
  | "floor_plan"
  | "schedule"
  | "single_line"
  | "legend"
  | "notes";
export type RunStatus = "pending" | "running" | "complete" | "error";
export type DbLineItemStatus = "proposed" | "approved" | "rejected";
export type DbDetectionSource = "ai_detection" | "human_created";
export type DbCorrectionType =
  | "missed"
  | "false_positive"
  | "wrong_symbol"
  | "wrong_classification"
  | "duplicate"
  | "scope_excluded"
  | "sheet_conflict"
  | "manual_override"
  | "other";
export type DbExportFormat = "XLSX" | "CSV" | "JSON" | "PDF";
export type MessageRole = "user" | "agent";
export type DbPlanVersionStatus = "draft" | "active" | "superseded";
export type DbClaimSection =
  | "scope_outcomes"
  | "milestones"
  | "risks"
  | "dependencies";
export type DbClaimGrounding =
  | "known_from_evidence"
  | "inferred"
  | "human_decided"
  | "unresolved";
export type DbLineageRelationship = "split" | "merge";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          settings: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      org_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: OrgRole;
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: OrgRole;
          invited_by?: string | null;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          inferred_type: string | null;
          user_provided_type: string | null;
          verified_type: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          inferred_type?: string | null;
          user_provided_type?: string | null;
          verified_type?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          inferred_type?: string | null;
          user_provided_type?: string | null;
          verified_type?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: OrgRole;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: OrgRole;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: OrgRole;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          project_id: string;
          filename: string;
          format: string;
          upload_status: UploadStatus;
          storage_mode: StorageMode;
          local_reference: string | null;
          cloud_bucket: string | null;
          cloud_object_path: string | null;
          uploaded_by: string;
          uploaded_at: string;
          error_message: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          filename: string;
          format: string;
          upload_status?: UploadStatus;
          storage_mode?: StorageMode;
          local_reference?: string | null;
          cloud_bucket?: string | null;
          cloud_object_path?: string | null;
          uploaded_by: string;
          uploaded_at?: string;
          error_message?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          filename?: string;
          format?: string;
          upload_status?: UploadStatus;
          storage_mode?: StorageMode;
          local_reference?: string | null;
          cloud_bucket?: string | null;
          cloud_object_path?: string | null;
          uploaded_by?: string;
          uploaded_at?: string;
          error_message?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      sheets: {
        Row: {
          id: string;
          document_id: string;
          sheet_index: number;
          classification: SheetClassification | null;
          page_width: number | null;
          page_height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          sheet_index: number;
          classification?: SheetClassification | null;
          page_width?: number | null;
          page_height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          sheet_index?: number;
          classification?: SheetClassification | null;
          page_width?: number | null;
          page_height?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sheets_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          }
        ];
      };
      takeoff_runs: {
        Row: {
          id: string;
          project_id: string;
          triggered_by: string;
          model_version: string;
          status: RunStatus;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          triggered_by: string;
          model_version: string;
          status?: RunStatus;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          triggered_by?: string;
          model_version?: string;
          status?: RunStatus;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "takeoff_runs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      takeoff_run_documents: {
        Row: {
          takeoff_run_id: string;
          document_id: string;
        };
        Insert: {
          takeoff_run_id: string;
          document_id: string;
        };
        Update: {
          takeoff_run_id?: string;
          document_id?: string;
        };
        Relationships: [];
      };
      detections: {
        Row: {
          id: string;
          takeoff_run_id: string;
          sheet_id: string;
          component_type: string;
          quantity: number | null;
          geometry: Json | null;
          source_coordinates: Json;
          confidence: number | null;
          model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          takeoff_run_id: string;
          sheet_id: string;
          component_type: string;
          quantity?: number | null;
          geometry?: Json | null;
          source_coordinates: Json;
          confidence?: number | null;
          model_version: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          takeoff_run_id?: string;
          sheet_id?: string;
          component_type?: string;
          quantity?: number | null;
          geometry?: Json | null;
          source_coordinates?: Json;
          confidence?: number | null;
          model_version?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      line_items: {
        Row: {
          id: string;
          project_id: string;
          linked_detection_id: string | null;
          source: DbDetectionSource;
          item_code: string | null;
          name: string;
          category: string | null;
          current_value: number;
          unit_of_measure: string;
          status: DbLineItemStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          linked_detection_id?: string | null;
          source: DbDetectionSource;
          item_code?: string | null;
          name: string;
          category?: string | null;
          current_value: number;
          unit_of_measure: string;
          status?: DbLineItemStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          linked_detection_id?: string | null;
          source?: DbDetectionSource;
          item_code?: string | null;
          name?: string;
          category?: string | null;
          current_value?: number;
          unit_of_measure?: string;
          status?: DbLineItemStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      correction_events: {
        Row: {
          id: string;
          line_item_id: string;
          ai_value: string | null;
          human_value: string;
          delta: string | null;
          correction_type: DbCorrectionType;
          correction_reason: string | null;
          user_id: string;
          model_version: string | null;
          is_training_candidate: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          line_item_id: string;
          ai_value?: string | null;
          human_value: string;
          delta?: string | null;
          correction_type: DbCorrectionType;
          correction_reason?: string | null;
          user_id: string;
          model_version?: string | null;
          is_training_candidate?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          line_item_id?: string;
          ai_value?: string | null;
          human_value?: string;
          delta?: string | null;
          correction_type?: DbCorrectionType;
          correction_reason?: string | null;
          user_id?: string;
          model_version?: string | null;
          is_training_candidate?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      exports: {
        Row: {
          id: string;
          project_id: string;
          format: DbExportFormat;
          generated_by: string;
          generated_at: string;
          storage_mode: StorageMode;
          local_reference: string | null;
          cloud_bucket: string | null;
          cloud_object_path: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          format: DbExportFormat;
          generated_by: string;
          generated_at?: string;
          storage_mode?: StorageMode;
          local_reference?: string | null;
          cloud_bucket?: string | null;
          cloud_object_path?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          format?: DbExportFormat;
          generated_by?: string;
          generated_at?: string;
          storage_mode?: StorageMode;
          local_reference?: string | null;
          cloud_bucket?: string | null;
          cloud_object_path?: string | null;
        };
        Relationships: [];
      };
      chat_sessions: {
        Row: {
          id: string;
          project_id: string | null;
          title: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          title?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          title?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          session_id: string;
          role: MessageRole;
          content: string;
          tool_calls: Json;
          evidence_links: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: MessageRole;
          content: string;
          tool_calls?: Json;
          evidence_links?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: MessageRole;
          content?: string;
          tool_calls?: Json;
          evidence_links?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      session_shares: {
        Row: {
          session_id: string;
          user_id: string;
          role: OrgRole;
        };
        Insert: {
          session_id: string;
          user_id: string;
          role: OrgRole;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          role?: OrgRole;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      plan_claim_identities: {
        Row: {
          claim_id: string;
          project_id: string;
          created_at: string;
        };
        Insert: {
          claim_id?: string;
          project_id: string;
          created_at?: string;
        };
        Update: {
          claim_id?: string;
          project_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      project_plans: {
        Row: {
          id: string;
          project_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_plan_versions: {
        Row: {
          id: string;
          plan_id: string;
          version_number: number;
          status: DbPlanVersionStatus;
          created_by: string;
          created_at: string;
          activated_at: string | null;
          superseded_at: string | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          version_number: number;
          status?: DbPlanVersionStatus;
          created_by: string;
          created_at?: string;
          activated_at?: string | null;
          superseded_at?: string | null;
        };
        Update: {
          id?: string;
          plan_id?: string;
          version_number?: number;
          status?: DbPlanVersionStatus;
          created_by?: string;
          created_at?: string;
          activated_at?: string | null;
          superseded_at?: string | null;
        };
        Relationships: [];
      };
      plan_version_documents: {
        Row: {
          plan_version_id: string;
          document_id: string;
        };
        Insert: {
          plan_version_id: string;
          document_id: string;
        };
        Update: {
          plan_version_id?: string;
          document_id?: string;
        };
        Relationships: [];
      };
      decisions: {
        Row: {
          id: string;
          claim_id: string;
          project_id: string;
          decision_text: string;
          rationale: string | null;
          decided_by: string;
          decided_at: string;
          superseded_by: string | null;
          superseded_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          claim_id: string;
          project_id: string;
          decision_text: string;
          rationale?: string | null;
          decided_by: string;
          decided_at?: string;
          superseded_by?: string | null;
          superseded_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          claim_id?: string;
          project_id?: string;
          decision_text?: string;
          rationale?: string | null;
          decided_by?: string;
          decided_at?: string;
          superseded_by?: string | null;
          superseded_at?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      project_plan_claims: {
        Row: {
          id: string;
          claim_id: string;
          plan_version_id: string;
          section: DbClaimSection;
          content: string;
          grounding: DbClaimGrounding;
          evidence_links: Json;
          inference_rationale: string | null;
          unresolved_reason: string | null;
          conflict_with_decision_id: string | null;
          conflict_details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          claim_id: string;
          plan_version_id: string;
          section: DbClaimSection;
          content: string;
          grounding: DbClaimGrounding;
          evidence_links?: Json;
          inference_rationale?: string | null;
          unresolved_reason?: string | null;
          conflict_with_decision_id?: string | null;
          conflict_details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          claim_id?: string;
          plan_version_id?: string;
          section?: DbClaimSection;
          content?: string;
          grounding?: DbClaimGrounding;
          evidence_links?: Json;
          inference_rationale?: string | null;
          unresolved_reason?: string | null;
          conflict_with_decision_id?: string | null;
          conflict_details?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      claim_lineage: {
        Row: {
          id: string;
          parent_claim_id: string;
          child_claim_id: string;
          relationship: DbLineageRelationship;
          occurred_at: string;
          triggering_plan_version_id: string;
        };
        Insert: {
          id?: string;
          parent_claim_id: string;
          child_claim_id: string;
          relationship: DbLineageRelationship;
          occurred_at?: string;
          triggering_plan_version_id: string;
        };
        Update: {
          id?: string;
          parent_claim_id?: string;
          child_claim_id?: string;
          relationship?: DbLineageRelationship;
          occurred_at?: string;
          triggering_plan_version_id?: string;
        };
        Relationships: [];
      };
      plan_chat_sessions: {
        Row: {
          plan_id: string;
          chat_session_id: string;
          created_at: string;
        };
        Insert: {
          plan_id: string;
          chat_session_id: string;
          created_at?: string;
        };
        Update: {
          plan_id?: string;
          chat_session_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      effective_project_role: {
        Args: { p_project_id: string };
        Returns: OrgRole;
      };
      my_org_role: {
        Args: { p_org_id: string };
        Returns: OrgRole;
      };
      soft_delete_project: {
        Args: { p_project_id: string };
        Returns: void;
      };
      restore_project: {
        Args: { p_project_id: string };
        Returns: void;
      };
      soft_delete_document: {
        Args: { p_document_id: string };
        Returns: void;
      };
      approve_line_item: {
        Args: {
          p_line_item_id: string;
          p_human_value: string;
          p_correction_type: DbCorrectionType;
          p_reason?: string;
        };
        Returns: void;
      };
      reject_line_item: {
        Args: {
          p_line_item_id: string;
          p_correction_type: DbCorrectionType;
          p_reason: string;
        };
        Returns: void;
      };
      create_organization_with_owner: {
        Args: {
          p_name: string;
          p_settings?: Json;
        };
        Returns: string;
      };
      create_project_plan_draft: {
        Args: {
          p_project_id: string;
          p_document_ids: string[];
          p_claims: Json;
          p_lineage?: Json;
        };
        Returns: string;
      };
      accept_project_plan_draft: {
        Args: {
          p_draft_version_id: string;
          p_decision_resolutions?: Json;
        };
        Returns: void;
      };
      reject_project_plan_draft: {
        Args: {
          p_draft_version_id: string;
          p_reason?: string;
        };
        Returns: void;
      };
      start_plan_chat_session: {
        Args: {
          p_project_id: string;
          p_title?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      org_role: OrgRole;
      storage_mode: StorageMode;
      upload_status: UploadStatus;
      sheet_classification: SheetClassification;
      run_status: RunStatus;
      line_item_status: DbLineItemStatus;
      detection_source: DbDetectionSource;
      correction_type: DbCorrectionType;
      export_format: DbExportFormat;
      message_role: MessageRole;
      plan_version_status: DbPlanVersionStatus;
      claim_section: DbClaimSection;
      claim_grounding: DbClaimGrounding;
      lineage_relationship: DbLineageRelationship;
    };
  };
}
