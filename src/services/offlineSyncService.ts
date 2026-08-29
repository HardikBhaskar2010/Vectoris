/**
 * offlineSyncService.ts — Local-First Mutation Queue & Synchronization Engine.
 *
 * Guarantees zero silent mutation drops by persisting offline actions to localStorage
 * and replaying them sequentially via registered domain executors when connectivity resumes.
 *
 * IDEMPOTENCY INVARIANT:
 *   Every queued mutation carries a stable UUID mutation_id to prevent duplicate remote writes
 *   upon network replay or retry.
 */

export interface QueuedMutation {
  id: string;
  mutation_id: string; // Stable UUID for remote idempotency
  type:
    | "line_item_status"
    | "manual_line_item"
    | "project_plan_draft"
    | "proposal_status"
    | "project_type"
    | "project_create"
    | "project_update"
    | "project_delete"
    | "project_plan_accept"
    | "project_plan_reject";
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount: number;
  status: "pending" | "replaying" | "failed";
  lastError?: string;
}

export type MutationExecutor = (mutation: QueuedMutation) => Promise<boolean>;

const STORAGE_KEY = "vectoris.offline_mutation_queue";

/**
 * Robustly classifies whether an error represents a genuine network/offline failure
 * vs a remote database/RLS/application rejection.
 */
export function isNetworkOfflineError(err: unknown): boolean {
  if (!offlineSyncService.isOnline()) {
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  if (!err) return false;

  const e = err as any;

  // Postgres SQLSTATE codes (e.g. 42501 for RLS denial, 23505 for unique violation, P0001 for user exception)
  if (
    e.code &&
    typeof e.code === "string" &&
    (e.code.length === 5 || e.code.startsWith("P") || e.code.startsWith("2") || e.code.startsWith("4"))
  ) {
    return false; // Server was reached and returned a database error
  }

  // HTTP response status codes >= 400 with a message from server
  if (
    typeof e.status === "number" &&
    e.status >= 400 &&
    e.status < 600 &&
    e.message &&
    !e.message.toLowerCase().includes("failed to fetch")
  ) {
    return false; // Server was reached and returned an HTTP error
  }

  const msg = (e.message || String(err)).toLowerCase();
  const name = (e.name || "").toLowerCase();

  if (
    name === "aborterror" ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("networkerror") ||
    msg.includes("network error") ||
    msg.includes("enotfound") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("connection refused") ||
    msg.includes("the internet connection appears to be offline") ||
    msg.includes("offline")
  ) {
    return true;
  }

  return false;
}

class OfflineSyncService {
  private queue: QueuedMutation[] = [];
  private isReplaying = false;
  private listeners: Array<(pendingCount: number) => void> = [];
  private executors = new Map<string, MutationExecutor>();
  private simulatedOnline: boolean | null = null;

  constructor() {
    this.loadQueue();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("🌐 Network reconnected — initiating offline mutation queue replay.");
        this.replayPendingMutations().catch((err) =>
          console.warn("Automatic offline replay failed:", err)
        );
      });
    }
  }

  /**
   * Overrides online state for testing or simulation. Set to null to restore default behavior.
   */
  public setOnline(online: boolean | null): void {
    this.simulatedOnline = online;
  }

  /**
   * Registers a domain-specific executor for a mutation type.
   */
  public registerExecutor(type: QueuedMutation["type"], executor: MutationExecutor): void {
    this.executors.set(type, executor);
  }

  private loadQueue(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (err) {
      console.warn("Failed to load offline mutation queue from localStorage:", err);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
      this.notify();
    } catch (err) {
      console.warn("Failed to persist offline mutation queue to localStorage:", err);
    }
  }

  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  public getQueue(): QueuedMutation[] {
    return [...this.queue];
  }

  private notify(): void {
    const count = this.getPendingCount();
    this.listeners.forEach((fn) => fn(count));
  }

  public subscribe(fn: (pendingCount: number) => void): () => void {
    this.listeners.push(fn);
    fn(this.getPendingCount());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public getPendingCount(): number {
    return this.queue.filter((q) => q.status === "pending" || q.status === "failed").length;
  }

  public isOnline(): boolean {
    if (this.simulatedOnline !== null) {
      return this.simulatedOnline;
    }
    if (typeof navigator !== "undefined" && "onLine" in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Enqueues a failed or offline mutation with a stable UUID for guaranteed future replay.
   */
  public enqueue(type: QueuedMutation["type"], payload: Record<string, unknown>): QueuedMutation {
    const mutationId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const item: QueuedMutation = {
      id: mutationId,
      mutation_id: mutationId,
      type,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: "pending",
    };

    this.queue.push(item);
    this.saveQueue();
    console.log(`📥 Enqueued offline mutation [${type}] id=${mutationId}:`, payload);
    return item;
  }

  /**
   * Replays pending mutations sequentially against registered remote Supabase executors.
   */
  public async replayPendingMutations(
    customHandler?: (mutation: QueuedMutation) => Promise<boolean>
  ): Promise<{ replayed: number; failed: number }> {
    if (this.isReplaying || this.queue.length === 0) return { replayed: 0, failed: 0 };
    if (!this.isOnline()) {
      console.log("Offline — replay deferred until network reconnection.");
      return { replayed: 0, failed: 0 };
    }

    this.isReplaying = true;
    let replayed = 0;
    let failed = 0;

    const remaining: QueuedMutation[] = [];

    for (const item of this.queue) {
      if (item.status === "pending" || item.status === "failed") {
        item.status = "replaying";
        item.retryCount += 1;

        try {
          let success = false;
          if (customHandler) {
            success = await customHandler(item);
          } else {
            const executor = this.executors.get(item.type);
            if (executor) {
              success = await executor(item);
            } else {
              throw new Error(`No mutation executor registered for type [${item.type}]`);
            }
          }

          if (success) {
            replayed += 1;
            console.log(`✅ Successfully replayed mutation [${item.type}] id=${item.id}`);
          } else {
            item.status = "failed";
            item.lastError = "Executor returned false without throwing";
            remaining.push(item);
            failed += 1;
          }
        } catch (err: any) {
          item.status = "failed";
          item.lastError = err?.message || String(err);
          remaining.push(item);
          failed += 1;
          console.warn(`❌ Replay error for mutation [${item.type}] id=${item.id}:`, err);
        }
      } else {
        remaining.push(item);
      }
    }

    this.queue = remaining;
    this.saveQueue();
    this.isReplaying = false;

    return { replayed, failed };
  }
}

export const offlineSyncService = new OfflineSyncService();
