/**
 * fileDialogService.ts — Native & web file selection service for engineering documents.
 *
 * Implements real file selection supporting PDF, DWG, DXF, BIM, TIFF, and Excel files.
 * Provides a unified DocumentSource -> Uint8Array boundary decoupling the downstream
 * document perception pipeline from filesystem / browser storage mechanics.
 */

import { invoke } from "@tauri-apps/api/core";
import { open as tauriOpenDialog } from "@tauri-apps/plugin-dialog";
import type { DocumentFormat } from "../data/types";
import { generateId } from "./idService";

export type DocumentSource =
  | { type: "browser_file"; file: File; filename: string }
  | { type: "staged_doc"; projectId: string; documentId: string; filename: string }
  | { type: "bytes"; data: Uint8Array | ArrayBuffer; filename: string };

export interface SelectedFileMetadata {
  id?: string;
  filename: string;
  format: DocumentFormat;
  size_mb: number;
  uploaded_by: string;
  file_path?: string;
  storage_reference?: string;
  source: DocumentSource;
}

export interface FileSelectionResult {
  validFiles: SelectedFileMetadata[];
  rejectedFiles: Array<{ filename: string; reason: string }>;
}

interface TauriDocumentStagingResponse {
  document_id: string;
  filename: string;
  original_path: string;
  staged_path: string;
  local_reference: string;
  size_bytes: number;
  size_mb: number;
  format: string;
  is_supported: boolean;
}

const SUPPORTED_EXTENSIONS: Record<string, DocumentFormat> = {
  pdf: "PDF",
  dwg: "DWG",
  dxf: "DXF",
  bim: "BIM",
  rvt: "BIM",
  ifc: "BIM",
  tiff: "TIFF",
  tif: "TIFF",
  xlsx: "Excel",
  xls: "Excel",
  csv: "Excel",
};

const ACCEPTED_FILE_EXTENSIONS_STRING = Object.keys(SUPPORTED_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(",");

export function determineFormat(filename: string): DocumentFormat | null {
  const parts = filename.split(".");
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1].toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] || null;
}

