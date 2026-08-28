/**
 * updateService.ts — Vectoris Desktop Software Update Boundary.
 *
 * Encapsulates Tauri 2 cryptographic updater interactions, real download progress
 * tracking, semantic versioning evaluation, and safe failure handling.
 *
 * Trust Model:
 * 1. Developer release signed with private key (TAURI_SIGNING_PRIVATE_KEY)
 * 2. Signed update artifact (.exe / .msi + .sig) published to GitHub Releases
 * 3. Workstation queries HTTPS static release endpoint (latest.json)
 * 4. Tauri verifies cryptographic signature against public key in tauri.conf.json
 * 5. Update is handed off to passive Windows installer
 *
 * NOTE ON RELEASE ENDPOINT:
 * The canonical release endpoint is configured in `src-tauri/tauri.conf.json` under
 * `plugins.updater.endpoints`.
 * Default seam: https://github.com/VectorisAI/Vectoris/releases/latest/download/latest.json
 */

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "update-available"
  | "downloading"
  | "downloaded"
  | "stay-put"
  | "check-failed"
  | "download-failed"
  | "install-failed";

export interface UpdateProgress {
  downloadedBytes: number;
  totalBytes: number | null;
  percentage: number | null;
  downloadedMb: string;
  totalMb: string | null;
}

export interface AvailableRelease {
  version: string;
  currentVersion: string;
  releaseDate?: string;
  releaseNotes?: string;
  isNewer: boolean;
}

export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  availableRelease: AvailableRelease | null;
  progress: UpdateProgress | null;
  lastCheckedAt: string | null;
  errorMessage: string | null;
  errorDetail: string | null;
  isDesktop: boolean;
  channel: "Stable";
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  release: AvailableRelease | null;
  isSupported: boolean;
  error?: string;
}

const LAST_CHECK_KEY = "vectoris.lastUpdateCheckTime";
export const UPDATE_ENDPOINT_DOCS = "https://github.com/VectorisAI/Vectoris/releases/latest/download/latest.json";

