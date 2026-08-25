/**
 * mockEngine.ts — Engine status and workstation configuration data.
 */

import type { EngineStatusInfo } from "./types";

export const INITIAL_ENGINE_STATUS: EngineStatusInfo = {
  status: "ready",
  mode: "local_first",
  storage_path: "~/.vectoris/workspaces/apex-eng",
  active_jobs: 0,
  sheets_indexed: 436,
  version: "0.2.1-local",
};
