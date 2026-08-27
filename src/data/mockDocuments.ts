/**
 * mockDocuments.ts — Consolidated development baseline for documents.
 *
 * Source of Truth: Real historical engineering documents:
 *   - Research Folder/Sample BOQ/BOQ for GB 300 -R1.xlsx
 *   - Research Folder/Sample BOQ/GB 300 Electrical Single Line Diagram.pdf
 *   - Research Folder/Sample BOQ/BOQ. Emerson Climate Technologies.pdf
 *   - Research Folder/1862-V9-Final CS-Emerson Noida-24.08.2026.xlsx
 */

import type { ProjectDocument } from "./types";

export const INITIAL_DOCUMENTS: ProjectDocument[] = [
  // GB 300 Project Documents
  {
    id: "d1111111-1111-1111-1111-111111111111",
    project_id: "33333333-3333-3333-3333-333333333333",
    filename: "BOQ for GB 300 -R1.xlsx",
    format: "XLSX",
    size_mb: 0.46,
    upload_status: "complete",
    sheet_count: 2,
    uploaded_by: "Lead Estimator",
    uploaded_at: "1h ago",
  },
  {
    id: "d1111111-1111-1111-1111-222222222222",
    project_id: "33333333-3333-3333-3333-333333333333",
    filename: "GB 300 Electrical Single Line Diagram.pdf",
    format: "PDF",
    size_mb: 1.8,
    upload_status: "complete",
    sheet_count: 1,
    uploaded_by: "Lead Estimator",
    uploaded_at: "1h ago",
  },
  // Emerson PAC Project Documents
  {
    id: "d2222222-2222-2222-2222-111111111111",
    project_id: "44444444-4444-4444-4444-444444444444",
    filename: "BOQ. Emerson Climate Technologies.pdf",
    format: "PDF",
    size_mb: 0.13,
    upload_status: "complete",
    sheet_count: 1,
    uploaded_by: "Lead Estimator",
    uploaded_at: "45m ago",
  },
  {
    id: "d2222222-2222-2222-2222-222222222222",
    project_id: "44444444-4444-4444-4444-444444444444",
    filename: "1862-V9-Final CS-Emerson Noida-24.08.2026.xlsx",
    format: "XLSX",
    size_mb: 17.3,
    upload_status: "complete",
    sheet_count: 12,
    uploaded_by: "Lead Estimator",
    uploaded_at: "30m ago",
  },
];
