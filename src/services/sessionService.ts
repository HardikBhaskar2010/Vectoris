/**
 * sessionService.ts — Investigation Workshop chat sessions & message persistence service.
 *
 * Interacts with Postgres tables `chat_sessions`, `messages`, `session_shares`
 * via Supabase PostgREST with strict Row-Level Security.
 */

import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { mapDbSessionToDomain, mapDbMessageToDomain } from "./domainMappers";
import type {
  ChatSession,
  ChatMessage,
  EvidenceData,
  ActionProposal,
  ToolTraceStep,
} from "../data/types";
import type { Database, Json } from "../data/database.types";

export interface CreateSessionParams {
  project_id?: string | null;
  project_name?: string | null;
  title: string;
  initialMessage?: string;
}

export interface AddMessageParams {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  thought_trace?: string[];
  tool_steps?: ToolTraceStep[];
  evidence?: EvidenceData;
  action_proposal?: ActionProposal;
}

class SessionService {
  /**
   * Retrieves all chat sessions accessible to the current user.
   */
  public async getSessions(projectId?: string | null): Promise<ChatSession[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("chat_sessions")
        .select(`
          id,
          project_id,
          title,
          created_by,
          created_at,
          updated_at,
          projects (
            name
          )
        `)
        .order("updated_at", { ascending: false });

      if (projectId !== undefined) {
        if (projectId === null) {
          query = query.is("project_id", null);
        } else {
          query = query.eq("project_id", projectId);
        }
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError || !sessionsData) {
        console.warn("Failed to fetch sessions from Supabase:", sessionsError?.message);
        return [];
      }

      if (sessionsData.length === 0) return [];

      const sessionIds = sessionsData.map((s) => s.id);

      // Fetch messages for these sessions
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      const messagesBySession = new Map<string, ChatMessage[]>();
      if (messagesData) {
        for (const m of messagesData) {
          const list = messagesBySession.get(m.session_id) || [];
          list.push(mapDbMessageToDomain(m));
          messagesBySession.set(m.session_id, list);
        }
      }

      return sessionsData.map((s) => {
        const proj = s.projects as unknown as { name?: string } | null;
        const projectName = proj?.name || null;
        return mapDbSessionToDomain(
          s,
          messagesBySession.get(s.id) || [],
          projectName
        );
      });
    } catch (err) {
      console.warn("SessionService.getSessions error:", err);
      return [];
    }
  }

  /**
   * Retrieves a single investigation session by ID.
   */
  public async getSession(sessionId: string): Promise<ChatSession | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data: sessionRow, error: sessionError } = await supabase
        .from("chat_sessions")
        .select(`
          id,
          project_id,
          title,
          created_by,
          created_at,
          updated_at,
          projects (
            name
          )
        `)
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionRow) {
        return null;
      }

      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      const messages = (messagesData || []).map((m) => mapDbMessageToDomain(m));
      const proj = sessionRow.projects as unknown as { name?: string } | null;

      return mapDbSessionToDomain(sessionRow, messages, proj?.name || null);
    } catch (err) {
      console.warn("SessionService.getSession error:", err);
      return null;
    }
  }

  /**
   * Creates a new chat session in Supabase.
   */
  public async createSession(params: CreateSessionParams): Promise<ChatSession> {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase is not configured");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User must be authenticated to create an investigation session");
    }

    const { data: createdRow, error } = await supabase
      .from("chat_sessions")
      .insert({
        project_id: params.project_id || null,
        title: params.title.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !createdRow) {
      console.error("Failed to create chat session in Supabase:", error?.message);
      throw new Error(error?.message || "Failed to create session");
    }

    const messages: ChatMessage[] = [];

    if (params.initialMessage?.trim()) {
      const initialMsg = await this.addMessage({
        sessionId: createdRow.id,
        role: "user",
        content: params.initialMessage.trim(),
      });
      if (initialMsg) {
        messages.push(initialMsg);
      }
    }

    return mapDbSessionToDomain(createdRow, messages, params.project_name || null);
  }

  /**
   * Appends a message with tool traces and evidence links to a session.
   */
  public async addMessage(params: AddMessageParams): Promise<ChatMessage | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const toolCallsJson = (params.tool_steps || []) as unknown as Json;
      const evidenceLinksJson: Json = {
        thought_trace: (params.thought_trace || []) as unknown as Json,
        evidence: (params.evidence || null) as unknown as Json,
        action_proposal: (params.action_proposal || null) as unknown as Json,
      };

      const dbRole: Database["public"]["Enums"]["message_role"] =
        params.role === "assistant" ? "agent" : "user";

      const { data: createdMsg, error } = await supabase
        .from("messages")
        .insert({
          session_id: params.sessionId,
          role: dbRole,
          content: params.content,
          tool_calls: toolCallsJson,
          evidence_links: evidenceLinksJson,
        })
        .select()
        .single();

      if (error || !createdMsg) {
        console.error("Failed to insert message:", error?.message);
        return null;
      }

      // Update session updated_at timestamp
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", params.sessionId);

      return mapDbMessageToDomain(createdMsg);
    } catch (err) {
      console.warn("SessionService.addMessage error:", err);
      return null;
    }
  }

  /**
   * Deletes an investigation session.
   */
  public async deleteSession(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Failed to delete session:", error.message);
      throw new Error(error.message);
    }
  }
}

export const sessionService = new SessionService();
