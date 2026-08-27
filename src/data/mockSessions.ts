/**
 * mockSessions.ts — Consolidated source of truth for AI engineering investigations.
 */

import type { ChatSession } from "./types";

export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "s1",
    project_id: "p1",
    project_name: "ABC Data Center",
    title: "Cable tray routing & clearance — Server Room B",
    last_message_preview: "Confirmed: 384 meters of 24-inch overhead ladder tray across 6 runs.",
    message_count: 4,
    created_by: "Hardik Bhaskar",
    created_at: "2 hours ago",
    updated_at: "2 hours ago",
    investigation_status: "verified",
    key_metric: "384 m · Verified",
    primary_sheet: "E-104",
    source_count: 4,
    messages: [
      {
        id: "m1",
        role: "user",
        content:
          "What is the total length of 24-inch overhead cable tray detected on Sheet E-104, and does the routing clear mechanical ductwork?",
        timestamp: "2h ago",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "I evaluated Sheet E-104 (Server Room B Cable Routing) against the spatial coordination model and mechanical duct inverts on Sheet M-201:\n\n- **Quantity Measured:** Total 24-inch overhead ladder tray across primary server rows is **384 meters** (6 parallel runs of 64m each).\n- **Elevation Clearance:** Electrical tray invert is **+11'-6\" AFF**. Mechanical coordination sheet M-201 indicates bottom of supply duct at **+12'-8\" AFF**.\n- **Result:** Clear vertical separation is **14 inches**, comfortably passing the 12-inch NEC/BICSI minimum threshold.",
        timestamp: "2h ago",
        metric_highlights: [
          { label: "24\" Overhead Ladder Tray", value: "384 m", status: "pass" },
          { label: "Clearance to Supply Duct", value: "14 in (Pass)", status: "pass" },
        ],
        referenced_sources: [
          { sheet: "E-104", desc: "Cable Tray Layout · CAD Layer: E-TRAY-OVHD", doc_id: "d4" },
          { sheet: "M-201", desc: "Mechanical Supply Duct Invert Elevation", doc_id: "d2" },
        ],
        tool_steps: [
          {
            id: "ts-1",
            name: "read_project_files",
            label: "Loaded project context: ABC Data Center (p1)",
            status: "complete",
            output: "Identified 4 drawings, active takeoff revision 2.4",
          },
          {
            id: "ts-2",
            name: "inspect_drawing",
            label: "Inspected Sheet E-104 (Server Room B — Power & Cable Tray)",
            status: "complete",
            output: "Vector CAD layer 'E-TRAY-OVHD' isolated; 6 runs detected",
          },
          {
            id: "ts-3",
            name: "measure_geometry",
            label: "Measured linear length across Column Lines B1–B8",
            status: "complete",
            output: "6 segments @ 64.0m = 384.0m total",
          },
          {
            id: "ts-4",
            name: "check_clearance",
            label: "Cross-referenced mechanical duct invert on Sheet M-201",
            status: "complete",
            output: "Duct bottom: +12'-8\" AFF | Tray invert: +11'-6\" AFF | Delta: +14.0 in (Pass)",
          },
        ],
        evidence: {
          doc_id: "d4",
          doc_name: "E-104_CableTrayLayout.dwg",
          sheet: "E-104 (Server Room B)",
          sheet_id: "sh-104",
          region: "Row A1–A12 Overhead Corridor",
          coordinates: "X:120 Y:310 [620×28]",
          thumbnail_type: "tray",
          specs: [
            { label: "Profile", value: "24\" Al Ladder" },
            { label: "Rung Spacing", value: "9 in OC" },
            { label: "Length", value: "384.0 m" },
            { label: "Elevation", value: "+11'-6\" AFF" },
          ],
        },
        action_proposal: {
          id: "act-101",
          title: "Commit Cable Tray to Verified Takeoff",
          description: "Update verified quantity for 24-inch ladder tray in project Takeoff ledger",
          item_code: "CT-LAD-24",
          item_name: "24-inch Aluminum Ladder Tray",
          category: "Cable Tray",
          quantity: 384,
          unit: "m",
          status: "approved",
          committed_at: "2 hours ago",
          committed_by: "Hardik Bhaskar",
        },
      },
      {
        id: "m3",
        role: "user",
        content:
          "Can you confirm the maximum allowable cable weight capacity for this NEMA 12B tray profile?",
        timestamp: "1h ago",
      },
      {
        id: "m4",
        role: "assistant",
        content:
          "Under NEMA VE 1 / CSA C22.2 No. 126.1 standards for **NEMA Class 12B** aluminum ladder tray on an **8-foot support span**:\n\n- **Working Load Capacity:** 75 lbs/linear foot (111.6 kg/m)\n- **Recommended Fill Ratio:** 40% maximum per NEC 392.22 for control/power cables\n- **Current Design Load:** Estimated cable bundle weight is **38.4 lbs/ft** (51.2% of rated capacity — compliant with safety margin).",
        timestamp: "1h ago",
        metric_highlights: [
          { label: "Rated Load Capacity", value: "75 lbs/ft (Span: 8ft)", status: "pass" },
          { label: "Current Design Load", value: "38.4 lbs/ft (51.2%)", status: "pass" },
        ],
        referenced_sources: [
          { sheet: "NEMA VE 1", desc: "Table 1 Class 12B Load Ratings" },
          { sheet: "NEC 392.22", desc: "Cable Tray Fill Limits (40% max)" },
        ],
        tool_steps: [
          {
            id: "ts-5",
            name: "query_standard",
            label: "Queried NEMA VE 1 Table 1 for Class 12B load curves",
            status: "complete",
            output: "Max load at 8.0 ft trapeze spacing: 75 lbs/ft",
          },
          {
            id: "ts-6",
            name: "calculate_load",
            label: "Calculated structural safety factor",
            status: "complete",
            output: "Design load: 38.4 lbs/ft | Safety factor: 1.95x",
          },
        ],
      },
    ],
  },
  {
    id: "s2",
    project_id: "p1",
    project_name: "ABC Data Center",
    title: "Feeder sizing & PAC-01 to PAC-06 disconnect audit",
    last_message_preview: "Calculated 4/0 AWG Cu minimum; 1.14% voltage drop over 145ft.",
    message_count: 2,
    created_by: "Rina Mehta",
    created_at: "12 hours ago",
    updated_at: "12 hours ago",
    investigation_status: "calculated",
    key_metric: "1.14% VD · Calculated",
    primary_sheet: "E-001",
    source_count: 2,
    messages: [
      {
        id: "m2-1",
        role: "user",
        content:
          "Calculate the required feeder size for PAC units 1 through 6 given a 180A FLA at 480V/3ph with 145ft one-way run length.",
        timestamp: "12h ago",
      },
      {
        id: "m2-2",
        role: "assistant",
        content:
          "Feeder calculation summary per **NEC Article 430 / Table 310.16**:\n\n- **Minimum Circuit Ampacity (MCA):** `180A × 1.25 = 225A`\n- **Conductor Selection:** **4/0 AWG THHN Copper** (rated 230A @ 75°C terminal rating)\n- **Conduit Sizing:** 2.0-inch EMT minimum per NEC Chapter 9 Table 1 (40% fill)\n- **Voltage Drop:** At 180A load, 480V 3-phase, 145 ft one-way: **1.14% drop** (5.47V), well below the 3.0% NEC recommendation.",
        timestamp: "12h ago",
        metric_highlights: [
          { label: "Conductor Size", value: "4/0 AWG THHN Cu", status: "pass" },
          { label: "Voltage Drop (145ft)", value: "1.14% (5.47V Pass)", status: "pass" },
        ],
        referenced_sources: [
          { sheet: "E-001", desc: "Single Line Diagram (Switchboard SB-1)", doc_id: "d1" },
          { sheet: "NEC Table 310.16", desc: "Conductor Ampacities @ 75°C" },
        ],
        tool_steps: [
          {
            id: "ts-7",
            name: "inspect_drawing",
            label: "Inspected Single Line Diagram Sheet E-001",
            status: "complete",
            output: "Identified PAC-01 through PAC-06 feeder breakers at Switchboard SB-1",
          },
          {
            id: "ts-8",
            name: "calculate_feeder",
            label: "Calculated ampacity with continuous duty multiplier (1.25x)",
            status: "complete",
            output: "MCA = 225A -> Selected 4/0 AWG THHN Cu (230A rating)",
          },
          {
            id: "ts-9",
            name: "calculate_voltage_drop",
            label: "Computed AC voltage drop over 145ft steel conduit run",
            status: "complete",
            output: "VD = 5.47V (1.14%) [Pass]",
          },
        ],
        evidence: {
          doc_id: "d1",
          doc_name: "E-001_SingleLineDiagram.dwg",
          sheet: "E-001 (Single Line Diagram)",
          sheet_id: "sh-001",
          region: "Distribution Board SB-1 Section C",
          coordinates: "X:440 Y:190 [280×140]",
          thumbnail_type: "switchgear",
          specs: [
            { label: "Feeders", value: "6x 4/0 AWG Cu" },
            { label: "Conduit", value: "2\" EMT" },
            { label: "Length", value: "145 ft" },
            { label: "VD", value: "1.14%" },
          ],
        },
        action_proposal: {
          id: "act-102",
          title: "Add PAC Feeder Assembly to Takeoff",
          description: "Add 6x 4/0 AWG Cu Feeder Assemblies with 2\" EMT conduit to project takeoff",
          item_code: "FDR-PAC-40",
          item_name: "4/0 AWG PAC Feeder 145ft Run",
          category: "Power Distribution",
          quantity: 6,
          unit: "SET",
          status: "pending",
        },
      },
    ],
  },
  {
    id: "s3",
    project_id: null,
    project_name: null,
    title: "NEC 2026 ground-fault protection thresholds",
    last_message_preview: "Summary of NEC Article 230.95 requirements for 1000A+ services at 480V.",
    message_count: 2,
    created_by: "Hardik Bhaskar",
    created_at: "Yesterday",
    updated_at: "Yesterday",
    investigation_status: "review_required",
    key_metric: "Review Required · 1000A+",
    primary_sheet: "NEC 2026",
    source_count: 2,
    messages: [
      {
        id: "m3-1",
        role: "user",
        content: "What are the mandatory GFP ground-fault protection triggers under NEC Article 230.95?",
        timestamp: "1d ago",
      },
      {
        id: "m3-2",
        role: "assistant",
        content:
          "Per **NEC Article 230.95**, ground-fault protection of equipment (GFPE) is mandatory for service disconnects when:\n\n1. Solidly grounded wye electrical services of more than 150 volts to ground but not exceeding 1000 volts phase-to-phase (commonly 480Y/277V).\n2. The service disconnect rating is **1000 amperes or more**.\n3. The maximum setting of the ground-fault protection shall be **1200 amperes**, and maximum time delay shall be 1 second for ground faults of 3000 amperes or greater.",
        timestamp: "1d ago",
        metric_highlights: [
          { label: "GFPE Service Threshold", value: "≥ 1000A @ 480V", status: "warn" },
          { label: "Max GFP Trip Setting", value: "1200A (1.0s max)", status: "info" },
        ],
        referenced_sources: [
          { sheet: "NEC Art. 230.95", desc: "Ground-Fault Protection of Equipment" },
          { sheet: "NEC Art. 240.13", desc: "Feeder Disconnect GFP Requirements" },
        ],
        tool_steps: [
          {
            id: "ts-10",
            name: "query_standard",
            label: "Queried NEC Article 230.95 (GFPE Requirements)",
            status: "complete",
            output: "Extracted service disconnect threshold (1000A+) and trip delay limits",
          },
        ],
      },
    ],
  },
];