/**
 * Compare two Semantic Version strings according to SemVer 2.0 (major.minor.patch).
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^[vV]/, "").trim();
  const cleanV2 = v2.replace(/^[vV]/, "").trim();

  // Split version into core numbers and pre-release tag
  const [core1, pre1] = cleanV1.split("-");
  const [core2, pre2] = cleanV2.split("-");

  const parts1 = (core1 || "").split(".").map((n) => parseInt(n, 10) || 0);
  const parts2 = (core2 || "").split(".").map((n) => parseInt(n, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  // Pre-release versions have lower precedence than normal versions
  if (pre1 && !pre2) return -1;
  if (!pre1 && pre2) return 1;
  if (pre1 && pre2) {
    if (pre1 > pre2) return 1;
    if (pre1 < pre2) return -1;
  }

  return 0;
}

export class UpdateService {
  private state: UpdateState;
  private listeners = new Set<(state: UpdateState) => void>();
  private activeTauriUpdate: import("@tauri-apps/plugin-updater").Update | null = null;
  private isChecking = false;
  private isDownloading = false;

  constructor() {
    let storedLastCheck: string | null = null;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        storedLastCheck = window.localStorage.getItem(LAST_CHECK_KEY);
      }
    } catch {
      // Ignore local storage error
    }

    const isTauri =
      typeof window !== "undefined" &&
      Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

    this.state = {
      status: "idle",
      currentVersion: "0.2.3", // Initial package baseline, updated dynamically on launch
      availableRelease: null,
      progress: null,
      lastCheckedAt: storedLastCheck,
      errorMessage: null,
      errorDetail: null,
      isDesktop: isTauri,
      channel: "Stable",
    };

    // Auto-detect dynamic version from runtime if available
    this.refreshCurrentVersion();
  }

  /**
   * Subscribe to update state updates.
   */
  public subscribe(listener: (state: UpdateState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns current snapshot of the update state machine.
   */
  public getState(): UpdateState {
    return { ...this.state };
  }

  private emitState(partial: Partial<UpdateState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Dynamically fetch current version from runtime.
   */
  public async getCurrentVersion(): Promise<string> {
    if (this.state.isDesktop) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const status = await invoke<{ app_version: string }>("get_engine_status");
        if (status && status.app_version) {
          this.emitState({ currentVersion: status.app_version });
          return status.app_version;
        }
      } catch {
        // Fallback to existing state version
      }
    }
    return this.state.currentVersion;
  }

  private async refreshCurrentVersion() {
    await this.getCurrentVersion();
  }

  /**
   * Check for newer signed updates from the release endpoint.
   */
  public async checkForUpdate(options?: { isBackground?: boolean }): Promise<UpdateCheckResult> {
    if (this.isChecking) {
      return {
        hasUpdate: this.state.status === "update-available",
        release: this.state.availableRelease,
        isSupported: this.state.isDesktop,
      };
    }

    if (!this.state.isDesktop) {
      // Browser preview mode — honest unsupported response
      const timestamp = new Date().toISOString();
      this.saveLastCheck(timestamp);
      this.emitState({
        status: options?.isBackground ? "idle" : "up-to-date",
        lastCheckedAt: timestamp,
        errorMessage: null,
        errorDetail: null,
      });
      return {
        hasUpdate: false,
        release: null,
        isSupported: false,
      };
    }

    this.isChecking = true;
    if (!options?.isBackground) {
      this.emitState({
        status: "checking",
        errorMessage: null,
        errorDetail: null,
      });
    }

    try {
      const currentVer = await this.getCurrentVersion();
      const { check } = await import("@tauri-apps/plugin-updater");

      const update = await check({
        timeout: 15000,
      });

      const timestamp = new Date().toISOString();
      this.saveLastCheck(timestamp);

      if (update && update.available) {
        this.activeTauriUpdate = update;
        const isNewer = compareSemver(update.version, currentVer) > 0;

        const release: AvailableRelease = {
          version: update.version,
          currentVersion: currentVer,
          releaseDate: update.date,
          releaseNotes: update.body || undefined,
          isNewer,
        };

        if (isNewer) {
          this.emitState({
            status: "update-available",
            availableRelease: release,
            lastCheckedAt: timestamp,
            errorMessage: null,
            errorDetail: null,
          });
          return { hasUpdate: true, release, isSupported: true };
        } else {
          // Version is equal or older
          this.activeTauriUpdate = null;
          this.emitState({
            status: "up-to-date",
            availableRelease: null,
            lastCheckedAt: timestamp,
            errorMessage: null,
            errorDetail: null,
          });
          return { hasUpdate: false, release: null, isSupported: true };
        }
      } else {
        this.activeTauriUpdate = null;
        this.emitState({
          status: "up-to-date",
          availableRelease: null,
          lastCheckedAt: timestamp,
          errorMessage: null,
          errorDetail: null,
        });
        return { hasUpdate: false, release: null, isSupported: true };
      }
    } catch (err: unknown) {
      this.activeTauriUpdate = null;
      const errorString = err instanceof Error ? err.message : String(err);
      console.warn("Vectoris update check error:", errorString);

      // In background check mode, fail silently without disturbing the user
      if (options?.isBackground) {
        return {
          hasUpdate: false,
          release: null,
          isSupported: true,
          error: errorString,
        };
      }

      this.emitState({
        status: "check-failed",
        errorMessage: "Couldn't check for updates. Your current version is still safe.",
        errorDetail: errorString,
      });

      return {
        hasUpdate: false,
        release: null,
        isSupported: true,
        error: errorString,
      };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Downloads and installs the signed update with real event progress.
   * Transitions into the 'stay-put' state right before the passive installer handoff.
   */
  public async downloadAndInstallUpdate(): Promise<void> {
    if (this.isDownloading) return;

    if (!this.state.isDesktop || !this.activeTauriUpdate) {
      // If no active update object, re-run check first
      const checkResult = await this.checkForUpdate();
      if (!checkResult.hasUpdate || !this.activeTauriUpdate) {
        this.emitState({
          status: "check-failed",
          errorMessage: "No valid verified update payload available for download.",
          errorDetail: "Missing active update metadata.",
        });
        return;
      }
    }

    this.isDownloading = true;
    let totalBytes: number | null = null;
    let downloadedBytes = 0;

    this.emitState({
      status: "downloading",
      progress: {
        downloadedBytes: 0,
        totalBytes: null,
        percentage: null,
        downloadedMb: "0.0",
        totalMb: null,
      },
      errorMessage: null,
      errorDetail: null,
    });

    try {
      const update = this.activeTauriUpdate;

      // Real event-driven progress listener
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? null;
          downloadedBytes = 0;
          const totalMb = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(1) : null;
          this.emitState({
            progress: {
              downloadedBytes: 0,
              totalBytes,
              percentage: totalBytes ? 0 : null,
              downloadedMb: "0.0",
              totalMb,
            },
          });
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const percentage = totalBytes ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : null;
          const downloadedMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
          const totalMb = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(1) : null;

          this.emitState({
            progress: {
              downloadedBytes,
              totalBytes,
              percentage,
              downloadedMb,
              totalMb,
            },
          });
        } else if (event.event === "Finished") {
          // Download and signature verification completed
          this.emitState({
            status: "stay-put",
            progress: {
              downloadedBytes,
              totalBytes: totalBytes ?? downloadedBytes,
              percentage: 100,
              downloadedMb: (downloadedBytes / (1024 * 1024)).toFixed(1),
              totalMb: (downloadedBytes / (1024 * 1024)).toFixed(1),
            },
          });
        }
      });

      // The installer handoff takes over here on Windows.
      // In case the installer is running passively or requires a restart:
      this.emitState({
        status: "stay-put",
      });
    } catch (err: unknown) {
      const errorString = err instanceof Error ? err.message : String(err);
      console.error("Vectoris update download/install failed:", errorString);

      this.emitState({
        status: "download-failed",
        errorMessage: "The update could not be downloaded. Your current Vectoris installation has not been changed.",
        errorDetail: errorString,
      });
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Dismiss an update error or available update notification and return to idle.
   */
  public dismiss(): void {
    if (this.isDownloading) return;
    this.emitState({
      status: "idle",
      errorMessage: null,
      errorDetail: null,
    });
  }

  private saveLastCheck(timestamp: string) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(LAST_CHECK_KEY, timestamp);
      }
    } catch {
      // Ignore storage errors
    }
  }
}

export const updateService = new UpdateService();
