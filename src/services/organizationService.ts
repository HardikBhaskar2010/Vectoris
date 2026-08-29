import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { Database, OrgRole, Json } from "../data/database.types";

export type DbOrganization = Database["public"]["Tables"]["organizations"]["Row"];
export type DbOrgMember = Database["public"]["Tables"]["org_members"]["Row"];

export interface WorkspaceMember extends DbOrgMember {
  name: string;
  email: string;
  status: "active" | "invited";
  avatar_color?: string;
}

export interface OrganizationWithRole extends DbOrganization {
  role: OrgRole;
  member_count?: number;
  project_count?: number;
}

const ACTIVE_ORG_KEY = "vectoris.activeOrgId";
const LOCAL_ORGS_KEY = "vectoris.organizations";
const LOCAL_MEMBERS_PREFIX = "vectoris.org_members.";

const memoryStorage: Map<string, string> = new Map();

function storageGet(key: string): string | null {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      // fallback to memory
    }
  }
  return memoryStorage.get(key) || null;
}

function storageSet(key: string, value: string): void {
  memoryStorage.set(key, value);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }
}

function storageRemove(key: string): void {
  memoryStorage.delete(key);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

const INITIAL_DEFAULT_ORGS: OrganizationWithRole[] = [
  {
    id: "org-vectoris-labs",
    name: "Vectoris Engineering Labs",
    owner_id: "user-primary-estimator",
    role: "owner",
    settings: { sector: "data-center", discipline: "Electrical", plan: "Enterprise Workstation" },
    created_at: "2026-01-15T08:00:00.000Z",
    updated_at: "2026-01-15T08:00:00.000Z",
    deleted_at: null,
    member_count: 2,
    project_count: 2,
  },
  {
    id: "org-lunatic-eng",
    name: "Lunatic Infrastructure",
    owner_id: "user-primary-estimator",
    role: "owner",
    settings: { sector: "industrial", discipline: "Multi-Disciplinary", plan: "Pro Workstation" },
    created_at: "2026-02-01T10:30:00.000Z",
    updated_at: "2026-02-01T10:30:00.000Z",
    deleted_at: null,
    member_count: 1,
    project_count: 0,
  },
];

const INITIAL_DEFAULT_MEMBERS: Record<string, WorkspaceMember[]> = {
  "org-vectoris-labs": [
    {
      id: "mem-primary-user",
      organization_id: "org-vectoris-labs",
      user_id: "user-primary-estimator",
      name: "Hardik Bhaskar",
      email: "hardik.bhaskar2010@gmail.com",
      role: "owner",
      status: "active",
      invited_by: null,
      joined_at: "2026-01-15T08:00:00.000Z",
      avatar_color: "#7d4047",
    },
    {
      id: "mem-collaborator-1",
      organization_id: "org-vectoris-labs",
      user_id: "user-collab-apex",
      name: "Sarah Chen",
      email: "s.chen@apexeng.internal",
      role: "admin",
      status: "active",
      invited_by: "user-primary-estimator",
      joined_at: "2026-02-10T14:22:00.000Z",
      avatar_color: "#8b5cf6",
    },
  ],
  "org-lunatic-eng": [
    {
      id: "mem-lunatic-user",
      organization_id: "org-lunatic-eng",
      user_id: "user-primary-estimator",
      name: "Hardik Bhaskar",
      email: "hardik.bhaskar2010@gmail.com",
      role: "owner",
      status: "active",
      invited_by: null,
      joined_at: "2026-02-01T10:30:00.000Z",
      avatar_color: "#7d4047",
    },
  ],
};

function generateAvatarColor(str: string): string {
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1", "#14b8a6"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

class OrganizationService {
  private listeners: Set<() => void> = new Set();
  private cachedOrgs: OrganizationWithRole[] = [];

  constructor() {
    this.ensureLocalStorageSeeded();
  }

  private ensureLocalStorageSeeded(): void {
    try {
      const storedOrgs = storageGet(LOCAL_ORGS_KEY);
      if (!storedOrgs) {
        storageSet(LOCAL_ORGS_KEY, JSON.stringify(INITIAL_DEFAULT_ORGS));
      }
      for (const [orgId, members] of Object.entries(INITIAL_DEFAULT_MEMBERS)) {
        const memKey = LOCAL_MEMBERS_PREFIX + orgId;
        if (!storageGet(memKey)) {
          storageSet(memKey, JSON.stringify(members));
        }
      }
      if (!storageGet(ACTIVE_ORG_KEY)) {
        storageSet(ACTIVE_ORG_KEY, INITIAL_DEFAULT_ORGS[0].id);
      }
    } catch (e) {
      console.warn("Failed to seed initial organizations:", e);
    }
  }

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
    if (this.cachedOrgs.length > 0) return this.cachedOrgs;
    return this.getLocalOrganizations();
  }

  private getLocalOrganizations(): OrganizationWithRole[] {
    try {
      const stored = storageGet(LOCAL_ORGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OrganizationWithRole[];
        return parsed.filter((o) => !o.deleted_at);
      }
    } catch {
      // Fallback
    }
    return INITIAL_DEFAULT_ORGS;
  }

  private saveLocalOrganizations(orgs: OrganizationWithRole[]): void {
    try {
      storageSet(LOCAL_ORGS_KEY, JSON.stringify(orgs));
    } catch (err) {
      console.warn("Failed to save local organizations:", err);
    }
  }

  private getLocalMembers(orgId: string): WorkspaceMember[] {
    try {
      const stored = storageGet(LOCAL_MEMBERS_PREFIX + orgId);
      if (stored) {
        return JSON.parse(stored) as WorkspaceMember[];
      }
    } catch {
      // Fallback
    }
    return INITIAL_DEFAULT_MEMBERS[orgId] || [];
  }

  private saveLocalMembers(orgId: string, members: WorkspaceMember[]): void {
    try {
      storageSet(LOCAL_MEMBERS_PREFIX + orgId, JSON.stringify(members));
    } catch (err) {
      console.warn("Failed to save local members for org:", orgId, err);
    }
  }

  /**
   * Retrieves all organizations that the current authenticated user belongs to.
   */
  public async getUserOrganizations(): Promise<OrganizationWithRole[]> {
    if (!isSupabaseConfigured()) {
      const local = this.getLocalOrganizations();
      this.cachedOrgs = local;
      return local;
    }

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

      if (error || !data || data.length === 0) {
        const local = this.getLocalOrganizations();
        this.cachedOrgs = local;
        return local;
      }

      const remoteOrgs: OrganizationWithRole[] = [];
      for (const item of data) {
        const org = item.organizations as unknown as DbOrganization;
        if (org && !org.deleted_at) {
          remoteOrgs.push({
            ...org,
            role: item.role,
          });
        }
      }

      // Merge with local newly created orgs if any
      const localOrgs = this.getLocalOrganizations();
      const remoteIds = new Set(remoteOrgs.map((o) => o.id));
      const combined = [...remoteOrgs, ...localOrgs.filter((o) => !remoteIds.has(o.id) && !o.deleted_at)];

      this.cachedOrgs = combined;
      this.saveLocalOrganizations(combined);
      this.notify();
      return combined;
    } catch (err) {
      console.warn("Error fetching user organizations from Supabase, using local store:", err);
      const local = this.getLocalOrganizations();
      this.cachedOrgs = local;
      return local;
    }
  }

  /**
   * Creates a new organization transactionally with the calling user as Owner.
   */
  public async createOrganization(
    name: string,
    settings: Json = {}
  ): Promise<string> {
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Workspace name cannot be empty.");

    const newOrgId = `org-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newOrg: OrganizationWithRole = {
      id: newOrgId,
      name: cleanName,
      owner_id: "user-primary-estimator",
      role: "owner",
      settings,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      member_count: 1,
      project_count: 0,
    };

    // Add current user as the initial Owner member
    const initialOwner: WorkspaceMember = {
      id: `mem-${Date.now()}`,
      organization_id: newOrgId,
      user_id: "user-primary-estimator",
      name: "Hardik Bhaskar",
      email: "hardik.bhaskar2010@gmail.com",
      role: "owner",
      status: "active",
      invited_by: null,
      joined_at: timestamp,
      avatar_color: "#7d4047",
    };

    const currentLocal = this.getLocalOrganizations();
    const updatedLocal = [...currentLocal, newOrg];
    this.saveLocalOrganizations(updatedLocal);
    this.saveLocalMembers(newOrgId, [initialOwner]);
    this.cachedOrgs = updatedLocal;
    this.setActiveOrganizationId(newOrgId);

    if (isSupabaseConfigured()) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (user) {
          const { data, error } = await supabase.rpc("create_organization_with_owner", {
            p_name: cleanName,
            p_settings: settings,
          });

          if (!error && data) {
            const remoteOrgId = data as string;
            newOrg.id = remoteOrgId;
            newOrg.owner_id = user.id;
            initialOwner.organization_id = remoteOrgId;
            initialOwner.user_id = user.id;
            initialOwner.email = user.email || initialOwner.email;

            const synced = updatedLocal.map((o) => (o.id === newOrgId ? newOrg : o));
            this.saveLocalOrganizations(synced);
            this.saveLocalMembers(remoteOrgId, [initialOwner]);
            this.cachedOrgs = synced;
            this.setActiveOrganizationId(remoteOrgId);
            return remoteOrgId;
          }
        }
      } catch (err) {
        console.warn("Supabase create_organization_with_owner failed, preserved locally:", err);
      }
    }

    this.notify();
    return newOrgId;
  }

  /**
   * Gets the active organization ID from local storage or defaults to the first available organization.
   */
  public getActiveOrganizationId(): string | null {
    try {
      const stored = storageGet(ACTIVE_ORG_KEY);
      if (stored) return stored;
      const orgs = this.getLocalOrganizations();
      if (orgs.length > 0) return orgs[0].id;
    } catch {
      // Fallback
    }
    return null;
  }

  /**
   * Sets the active organization ID in local storage and notifies listeners.
   */
  public setActiveOrganizationId(orgId: string): void {
    try {
      storageSet(ACTIVE_ORG_KEY, orgId);
      this.notify();
    } catch (err) {
      console.warn("Failed to persist active organization ID:", err);
    }
  }

  /**
   * Fetches all members of a given organization.
   */
  public async getOrgMembers(orgId: string): Promise<WorkspaceMember[]> {
    const local = this.getLocalMembers(orgId);

    if (!isSupabaseConfigured()) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from("org_members")
        .select("*")
        .eq("organization_id", orgId);

      if (error || !data) {
        return local;
      }

      // Merge remote members with local metadata (name, email, status)
      const remoteMembers: WorkspaceMember[] = data.map((m) => {
        const matchedLocal = local.find((l) => l.user_id === m.user_id || l.id === m.id);
        return {
          ...m,
          name: matchedLocal?.name || (m.role === "owner" ? "Hardik Bhaskar" : `Engineer (${m.role})`),
          email: matchedLocal?.email || `${m.user_id.substring(0, 8)}@apexeng.internal`,
          status: matchedLocal?.status || "active",
          avatar_color: matchedLocal?.avatar_color || generateAvatarColor(m.user_id),
        };
      });

      // Keep any locally invited members not yet synced to remote
      const remoteUserIds = new Set(remoteMembers.map((rm) => rm.user_id));
      const localOnly = local.filter((lm) => !remoteUserIds.has(lm.user_id));
      const merged = [...remoteMembers, ...localOnly];

      this.saveLocalMembers(orgId, merged);
      return merged;
    } catch (err) {
      console.warn("getOrgMembers error from Supabase, using local store:", err);
      return local;
    }
  }

  /**
   * Updates an organization's display name.
   */
  public async updateOrganizationName(orgId: string, name: string): Promise<boolean> {
    const cleanName = name.trim();
    if (!cleanName) return false;

    // Snapshot current state for rollback if remote fails
    const localOrgs = this.getLocalOrganizations();
    const updated = localOrgs.map((o) =>
      o.id === orgId ? { ...o, name: cleanName, updated_at: new Date().toISOString() } : o
    );
    this.saveLocalOrganizations(updated);
    this.cachedOrgs = updated;
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("organizations")
          .update({ name: cleanName, updated_at: new Date().toISOString() })
          .eq("id", orgId);

        if (error) {
          console.error("updateOrganizationName Supabase error, rolling back:", error.message);
          this.saveLocalOrganizations(localOrgs);
          this.cachedOrgs = localOrgs;
          this.notify();
          return false;
        }
      } catch (err) {
        console.error("updateOrganizationName remote exception, rolling back:", err);
        this.saveLocalOrganizations(localOrgs);
        this.cachedOrgs = localOrgs;
        this.notify();
        return false;
      }
    }

    return true;
  }

  /**
   * Deletes a workspace organization (owner only).
   */
  public async deleteOrganization(orgId: string): Promise<boolean> {
    const localOrgs = this.getLocalOrganizations();
    const target = localOrgs.find((o) => o.id === orgId);
    if (!target) return false;

    const remaining = localOrgs.filter((o) => o.id !== orgId);

    // If deleting active org, switch to first remaining or fallback
    if (this.getActiveOrganizationId() === orgId) {
      const nextOrgId = remaining.length > 0 ? remaining[0].id : INITIAL_DEFAULT_ORGS[0].id;
      this.setActiveOrganizationId(nextOrgId);
    }

    this.saveLocalOrganizations(remaining.length > 0 ? remaining : INITIAL_DEFAULT_ORGS);
    this.cachedOrgs = remaining.length > 0 ? remaining : INITIAL_DEFAULT_ORGS;

    // Remove local members key
    try {
      storageRemove(LOCAL_MEMBERS_PREFIX + orgId);
    } catch {
      // Ignore
    }

    this.notify();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("organizations")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", orgId);

        if (error) {
          console.error("deleteOrganization Supabase error, rolling back:", error.message);
          this.saveLocalOrganizations(localOrgs);
          this.cachedOrgs = localOrgs;
          this.notify();
          return false;
        }
      } catch (err) {
        console.error("deleteOrganization remote exception, rolling back:", err);
        this.saveLocalOrganizations(localOrgs);
        this.cachedOrgs = localOrgs;
        this.notify();
        return false;
      }
    }

    return true;
  }

  /**
   * Adds / invites a new member to an organization with real name & email.
   */
  public async inviteMember(
    orgId: string,
    params: { email: string; name?: string; role: OrgRole }
  ): Promise<WorkspaceMember> {
    const cleanEmail = params.email.trim();
    const displayName = (params.name?.trim() || cleanEmail.split("@")[0].replace(/[._-]/g, " "))
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const timestamp = new Date().toISOString();
    const syntheticUserId = `user-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newMember: WorkspaceMember = {
      id: `mem-${Date.now()}`,
      organization_id: orgId,
      user_id: syntheticUserId,
      name: displayName,
      email: cleanEmail,
      role: params.role,
      status: "invited",
      invited_by: "user-primary-estimator",
      joined_at: timestamp,
      avatar_color: generateAvatarColor(cleanEmail),
    };

    // Snapshot and update in local store
    const localMembers = this.getLocalMembers(orgId);
    const updatedMembers = [...localMembers.filter((m) => m.email.toLowerCase() !== cleanEmail.toLowerCase()), newMember];
    this.saveLocalMembers(orgId, updatedMembers);
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("org_members").insert({
          organization_id: orgId,
          user_id: syntheticUserId,
          role: params.role,
          joined_at: timestamp,
        });

        if (error) {
          console.error("inviteMember Supabase insert error, rolling back:", error.message);
          this.saveLocalMembers(orgId, localMembers);
          this.notify();
          throw new Error(`Failed to invite member: ${error.message}`);
        }
      } catch (err: any) {
        console.error("inviteMember Supabase exception, rolling back:", err);
        this.saveLocalMembers(orgId, localMembers);
        this.notify();
        throw new Error(err?.message || "Failed to invite member");
      }
    }

    return newMember;
  }

  /**
   * Updates an organization member's role.
   */
  public async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgRole
  ): Promise<boolean> {
    const local = this.getLocalMembers(orgId);
    const updated = local.map((m) => (m.user_id === userId ? { ...m, role } : m));
    this.saveLocalMembers(orgId, updated);
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("org_members")
          .update({ role })
          .eq("organization_id", orgId)
          .eq("user_id", userId);

        if (error) {
          console.error("updateMemberRole Supabase error, rolling back:", error.message);
          this.saveLocalMembers(orgId, local);
          this.notify();
          return false;
        }
      } catch (err) {
        console.error("updateMemberRole Supabase exception, rolling back:", err);
        this.saveLocalMembers(orgId, local);
        this.notify();
        return false;
      }
    }

    return true;
  }

  /**
   * Removes a member from an organization.
   */
  public async removeMember(orgId: string, userId: string): Promise<boolean> {
    const local = this.getLocalMembers(orgId);
    const updated = local.filter((m) => m.user_id !== userId);
    this.saveLocalMembers(orgId, updated);
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("org_members")
          .delete()
          .eq("organization_id", orgId)
          .eq("user_id", userId);

        if (error) {
          console.error("removeMember Supabase error, rolling back:", error.message);
          this.saveLocalMembers(orgId, local);
          this.notify();
          return false;
        }
      } catch (err) {
        console.error("removeMember Supabase exception, rolling back:", err);
        this.saveLocalMembers(orgId, local);
        this.notify();
        return false;
      }
    }

    return true;
  }

  /**
   * Resends an invitation to an invited member.
   */
  public async resendInvitation(orgId: string, userId: string): Promise<boolean> {
    const local = this.getLocalMembers(orgId);
    const found = local.find((m) => m.user_id === userId);
    if (!found) return false;

    // Simulate instant dispatch and timestamp bump
    const updated = local.map((m) =>
      m.user_id === userId ? { ...m, joined_at: new Date().toISOString() } : m
    );
    this.saveLocalMembers(orgId, updated);
    this.notify();
    return true;
  }

  /**
   * Joins an organization via an invitation code or organization UUID.
   */
  public async joinOrganizationByCode(
    orgIdOrCode: string,
    role: OrgRole = "editor"
  ): Promise<{ success: boolean; orgId?: string; error?: string }> {
    const cleanId = orgIdOrCode.trim();
    if (!cleanId) return { success: false, error: "Please provide a valid workspace ID or invite code." };

    this.setActiveOrganizationId(cleanId);
    this.notify();
    return { success: true, orgId: cleanId };
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
