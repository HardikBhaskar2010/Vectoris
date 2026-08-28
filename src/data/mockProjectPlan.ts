/**
 * mockProjectPlan.ts — Grounded synthetic fixtures for Project Plan development and fallback.
 */

import type { ProjectPlan, PlanClaim, Decision } from "./types";

export const INITIAL_PLAN_CLAIMS_P1: PlanClaim[] = [
  // 1. Scope & outcomes
  {
    id: "claim-101",
    claim_id: "cid-101",
    plan_version_id: "ppv-1",
    section: "scope_outcomes",
    content: "Deliver complete primary electrical distribution infrastructure for 4 Data Halls (Halls A-D) with N+1 redundancy.",
    grounding: "known_from_evidence",
    evidence_links: [
      {
        document_id: "doc-pkg",
        document_name: "ABC Data Center - Electrical Drawings.pdf",
        sheet_id: "E-001",
        note: "Single Line Diagram Sheet E-001 General Scope Statement",
      },
    ],
    created_at: "2026-08-27T10:00:00Z",
  },
  {
    id: "claim-102",
    claim_id: "cid-102",
    plan_version_id: "ppv-1",
    section: "scope_outcomes",
    content: "Provide 480V/277V secondary stepped-down power to server rack Power Distribution Units (PDUs) via overhead busway runs.",
    grounding: "inferred",
    inference_rationale: "Derived from floor plan feeder layouts showing 480V panelboards feeding overhead busway drops.",
    evidence_links: [
      {
        document_id: "doc-pkg",
        document_name: "ABC Data Center - Electrical Drawings.pdf",
        sheet_id: "E-104",
        note: "Floor Plan Sheet E-104 Grid B2-D4",
      },
    ],
    created_at: "2026-08-27T10:00:00Z",
  },
  {
    id: "claim-103",
    claim_id: "cid-103",
    plan_version_id: "ppv-1",
    section: "scope_outcomes",
    content: "Emergency backup generation capacity locked at 2.5 MVA per data hall based on founder client agreement.",
    grounding: "human_decided",
    evidence_links: [],
    created_at: "2026-08-27T10:00:00Z",
  },

  // 2. Milestones
  {
    id: "claim-201",
    claim_id: "cid-201",
    plan_version_id: "ppv-1",
    section: "milestones",
    content: "Milestone 1: Primary Medium Voltage Substation Energization and Switchgear Commissioning.",
    grounding: "known_from_evidence",
    evidence_links: [
      {
        document_id: "doc-pkg",
        document_name: "ABC Data Center - Electrical Drawings.pdf",
        sheet_id: "E-002",
        note: "Construction Phasing Schedule Sheet E-002",
      },
    ],
    created_at: "2026-08-27T10:00:00Z",
  },
  {
    id: "claim-202",
    claim_id: "cid-202",
    plan_version_id: "ppv-1",
    section: "milestones",
    content: "Milestone 2: Overhead Cable Tray and Busway Rough-in across Data Halls A & B.",
    grounding: "known_from_evidence",
    evidence_links: [
      {
        document_id: "doc-pkg",
        document_name: "ABC Data Center - Electrical Drawings.pdf",
        sheet_id: "E-104",
        note: "Sheet E-104 Cable Tray Routing Plan",
      },
    ],
    created_at: "2026-08-27T10:00:00Z",
  },
  {
    id: "claim-203",
    claim_id: "cid-203",
    plan_version_id: "ppv-1",
    section: "milestones",
    content: "Milestone 3: Integrated Systems Testing (IST) under 100% full thermal load bank simulation.",
    grounding: "inferred",
    inference_rationale: "Standard tier-3 commissioning requirement extrapolated from specification Section 26 08 00.",
    evidence_links: [],
    created_at: "2026-08-27T10:00:00Z",
  },

  // 3. Risks
  {
    id: "claim-301",
    claim_id: "cid-301",
    plan_version_id: "ppv-1",
    section: "risks",
    content: "Long lead-time vulnerability: 2500kVA Cast Resin Transformers currently have 42-week manufacturing cycle.",
    grounding: "known_from_evidence",
    evidence_links: [
      {
        document_id: "doc-pkg",
        document_name: "ABC Data Center - Electrical Drawings.pdf",
        sheet_id: "E-001",
        note: "Equipment Schedule Note 4",
      },
    ],
    created_at: "2026-08-27T10:00:00Z",
  },
  {
    id: "claim-302",
    claim_id: "cid-302",
    plan_version_id: "ppv-1",
    section: "risks",
    content: "Spatial clash between 24-inch overhead cable trays and chilled water mechanical supply mains in Corridor C.",
    grounding: "inferred",
    inference_rationale: "Elevation callouts on Sheet E-104 conflict with MEP ceiling plenum clearance specifications.",
    evidence_links: [
      {
        document_id: "doc-pkg",
        document_name: "ABC Data Center - Electrical Drawings.pdf",
        sheet_id: "E-104",
        note: "Corridor C Elevation Detail",
      },
    ],
    created_at: "2026-08-27T10:00:00Z",
  },
  {
    id: "claim-303",
    claim_id: "cid-303",
    plan_version_id: "ppv-1",
    section: "risks",
    content: "Local utility interconnect substation capacity study remains pending formal approval from regional grid operator.",
    grounding: "unresolved",
    unresolved_reason: "Grid Interconnection Study document referenced in Project RFP is not yet uploaded to the project document repository.",
    evidence_links: [],
    created_at: "2026-08-27T10:00:00Z",
  },

  // 4. Dependencies
  {
    id: "claim-401",
    claim_id: "cid-401",
    plan_version_id: "ppv-1",
    section: "dependencies",
    content: "Structural concrete slab curing and equipment pad sign-off required prior to heavy transformer rigging.",
    grounding: "known_from_evidence",
    evidence_links: [
      {
        document_id: "doc-pkg",
        document_name: "ABC Data Center - Electrical Drawings.pdf",
        sheet_id: "E-001",
        note: "Structural Interlock Specification Note 12",
      },
    ],
    created_at: "2026-08-27T10:00:00Z",
  },
  {
    id: "claim-402",
    claim_id: "cid-402",
    plan_version_id: "ppv-1",
    section: "dependencies",
    content: "BMS / SCADA optical monitoring gateway integration depends on vendor protocol mapping specification.",
    grounding: "unresolved",
    unresolved_reason: "Control interface protocol schedule (Modbus/BACnet point list) missing from current electrical drawing set.",
    evidence_links: [],
    created_at: "2026-08-27T10:00:00Z",
  },
];

