import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { Database, OrgRole, Json } from "../data/database.types";

export type DbOrganization = Database["public"]["Tables"]["organizations"]["Row"];
export type DbOrgMember = Database["public"]["Tables"]["org_members"]["Row"];

export interface OrganizationWithRole extends DbOrganization {
  role: OrgRole;
}

const ACTIVE_ORG_KEY = "vectoris.activeOrgId";

class OrganizationService {
  private listeners: Set<() => void> = new Set();
  private cachedOrgs: OrganizationWithRole[] = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("OrganizationService subscriber error:", err);
      }
    });
  }

  public getCachedOrganizations(): OrganizationWithRole[] {
    return this.cachedOrgs;
  }

  /**
   * Retrieves all organizations that the current authenticated user belongs to.
   */
  public async getUserOrganizations(): Promise<OrganizationWithRole[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("org_members")
        .select(`
          role,
          organizations (
            id,
            name,
            owner_id,
            settings,
            created_at,
            updated_at,
            deleted_at
          )
        `);

      if (error || !data) {
        console.warn("Failed to fetch organizations:", error?.message);
        return [];
      }

      const orgs: OrganizationWithRole[] = [];
      for (const item of data) {
        const org = item.organizations as unknown as DbOrganization;
        if (org && !org.deleted_at) {
          orgs.push({
            ...org,
            role: item.role,
          });
        }
      }

      this.cachedOrgs = orgs;
      this.notify();
      return orgs;
    } catch (err) {
      console.warn("Error fetching user organizations:", err);
      return [];
    }
  }

  /**
   * Creates a new organization transactionally with the calling user as Owner.
   */
  public async createOrganization(name: string, settings: Json = {}): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      const mockId = `local-org-${Date.now()}`;
      this.setActiveOrganizationId(mockId);
      return mockId;
    }

    try {
      // Verify active Supabase auth session
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        console.warn("No active Supabase session found for createOrganization. Using local workspace context.");
        const localOrgId = `org-local-${Date.now()}`;
        this.setActiveOrganizationId(localOrgId);
        return localOrgId;
      }

      const { data, error } = await supabase.rpc("create_organization_with_owner", {
        p_name: name.trim(),
        p_settings: settings,
      });

      if (error) {
        console.error("Failed to create organization via RPC:", error.message);
        if (error.message.includes("authenticated")) {
          console.warn("RPC reported unauthenticated session, creating local workspace fallback.");
          const localOrgId = `org-local-${Date.now()}`;
          this.setActiveOrganizationId(localOrgId);
          return localOrgId;
        }
        throw new Error(error.message);
      }

      const orgId = data as string;
      this.setActiveOrganizationId(orgId);
      return orgId;
    } catch (err) {
      console.error("createOrganization error:", err);
      throw err;
    }
  }

  /**
   * Gets the active organization ID from local storage or defaults to the first available organization.
   */
  public getActiveOrganizationId(): string | null {
    try {
      return window.localStorage.getItem(ACTIVE_ORG_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Sets the active organization ID in local storage.
   */
  public setActiveOrganizationId(orgId: string): void {
    try {
      window.localStorage.setItem(ACTIVE_ORG_KEY, orgId);
      this.notify();
    } catch (err) {
      console.warn("Failed to persist active organization ID:", err);
    }
  }

  /**
   * Fetches all members of a given organization.
   */
  public async getOrgMembers(orgId: string): Promise<DbOrgMember[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("org_members")
        .select("*")
        .eq("organization_id", orgId);

      if (error) {
        console.warn("Failed to fetch org members:", error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn("getOrgMembers error:", err);
      return [];
    }
  }

  /**
   * Updates an organization's display name.
   */
  public async updateOrganizationName(orgId: string, name: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: name.trim(), updated_at: new Date().toISOString() })
        .eq("id", orgId);

      if (error) {
        console.warn("Failed to update organization name:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("updateOrganizationName error:", err);
      return false;
    }
  }

  /**
   * Adds / invites a new member to an organization.
   */
  public async inviteMember(
    orgId: string,
    userId: string,
    role: OrgRole
  ): Promise<DbOrgMember | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from("org_members")
        .insert({
          organization_id: orgId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.warn("Failed to invite org member:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn("inviteMember error:", err);
      return null;
    }
  }

  /**
   * Updates an organization member's role.
   */
  public async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgRole
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await supabase
        .from("org_members")
        .update({ role })
        .eq("organization_id", orgId)
        .eq("user_id", userId);

      if (error) {
        console.warn("Failed to update member role:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("updateMemberRole error:", err);
      return false;
    }
  }

  /**
   * Joins an organization via an invitation code or organization UUID.
   */
  public async joinOrganizationByCode(
    orgIdOrCode: string,
    role: OrgRole = "editor"
  ): Promise<{ success: boolean; orgId?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      this.setActiveOrganizationId(orgIdOrCode);
      return { success: true, orgId: orgIdOrCode };
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        return { success: false, error: "Authentication session expired. Please sign in again." };
      }

      // Check if organization exists
      const cleanOrgId = orgIdOrCode.trim();
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", cleanOrgId)
        .maybeSingle();

      if (orgError || !org) {
        return {
          success: false,
          error: "Organization not found. Please check your workspace invite code or UUID.",
        };
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("org_members")
        .select("id")
        .eq("organization_id", org.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingMember) {
        const { error: insertError } = await supabase.from("org_members").insert({
          organization_id: org.id,
          user_id: userId,
          role,
          joined_at: new Date().toISOString(),
        });

        if (insertError) {
          return { success: false, error: insertError.message };
        }
      }

      this.setActiveOrganizationId(org.id);
      return { success: true, orgId: org.id };
    } catch (err) {
      console.warn("joinOrganizationByCode error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to join organization.",
      };
    }
  }

  /**
   * Removes a member from an organization.
   */
  public async removeMember(orgId: string, userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("organization_id", orgId)
        .eq("user_id", userId);

      if (error) {
        console.warn("Failed to remove member:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("removeMember error:", err);
      return false;
    }
  }
}

export const organizationService = new OrganizationService();

export function useActiveOrganization(): {
  org: OrganizationWithRole | null;
  role: OrgRole;
  orgs: OrganizationWithRole[];
  loading: boolean;
} {
  const [orgs, setOrgs] = useState<OrganizationWithRole[]>(() => organizationService.getCachedOrganizations());
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => organizationService.getActiveOrganizationId());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    organizationService.getUserOrganizations().then((list) => {
      if (mounted) {
        setOrgs(list);
        setLoading(false);
        const current = organizationService.getActiveOrganizationId();
        if (!current && list.length > 0) {
          organizationService.setActiveOrganizationId(list[0].id);
          setActiveOrgId(list[0].id);
        } else {
          setActiveOrgId(current);
        }
      }
    });

    const unsubscribe = organizationService.subscribe(() => {
      if (mounted) {
        setOrgs(organizationService.getCachedOrganizations());
        setActiveOrgId(organizationService.getActiveOrganizationId());
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) || orgs[0] || null;
  const role: OrgRole = activeOrg?.role || "owner";

  return {
    org: activeOrg,
    role,
    orgs,
    loading,
  };
}
