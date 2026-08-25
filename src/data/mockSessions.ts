/**
 * mockSessions.ts — Consolidated source of truth for AI chat sessions.
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
          "I evaluated **Sheet E-104 (Server Room B Cable Routing)** against the spatial coordination model:\n\n1. **Quantity Measured:** Total 24-inch overhead ladder tray across the primary rack rows is **384 meters** (6 parallel runs of 64m each).\n2. **Elevation Clearance:** Electrical invert elevation is **+11'-6\" AFF**. Mechanical coordination sheet M-201 indicates bottom of supply duct at **+12'-8\" AFF**.\n3. **Result:** Clear vertical separation is **14 inches**, satisfying the minimum 12-inch NEC/BICSI standard.",
        timestamp: "2h ago",
        thought_trace: [
          "Loaded Sheet E-104 vector CAD drawing layer 'E-TRAY-OVHD'",
          "Segmented 6 continuous polyline runs across Column Lines B1–B8",
          "Cross-referenced mechanical duct bottom elevation on M-201 (+12'-8\" AFF)",
          "Calculated vertical clearance: 14.0 in (Pass)",
        ],
        evidence: {
          doc_id: "d4",
          doc_name: "E-104_CableTrayLayout.dwg",
          sheet: "E-104 (Server Room B)",
          region: "Row A1–A12 Overhead Corridor",
          coordinates: "X:120 Y:310 [620×28]",
        },
        action_proposal: {
          id: "act-101",
          title: "Verify Cable Tray Takeoff Line Item",
          description: "Update verified quantity for 24-inch ladder tray in project Takeoff ledger",
          item_code: "CT-LAD-24",
          quantity: "384 m",
          status: "approved",
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
        thought_trace: [
          "Queried NEMA VE 1 Table 1 for Class 12B load curves",
          "Span parameter: 8.0 ft trapeze hanger spacing",
          "Calculated safety factor: 1.95x against allowable structural deflection",
        ],
      },
    ],
  },
  {
    id: "s2",
    project_id: "p1",
    project_name: "ABC Data Center",
    title: "Feeder sizing — PAC-01 to PAC-06",
    last_message_preview: "Calculated 4/0 AWG Cu minimum; 1.14% voltage drop over 145ft.",
    message_count: 2,
    created_by: "Rina Mehta",
    created_at: "12 hours ago",
    updated_at: "12 hours ago",
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
        thought_trace: [
          "Applied 125% continuous duty multiplier to 180A FLA",
          "Selected 75°C column of NEC Table 310.16",
          "Calculated AC impedance using standard steel conduit reactance values",
        ],
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
      },
    ],
  },
];
