/**
 * mockSessions.ts — Consolidated development baseline for AI engineering investigations.
 *
 * Source of Truth: Real historical engineering investigations:
 *   1. GB 300 IT Demand & Power Distribution Audit
 *   2. Emerson PAC Refrigerant Piping & Compressor Power Investigation
 */

import type { ChatSession } from "./types";

export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    project_id: "33333333-3333-3333-3333-333333333333",
    project_name: "VECTORIS DEVELOPMENT — GB 300",
    title: "GB 300 — IT UPS & Power Distribution Audit",
    last_message_preview: "Total IT UPS Demand: 359.6 kW · Proposed UPS: 400 kW · Sizing Load: 386.60 kW",
    message_count: 2,
    created_by: "Lead Estimator",
    created_at: "20 minutes ago",
    updated_at: "19 minutes ago",
    investigation_status: "verified",
    key_metric: "359.6 kW IT Demand · 400 kW UPS",
    primary_sheet: "Sheet1",
    source_count: 2,
    messages: [
      {
        id: "m-gb-1",
        role: "user",
        content: "What is the total IT UPS demand and proposed capacity calculated for the high-density racks in GB 300?",
        timestamp: "20m ago",
      },
      {
        id: "m-gb-2",
        role: "assistant",
        content:
          "### Engineering Investigation Analysis: GB 300 IT Load Demand\n\nBased on the verified calculations in **`BOQ for GB 300 -R1.xlsx`** (`Sheet1`):\n\n#### ⚡ IT Distribution Demand Breakdown\n- **High Density Racks:** 2 Units × 155 kW density = **310.0 kW**\n- **Network Racks:** 3 Units × 14 kW density = **42.0 kW**\n- **MCDU:** 1 Unit × 7 kW = **7.0 kW**\n- **Motorised Valves:** 2 Units × 0.3 kW = **0.6 kW**\n- **Total IT UPS Demand:** **359.6 kW**\n\n#### 🔋 Capacity & System Sizing\n- **Proposed UPS Capacity:** **400.0 kW** (Operating load factor: 89.9%)\n- **System Load with 3% UPS Losses:** 370.39 kW\n- **Battery Charging Load:** 16.21 kW\n- **Total Electrical Sizing Load:** **386.60 kW** (415V, 0.9 PF, 125% NEC overcurrent factor)\n\n> **Scope Boundary Note:** Earth pit and earth pit-to-data-hall earthing conductors are explicitly noted as in customer scope.",
        timestamp: "19m ago",
        metric_highlights: [
          { label: "IT UPS Demand", value: "359.6 kW", status: "pass" },
          { label: "Proposed UPS", value: "400.0 kW", status: "pass" },
          { label: "Total Electrical Load", value: "386.6 kW", status: "pass" },
        ],
        referenced_sources: [
          { sheet: "Sheet1", desc: "IT Distribution Schedule", doc_id: "d1111111-1111-1111-1111-111111111111" },
          { sheet: "Electrical", desc: "IEC 61439 Switchgear Specification", doc_id: "d1111111-1111-1111-1111-111111111111" },
        ],
        tool_steps: [
          {
            id: "ts-1",
            name: "read_project_files",
            label: "Loaded project context: VECTORIS DEVELOPMENT — GB 300",
            status: "complete",
            output: "Identified BOQ for GB 300 -R1.xlsx and Single Line Diagram",
          },
          {
            id: "ts-2",
            name: "inspect_drawing_region",
            label: "Inspected Sheet1 (IT Distribution & UPS Demand Schedule)",
            status: "complete",
            output: "High density racks (2x155kW) + Network racks (3x14kW) + MCDU (7kW) + Valves (0.6kW) = 359.6 kW",
          },
        ],
        evidence: {
          doc_id: "d1111111-1111-1111-1111-111111111111",
          doc_name: "BOQ for GB 300 -R1.xlsx",
          sheet: "Sheet1",
          sheet_id: "e1111111-1111-1111-1111-111111111111",
          region: "IT Distribution Schedule",
          thumbnail_type: "panel",
          specs: [
            { label: "Demand", value: "359.6 kW" },
            { label: "UPS Capacity", value: "400 kW" },
            { label: "Voltage", value: "415 V" },
            { label: "Overcurrent", value: "1.25 NEC" },
          ],
        },
      },
    ],
  },
  {
    id: "c2222222-2222-2222-2222-111111111111",
    project_id: "44444444-4444-4444-4444-444444444444",
    project_name: "VECTORIS DEVELOPMENT — EMERSON PAC",
    title: "Emerson PAC — Refrigerant & Hot Gas Piping Investigation",
    last_message_preview: "Hot gas line: 270 MTR · Liquid line: 270 MTR · Condenser cabling: 279 MTR",
    message_count: 2,
    created_by: "Lead Estimator",
    created_at: "15 minutes ago",
    updated_at: "14 minutes ago",
    investigation_status: "verified",
    key_metric: "270m Hot Gas · 270m Liquid",
    primary_sheet: "Page 1",
    source_count: 1,
    messages: [
      {
        id: "m-em-1",
        role: "user",
        content: "What are the specifications for the refrigerant piping and compressor cabling for the Emerson PAC units?",
        timestamp: "15m ago",
      },
      {
        id: "m-em-2",
        role: "assistant",
        content:
          "### Engineering Investigation Analysis: Emerson PAC Infrastructure\n\nBased on **`BOQ. Emerson Climate Technologies.pdf`**:\n\n#### ❄️ Refrigerant & Fluid Circuit\n- **Hot Gas Line:** 7/8\", 18G Copper Pipe — **270 MTR** (`EM-01A`)\n- **Liquid Line:** 5/8\", 18G Copper Pipe — **270 MTR** (`EM-01B`)\n- **Thermal Insulation:** Nitrile rubber insulation for hot gas & liquid lines — **270 MTR** (`EM-04`)\n- **Initial Refrigerant Charge:** R-410A Gas — **220 KGS** (`EM-08`)\n- **Extended Piping Kit:** 3 Sets with check valves, solenoid valves, and U-traps (`EM-09`)\n\n#### ⚡ Electrical & Control Interconnections\n- **Condenser Cabling:** 3C × 2.5 sq.mm Copper Cable (Indoor-to-Outdoor) — **279 MTR** (`EM-02`)\n- **Main Power Cabling:** 4C × 16 sq.mm Copper Cable — **22.5 MTR** (`EM-03`)\n- **Drainage:** 40mm UPVC pipe with nitrile insulation (**26 MTR**) + 6x condensate drain pumps.",
        timestamp: "14m ago",
        metric_highlights: [
          { label: "Hot Gas Line", value: "270 MTR", status: "pass" },
          { label: "Liquid Line", value: "270 MTR", status: "pass" },
          { label: "R-410A Refrigerant", value: "220 KGS", status: "pass" },
        ],
        referenced_sources: [
          { sheet: "Page 1", desc: "Piping & Cabling Schedule", doc_id: "d2222222-2222-2222-2222-111111111111" },
        ],
        tool_steps: [
          {
            id: "ts-3",
            name: "read_project_files",
            label: "Loaded project context: VECTORIS DEVELOPMENT — EMERSON PAC",
            status: "complete",
            output: "Identified BOQ. Emerson Climate Technologies.pdf and multi-discipline schedules",
          },
        ],
        evidence: {
          doc_id: "d2222222-2222-2222-2222-111111111111",
          doc_name: "BOQ. Emerson Climate Technologies.pdf",
          sheet: "Page 1",
          sheet_id: "e2222222-2222-2222-2222-111111111111",
          region: "Mechanical & Electrical Interconnect",
          thumbnail_type: "panel",
          specs: [
            { label: "Hot Gas Line", value: '7/8", 18G' },
            { label: "Liquid Line", value: '5/8", 18G' },
            { label: "Condenser Cable", value: "3C x 2.5 mm²" },
            { label: "Power Cable", value: "4C x 16 mm²" },
          ],
        },
      },
    ],
  },
];
