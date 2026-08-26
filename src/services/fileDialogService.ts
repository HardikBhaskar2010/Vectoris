/**
 * fileDialogService.ts — Native & web file selection service for engineering documents.
 *
 * Implements real file selection supporting PDF, DWG, DXF, BIM, TIFF, and Excel files.
 * Works seamlessly in both Tauri desktop mode (triggering the native OS file picker and
 * capturing real OS paths) and web preview environments (graceful fallback).
 */

import { invoke } from "@tauri-apps/api/core";
import { open as tauriOpenDialog } from "@tauri-apps/plugin-dialog";
import type { DocumentFormat } from "../data/types";

export interface SelectedFileMetadata {
  filename: string;
  format: DocumentFormat;
  size_mb: number;
  uploaded_by: string;
  file_path?: string;
  storage_reference?: string;
  raw_file?: File;
}

export interface FileSelectionResult {
  validFiles: SelectedFileMetadata[];
  rejectedFiles: Array<{ filename: string; reason: string }>;
}

interface TauriDocumentMetadataResponse {
  filename: string;
  file_path: string;
  size_bytes: number;
  size_mb: number;
  format: string;
  is_supported: boolean;
  storage_reference: string;
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

  // If dropped in Tauri / desktop webview, file.path may contain the real OS path
  const nativePath = typeof file.path === "string" && file.path.length > 0 ? file.path : undefined;

  return {
    valid: true,
    metadata: {
      filename: file.name,
      format,
      size_mb: Number(sizeMb.toFixed(2)),
      uploaded_by: "Hardik Bhaskar",
      file_path: nativePath,
      storage_reference: nativePath ? `projects/local/documents/${file.name}` : undefined,
      raw_file: file,
    },
  };
}

export class FileDialogService {
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
   * Native desktop Tauri file dialog flow using @tauri-apps/plugin-dialog.
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
        const info = await invoke<TauriDocumentMetadataResponse>("inspect_document_file", {
          projectId,
          path: filePath,
        });

        validFiles.push({
          filename: info.filename,
          format: info.format as DocumentFormat,
          size_mb: info.size_mb,
          uploaded_by: "Hardik Bhaskar",
          file_path: info.file_path,
          storage_reference: info.storage_reference,
        });
      } catch (err) {
        const filename = filePath.split(/[/\\]/).pop() || filePath;
        rejectedFiles.push({
          filename,
          reason: typeof err === "string" ? err : "Failed to inspect selected document",
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

      // Cleanup on window focus if cancelled
      const handleFocus = () => {
        setTimeout(() => {
          if (!settled) {
            if (!input.files || input.files.length === 0) {
              handleFiles(null);
            }
          }
          window.removeEventListener("focus", handleFocus);
        }, 800);
      };

      window.addEventListener("focus", handleFocus);
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