/**
 * Determines whether the app is running in a desktop Tauri runtime environment.
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export function parseFileMetadata(file: File & { path?: string }): {
  valid: boolean;
  metadata?: SelectedFileMetadata;
  reason?: string;
} {
  const format = determineFormat(file.name);
  if (!format) {
    return {
      valid: false,
      reason: `Unsupported file format. Supported formats: PDF, DWG, DXF, BIM, TIFF, Excel.`,
    };
  }

  // Check max file size (500 MB per DOCUMENT_UPLOAD.md)
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > 500) {
    return {
      valid: false,
      reason: `File size (${sizeMb.toFixed(1)} MB) exceeds the maximum limit of 500 MB.`,
    };
  }

  const nativePath = typeof file.path === "string" && file.path.length > 0 ? file.path : undefined;

  return {
    valid: true,
    metadata: {
      id: generateId("d"),
      filename: file.name,
      format,
      size_mb: Number(sizeMb.toFixed(2)),
      uploaded_by: "Project User",
      file_path: nativePath,
      storage_reference: nativePath ? `projects/local/documents/${file.name}` : undefined,
      source: {
        type: "browser_file",
        file,
        filename: file.name,
      },
    },
  };
}

export class FileDialogService {
  /**
   * Resolves a DocumentSource into a raw Uint8Array.
   */
  public async readDocumentBytes(source: DocumentSource): Promise<Uint8Array> {
    if (source.type === "bytes") {
      return source.data instanceof Uint8Array ? source.data : new Uint8Array(source.data);
    }

    if (source.type === "browser_file") {
      const buffer = await source.file.arrayBuffer();
      return new Uint8Array(buffer);
    }

    if (source.type === "staged_doc") {
      if (isTauriEnvironment()) {
        const raw = await invoke<number[]>("read_project_document_bytes", {
          projectId: source.projectId,
          documentId: source.documentId,
        });
        return new Uint8Array(raw);
      }
      throw new Error(`Cannot read staged document [${source.documentId}] outside native Tauri desktop runtime`);
    }

    throw new Error("Unsupported DocumentSource type");
  }

  /**
   * Opens native OS dialog in Tauri, or standard HTML file picker in browser fallback.
   */
  public async selectFiles(options?: {
    projectId?: string;
    multiple?: boolean;
  }): Promise<FileSelectionResult> {
    const projectId = options?.projectId || "p1";

    if (isTauriEnvironment()) {
      try {
        return await this.selectFilesViaTauriDialog(projectId, options?.multiple !== false);
      } catch (err) {
        console.warn("Tauri native dialog failed, falling back to web file input:", err);
      }
    }

    return this.selectFilesViaBrowserInput(options?.multiple !== false);
  }

  /**
   * Native desktop Tauri file dialog flow using @tauri-apps/plugin-dialog and local staging.
   */
  private async selectFilesViaTauriDialog(
    projectId: string,
    multiple: boolean
  ): Promise<FileSelectionResult> {
    const selected = await tauriOpenDialog({
      multiple,
      directory: false,
      title: "Select Drawing Packages & Engineering Documents",
      filters: [
        {
          name: "All Supported Documents",
          extensions: ["pdf", "dwg", "dxf", "bim", "rvt", "ifc", "tiff", "tif", "xlsx", "xls", "csv"],
        },
        {
          name: "Drawing Packages (PDF, DWG, DXF)",
          extensions: ["pdf", "dwg", "dxf"],
        },
        {
          name: "BIM & CAD Models (BIM, RVT, IFC)",
          extensions: ["bim", "rvt", "ifc"],
        },
        {
          name: "Schedules & Spreadsheets (XLSX, CSV)",
          extensions: ["xlsx", "xls", "csv"],
        },
      ],
    });

    if (!selected) {
      return { validFiles: [], rejectedFiles: [] };
    }

    const paths = Array.isArray(selected) ? selected : [selected];
    const validFiles: SelectedFileMetadata[] = [];
    const rejectedFiles: Array<{ filename: string; reason: string }> = [];

    for (const filePath of paths) {
      if (typeof filePath !== "string") continue;

      try {
        const docId = generateId("d");
        const info = await invoke<TauriDocumentStagingResponse>("stage_project_document", {
          projectId,
          documentId: docId,
          sourcePath: filePath,
        });

        validFiles.push({
          id: info.document_id,
          filename: info.filename,
          format: info.format as DocumentFormat,
          size_mb: info.size_mb,
          uploaded_by: "Project User",
          file_path: info.staged_path,
          storage_reference: info.local_reference,
          source: {
            type: "staged_doc",
            projectId,
            documentId: info.document_id,
            filename: info.filename,
          },
        });
      } catch (err) {
        const filename = filePath.split(/[/\\]/).pop() || filePath;
        rejectedFiles.push({
          filename,
          reason: typeof err === "string" ? err : "Failed to stage selected document",
        });
      }
    }

    return { validFiles, rejectedFiles };
  }

  /**
   * Browser file input fallback for non-Tauri preview environments.
   */
  private async selectFilesViaBrowserInput(multiple: boolean): Promise<FileSelectionResult> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = multiple;
      input.accept = ACCEPTED_FILE_EXTENSIONS_STRING;
      input.style.display = "none";

      let settled = false;

      const handleFiles = (files: FileList | null) => {
        if (settled) return;
        settled = true;
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }

        if (!files || files.length === 0) {
          resolve({ validFiles: [], rejectedFiles: [] });
          return;
        }

        const validFiles: SelectedFileMetadata[] = [];
        const rejectedFiles: Array<{ filename: string; reason: string }> = [];

        Array.from(files).forEach((file) => {
          const result = parseFileMetadata(file);
          if (result.valid && result.metadata) {
            validFiles.push(result.metadata);
          } else {
            rejectedFiles.push({
              filename: file.name,
              reason: result.reason || "Invalid file",
            });
          }
        });

        resolve({ validFiles, rejectedFiles });
      };

      input.addEventListener("change", () => {
        handleFiles(input.files);
      });

      input.addEventListener("cancel", () => {
        handleFiles(null);
      });

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Processes files dropped onto an upload dropzone.
   */
  public processDroppedFiles(files: FileList | File[]): FileSelectionResult {
    const validFiles: SelectedFileMetadata[] = [];
    const rejectedFiles: Array<{ filename: string; reason: string }> = [];

    Array.from(files).forEach((file) => {
      const result = parseFileMetadata(file);
      if (result.valid && result.metadata) {
        validFiles.push(result.metadata);
      } else {
        rejectedFiles.push({
          filename: file.name,
          reason: result.reason || "Invalid file",
        });
      }
    });

    return { validFiles, rejectedFiles };
  }
}

export const fileDialogService = new FileDialogService();