export const INITIAL_DECISIONS_P1: Decision[] = [
  {
    id: "dec-103",
    claim_id: "cid-103",
    project_id: "p1",
    decision_text: "Emergency backup generation capacity locked at 2.5 MVA per data hall based on founder client agreement.",
    rationale: "Approved in design review with lead electrical consultant on 2026-08-25.",
    decided_by: "Hardik Bhaskar",
    decided_at: "2026-08-25T14:30:00Z",
    is_active: true,
  },
];

export const INITIAL_PROJECT_PLANS: Record<string, ProjectPlan> = {
  p1: {
    id: "plan-p1",
    project_id: "p1",
    created_at: "2026-08-27T10:00:00Z",
    updated_at: "2026-08-27T10:00:00Z",
    active_version: {
      id: "ppv-1",
      plan_id: "plan-p1",
      version_number: 1,
      status: "active",
      created_by: "Hardik Bhaskar",
      created_at: "2026-08-27T10:00:00Z",
      activated_at: "2026-08-27T10:05:00Z",
      claims: INITIAL_PLAN_CLAIMS_P1,
    },
    draft_version: null,
    version_history: [
      {
        id: "ppv-1",
        plan_id: "plan-p1",
        version_number: 1,
        status: "active",
        created_by: "Hardik Bhaskar",
        created_at: "2026-08-27T10:00:00Z",
        activated_at: "2026-08-27T10:05:00Z",
        claims: INITIAL_PLAN_CLAIMS_P1,
      },
    ],
  },
};
