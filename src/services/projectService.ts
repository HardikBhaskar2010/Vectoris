/**
 * projectService.ts — Project domain & persistence service.
 *
 * Interacts with Postgres tables `projects`, `project_members` via Supabase PostgREST & RPCs.
 * Maps records cleanly through domain mappers before returning to dataService.
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { mapDbProjectToDomain } from "./domainMappers";
import type { Project, ProjectSector } from "../data/types";
import type { Database } from "../data/database.types";

export interface CreateProjectPayload {
  organizationId: string;
  name: string;
  description?: string;
  client?: string;
  sector?: ProjectSector;
  discipline?: string;
}

export interface UpdateProjectTypePayload {
  projectId: string;
  displayType: string;
  provenance: "ai_inferred" | "user_provided" | "verified";
}

class ProjectService {
  /**
   * Retrieves all non-deleted projects for an organization.
   */
  public async getProjects(organizationId: string): Promise<Project[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select(`
          id,
          organization_id,
          name,
          description,
          inferred_type,
          user_provided_type,
          verified_type,
          created_by,
          created_at,
          updated_at,
          deleted_at
        `)
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.warn("Failed to fetch projects from Supabase:", projectsError.message);
        return [];
      }

      if (!projectsData || projectsData.length === 0) {
        return [];
      }

      // Fetch project members for these projects
      const projectIds = projectsData.map((p) => p.id);
      const { data: membersData } = await supabase
        .from("project_members")
        .select("*")
        .in("project_id", projectIds);

      const membersByProject = new Map<string, Database["public"]["Tables"]["project_members"]["Row"][]>();
      if (membersData) {
        for (const m of membersData) {
          const list = membersByProject.get(m.project_id) || [];
          list.push(m);
          membersByProject.set(m.project_id, list);
        }
      }

      return projectsData.map((row) =>
        mapDbProjectToDomain(row, membersByProject.get(row.id) || [])
      );
    } catch (err) {
      console.warn("ProjectService.getProjects error:", err);
      return [];
    }
  }

  /**
   * Retrieves a single project by ID.
   */
  public async getProject(projectId: string): Promise<Project | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data: projectRow, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .is("deleted_at", null)
        .single();

      if (projectError || !projectRow) {
        return null;
      }

      const { data: membersData } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId);

      return mapDbProjectToDomain(projectRow, membersData || []);
    } catch (err) {
      console.warn("ProjectService.getProject error:", err);
      return null;
    }
  }

  /**
   * Persists a new project to Supabase.
   */
  public async createProject(payload: CreateProjectPayload): Promise<Project> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User must be authenticated to create a project");
    }

    const userProvidedType = payload.sector
      ? `${payload.sector} · ${payload.discipline || "Electrical"}`
      : null;

    const { data: createdRow, error: createError } = await supabase
      .from("projects")
      .insert({
        organization_id: payload.organizationId,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        user_provided_type: userProvidedType,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !createdRow) {
      console.error("Failed to create project in Supabase:", createError?.message);
      throw new Error(createError?.message || "Failed to create project");
    }

    // Automatically add creator as owner in project_members
    await supabase.from("project_members").insert({
      project_id: createdRow.id,
      user_id: user.id,
      role: "owner",
      assigned_by: user.id,
    });

    return mapDbProjectToDomain(createdRow, [
      {
        id: "pm-initial",
        project_id: createdRow.id,
        user_id: user.id,
        role: "owner",
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      },
    ]);
  }

  /**
   * Updates project classification and provenance.
   */
  public async updateProjectType(payload: UpdateProjectTypePayload): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const updateFields: {
      user_provided_type?: string | null;
      verified_type?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (payload.provenance === "verified") {
      updateFields.verified_type = payload.displayType;
    } else if (payload.provenance === "user_provided") {
      updateFields.user_provided_type = payload.displayType;
    }

    const { error } = await supabase
      .from("projects")
      .update(updateFields)
      .eq("id", payload.projectId);

    if (error) {
      console.error("Failed to update project type:", error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Soft-deletes a project via secure RPC.
   */
  public async softDeleteProject(projectId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.rpc("soft_delete_project", {
      p_project_id: projectId,
    });

    if (error) {
      console.error("Failed to delete project:", error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Restores a soft-deleted project via secure RPC.
   */
  public async restoreProject(projectId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase.rpc("restore_project", {
      p_project_id: projectId,
    });

    if (error) {
      console.error("Failed to restore project:", error.message);
      throw new Error(error.message);
    }
  }

  /**
   * Updates project attributes (name, description, client, etc.) in Supabase.
   */
  public async updateProject(
    projectId: string,
    patch: {
      name?: string;
      description?: string;
      client?: string;
      sector?: ProjectSector;
      discipline?: string;
    }
  ): Promise<Project> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured");
    }

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name !== undefined) updateFields.name = patch.name.trim();
    if (patch.description !== undefined) updateFields.description = patch.description.trim();
    if (patch.sector !== undefined) {
      updateFields.user_provided_type = `${patch.sector} · ${patch.discipline || "General"}`;
    }

    const { data: updatedRow, error } = await supabase
      .from("projects")
      .update(updateFields as any)
      .eq("id", projectId)
      .select()
      .single();

    if (error || !updatedRow) {
      console.error("Failed to update project in Supabase:", error?.message);
      throw new Error(error?.message || "Failed to update project");
    }

    const { data: membersData } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", projectId);

    return mapDbProjectToDomain(updatedRow, membersData || []);
  }
}

export const projectService = new ProjectService();
