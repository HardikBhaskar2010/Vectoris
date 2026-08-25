/**
 * fileDialogService.ts — Native & web file selection service for engineering documents.
 *
 * Implements real file selection supporting PDF, DWG, DXF, BIM, TIFF, and Excel files.
 * Works seamlessly in both Tauri desktop mode (triggering the native OS file picker)
 * and web preview environments.
 */

import type { DocumentFormat } from "../data/types";

export interface SelectedFileMetadata {
  filename: string;
  format: DocumentFormat;
  size_mb: number;
  uploaded_by: string;
  file_path?: string;
  raw_file?: File;
}

export interface FileSelectionResult {
  validFiles: SelectedFileMetadata[];
  rejectedFiles: Array<{ filename: string; reason: string }>;
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

export function parseFileMetadata(file: File): {
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

  return {
    valid: true,
    metadata: {
      filename: file.name,
      format,
      size_mb: Number(sizeMb.toFixed(2)),
      uploaded_by: "Hardik Bhaskar",
      raw_file: file,
    },
  };
}

export class FileDialogService {
  /**
   * Opens the native / browser file picker dialog for selecting drawing packages and documents.
   */
  public async selectFiles(options?: { multiple?: boolean }): Promise<FileSelectionResult> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = options?.multiple !== false;
      input.accept = ACCEPTED_FILE_EXTENSIONS_STRING;
      input.style.display = "none";

      let settled = false;

      const handleFiles = (files: FileList | null) => {
        if (settled) return;
        settled = true;
        document.body.removeChild(input);

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
            // If user closed dialog without selecting
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
