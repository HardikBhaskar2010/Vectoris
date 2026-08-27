/**
 * mockProjects.ts — Consolidated development baseline for Vectoris projects.
 *
 * Source of Truth: Real historical engineering project datasets:
 *   1. VECTORIS DEVELOPMENT — GB 300 (Electrical Power & IT Infrastructure)
 *   2. VECTORIS DEVELOPMENT — EMERSON PAC (Precision Air Conditioning & Mechanical)
 */

import type { Project } from "./types";

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "VECTORIS DEVELOPMENT — GB 300",
    client: "Development Project · GB 300 Infrastructure",
    description:
      "High-density data center power distribution, 400kW IT UPS demand calculation, IEC 61439 LT switchgear panels, and feeder infrastructure.",
    sector: "data-center",
    discipline: "Electrical HV",
    inferred_type: "Data Center Infrastructure",
    user_provided_type: "Data Center Infrastructure",
    verified_type: "Data Center Infrastructure",
    displayType: "Data Center Infrastructure",
    typeProvenance: "verified",
    status: "verified",
    sheets: 2,
    sheetType: "XLSX",
    progress: 100,
    created_at: "2026-08-10",
    updated_at: "2026-08-27",
    member_count: 2,
    members: [
      { name: "Lead Estimator", initials: "LE", role: "Owner", avatarColor: "#2d4a6e" },
      { name: "Electrical PE", initials: "EE", role: "Editor", avatarColor: "#3d5a3e" },
    ],
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "VECTORIS DEVELOPMENT — EMERSON PAC",
    client: "Development Project · Emerson Climate",
    description:
      "Precision air conditioning infrastructure, dual hot gas & liquid refrigerant lines, 3C/4C cabling, and outdoor/indoor MS fabrication.",
    sector: "industrial",
    discipline: "MECH-HVAC",
    inferred_type: "Precision Air Conditioning",
    user_provided_type: "Precision Air Conditioning",
    verified_type: "Precision Air Conditioning",
    displayType: "Precision Air Conditioning",
    typeProvenance: "verified",
    status: "review",
    sheets: 2,
    sheetType: "PDF",
    progress: 85,
    created_at: "2026-08-15",
    updated_at: "2026-08-27",
    member_count: 2,
    members: [
      { name: "Lead Estimator", initials: "LE", role: "Owner", avatarColor: "#2d4a6e" },
      { name: "HVAC Engineer", initials: "HE", role: "Editor", avatarColor: "#4d3d5a" },
    ],
  },
];
