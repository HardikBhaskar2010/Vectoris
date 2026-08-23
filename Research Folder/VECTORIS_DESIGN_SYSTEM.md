# VECTORIS — Canonical Design System & Architecture Specification

> **Core Philosophy:**  
> *"AI proposes. The expert decides. The system remembers why."*  
> **Aesthetic Archetype:** *"Engineering-Grade Precision meets Apple-Level Product Polish (Liquid Glass)"*

---

## 1. Locked Design & Architectural Foundations

| Category | Locked Principle | Specification & Rationale |
|---|---|---|
| **Primary Workspace** | **Dark Theme (First-Class)** | Deep obsidian (`#131313`) base with Coffee Bean (`#1A0706`) and Black Cherry (`#55100D`) liquid glass surfaces. Optimizes contrast for CAD vector blueprint line rendering. |
| **Secondary Workspace** | **Light Theme (Full Parity)** | Alabaster Cream (`#F1ECE6`), Warm Greige (`#DDD5CD`), Vintage Rosewood (`#7D4047`), and Charcoal Espresso (`#2E2E2E`). Tactile architectural drafting paper feel. |
| **Accent & Emphasis** | **Racing Red (`#DD0200`)** | Reserved for interactive actions, active drawing layers, measurement dimension tags, live execution indicators, and primary CTAs. |
| **System State** | **Persistent Local Engine Indicator** | Header badge displays local runtime status (`Local Core Engine • Active / Ready`). |
| **AI Integration** | **Workflow-Embedded Copilot** | AI is contextual to the open sheet/drawing, displaying structured reasoning chains, tool steps, and direct model proposals rather than a detached conversational chatbot. |
| **Human-in-the-Loop** | **Explicit Expert Approval** | Consequential quantity changes and BOQ entries require explicit human confirmation. |
| **Traceability** | **Bidirectional Drawing Anchors** | Clicking any takeoff row immediately pans and focuses the CAD viewport to the exact drawing vector coordinates and highlights bounding boxes/dimension lines. |
| **Workspace Priority** | **Drawing-First, Not Chat-First** | The CAD blueprint viewer dominates the center of the screen (60–70% width); AI reasoning and takeoff tables flank the drawing as contextual inspection panels. |
| **Processing Engine** | **Transparent Pipeline Stages** | Multi-step progress (Ingest → Classify → Scale Calibration → Electrical Detection → Measurement → Takeoff Compilation) instead of opaque loading spinners. |
| **BOQ Verification** | **Structured Review Before Export** | Review table compares AI detected quantities vs human adjustments with confidence ratings before generating Excel/CSV/PDF outputs. |

---

## 2. Color Palette & Token System

### Dark Theme (Primary Engineering Canvas)
* **Base Surface:** `#131313` (Deep Obsidian)
* **Liquid Glass Layer 1:** `#1F1F1F` (40%–70% opacity, 20px blur, 1px subtle white border `rgba(255,255,255,0.08)`)
* **Warm Elevation (Coffee Bean):** `#1A0706`
* **Deep Interaction (Black Cherry):** `#55100D`
* **Action & Focus (Racing Red):** `#DD0200`
* **CAD Highlighting Neon Cyan:** `#00F2FE` (Lighting & Equipment Detections)
* **Status Neon Green:** `#10B981` (Verified / Calibrated)
* **Status Neon Amber:** `#F59E0B` (Needs Human Review)

### Light Theme (Drafting Paper Architecture)
* **Base Paper:** `#F1ECE6` (Alabaster Cream)
* **Surface Greige:** `#DDD5CD` / `#F8F5F2`
* **Brand Accent:** `#7D4047` (Vintage Rosewood)
* **Body Ink:** `#2E2E2E` (Charcoal Espresso)
* **Subtle Border:** `#D9D1C9`

### Typography Hierarchy
* **Display & Headings:** `Bricolage Grotesque` (700/800 bold, tight tracking)
* **Body & Interface:** `Hanken Grotesk` (400 regular, 500 medium, 600 semi-bold)
* **CAD Coordinates & Telemetry:** `JetBrains Mono` (tabular numbers, coordinates, measurements, scale ratios)

---

## 3. Product Copy & Data Realism Guidelines

> [!IMPORTANT]
> **Strict Engineering Groundedness Rule:**
> All UI text, telemetry badges, and data columns must reflect realistic engineering and takeoff workflows. Exaggerated marketing claims are strictly forbidden in product interfaces.

* ❌ **Do NOT use:** *"99.4% precision rate"*, *"$1.84M Takeoff Valuation"*, *"zero cloud leaks"*, *"localized CAD vision models"*.
* ✅ **DO use:** *"Confidence: High (Verified)"*, *"380 Line Items"*, *"Scale: 1:100 Metric"*, *"Local processing mode"*, *"Rule-based & vision verified"*, *"NEC 210.19 Verified"*.

---

## 4. Screen Catalog & Workspace Reference

| Screen Name | HTML File | PNG Screenshot |
|---|---|---|
| **01. Dark Dashboard** | [`01_Dashboard_Dark_Theme.html`](./designs/stitch/01_Dashboard_Dark_Theme.html) | [`01_Dashboard_Dark_Theme.png`](./designs/stitch/01_Dashboard_Dark_Theme.png) |
| **02. Light Dashboard** | [`02_Dashboard_Light_Theme.html`](./designs/stitch/02_Dashboard_Light_Theme.html) | [`02_Dashboard_Light_Theme.png`](./designs/stitch/02_Dashboard_Light_Theme.png) |
| **03. Authentication** | [`03_Authentication_SignUp.html`](./designs/stitch/03_Authentication_SignUp.html) | [`03_Authentication_SignUp.png`](./designs/stitch/03_Authentication_SignUp.png) |
| **04. Drawing + AI Agent + Takeoff** | [`04_Drawing_Takeoff_Workspace.html`](./designs/stitch/04_Drawing_Takeoff_Workspace.html) | [`04_Drawing_Takeoff_Workspace.png`](./designs/stitch/04_Drawing_Takeoff_Workspace.png) |
| **05. Processing Pipeline** | [`05_Document_Processing_Pipeline.html`](./designs/stitch/05_Document_Processing_Pipeline.html) | [`05_Document_Processing_Pipeline.png`](./designs/stitch/05_Document_Processing_Pipeline.html) |
| **06. AI Session Copilot** | [`06_AI_Session_Agent_Chat.html`](./designs/stitch/06_AI_Session_Agent_Chat.html) | [`06_AI_Session_Agent_Chat.png`](./designs/stitch/06_AI_Session_Agent_Chat.png) |
| **07. Projects Library** | [`07_Projects_Library_Create_Modal.html`](./designs/stitch/07_Projects_Library_Create_Modal.html) | [`07_Projects_Library_Create_Modal.png`](./designs/stitch/07_Projects_Library_Create_Modal.png) |
| **08. Takeoff Review & Export** | [`08_Takeoff_Review_BOQ_Export.html`](./designs/stitch/08_Takeoff_Review_BOQ_Export.html) | [`08_Takeoff_Review_BOQ_Export.png`](./designs/stitch/08_Takeoff_Review_BOQ_Export.png) |
| **09. Product Entry** | [`09_Landing_Product_Entry.html`](./designs/stitch/09_Landing_Product_Entry.html) | [`09_Landing_Product_Entry.png`](./designs/stitch/09_Landing_Product_Entry.png) |
