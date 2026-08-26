# Vectoris — AI-Native Project Management & Intelligence Workspace

AI-native Project Management and Project Intelligence workspace for electrical and MEP engineering. Unifies blueprint takeoff from CAD drawings, PDF schematics, and raster sets with on-device perception compute, project-level document intelligence, local storage isolation, and cryptographic release verification.

---

## Metadata & Classification

- Product: Vectoris Project Management & Intelligence Workspace
- Domain: Electrical & MEP Engineering, Blueprint Takeoff, Estimation & Bidding
- Runtime: Tauri v2 Core (Rust 2021 + WebView2)
- Frontend: React 19, TypeScript Strict, Vite 7
- Security: Local-First Isolation, Minisign Ed25519 Cryptographic Verification, Strict CSP
- Platforms: Windows 10/11 (x86_64)
- Distribution: Public Releases via `VectorisAI/Vectoris`

---

## Core Architecture & Workflow Hierarchy

Vectoris is fundamentally an **AI-native Project Management & Project Intelligence workspace** where estimating, takeoff, and bidding are major sequential workflows inside the Project container:

```text
                    VECTORIS
                       │
                 ┌──── PROJECT ────┐
                 │                 │
          PROJECT INTELLIGENCE     │
                 │                 │
     ┌───────────┼────────────┐    │
     ↓           ↓            ↓    ↓
  Drawings    Documents      AI   Collaboration
     │
     ↓
  Takeoff
     │
     ↓
    BOQ
     │
     ↓
 Engineering
     │
     ↓
 Estimation
     │
     ↓
 Commercial
     │
     ↓
    Bids
     │
     ↓
  Delivery
```

The current **Takeoff MVP** is the operational wedge built directly within this architecture:

```text
Project → Documents / Drawings → AI + Detection → Human Verification → Takeoff → Export
```

---

## Core Capabilities

- Project-Centric Workspace: Shared project evidence repository organizing drawings, documents, AI chat threads, and collaborative team roles.
- Local-First Blueprint Takeoff: On-device geometry extraction, symbol classification, and schedule parsing without silent cloud uploads.
- Tauri v2 Desktop Architecture: Native desktop shell with custom frameless window management, multi-threaded compute, and minimal memory overhead.
- Cryptographically Verified Updates: In-app software updates powered by Tauri 2 Updater and Ed25519 signing keys, featuring the dedicated "Stay Put" handoff experience.
- Liquid Theme System: 5-phase fluid Bézier wave compositor transitions between deep dark mode (black cherry/coffee bean) and light mode (alabaster cream/greige).
- Zero-Telemetry Security Posture: Strict Content Security Policy (CSP), minimal scoped capabilities, and zero data leakage.

---

## Technology Stack

| Layer | Technology | Specification |
|---|---|---|
| Desktop Shell | Tauri v2 | Rust 2021, `tauri-plugin-updater`, `tauri-plugin-process`, WebView2 |
| Frontend Framework | React 19 + Vite 7 | TypeScript Strict (`tsc`), ESM native |
| Motion & Animation | Motion 13 + Web Animations API | Compositor-driven liquid transitions, `prefers-reduced-motion` |
| State & Storage | Local-First Event Model | Reactive service layer (`dataService`, `engineService`, `updateService`) |
| Security & Signing | Minisign Cryptography | Ed25519 public key verification for production release bundles |

---

## Workstation Engineering & Tooling

Internal commands for development, verification, and builds:

```bash
# Start browser preview runtime
npm run dev

# Launch native Tauri desktop workstation in development mode
npm run tauri:dev

# Typecheck TypeScript source
npm run typecheck

# Build frontend production bundle
npm run build

# Build signed native desktop installer (.exe / .msi)
npm run tauri:build
```

---

## Repository Structure

```
Vectoris/
├── src/                          # Frontend Application Layer
│   ├── app/                      # Application entry and root layout
│   ├── components/               # Domain and UI primitives (TitleBar, AppShell, UpdatePanel, etc.)
│   ├── data/                     # Local data stores, sample projects, and schemas
│   ├── pages/                    # Core workstation pages (Dashboard, Projects, Takeoff, Settings)
│   ├── router/                   # Lightweight hash/path client router
│   ├── services/                 # Dedicated domain service boundaries
│   │   ├── dataService.ts        # Local projects, drawings, and takeoff state
│   │   ├── engineService.ts      # Local on-device perception and hardware diagnostics
│   │   └── updateService.ts      # Tauri 2 updater state machine and download streaming
│   └── styles/                   # Technical design tokens and global styles
├── src-tauri/                    # Native Desktop Runtime (Rust)
│   ├── capabilities/             # Tauri v2 explicit security permission manifests
│   ├── src/                      # Rust backend logic and plugin initializers (lib.rs, main.rs)
│   ├── Cargo.toml                # Rust crate dependencies
│   └── tauri.conf.json           # Tauri workstation window, security, and updater configuration
├── docs/                         # Authoritative Architectural and Design Specifications
│   ├── 02_DESIGN/                # Design tokens, navigation, and visual hierarchy
│   ├── 03_ARCHITECTURE/          # Tech stack, security, and data storage boundaries
│   └── 04_AI/                    # AI perception pipeline and local inference specs
└── Research Folder/              # Repository audits, forensic reports, and design research
```

---

## Software Update & Release Trust Model

Vectoris implements a strict cryptographic trust chain:

1. Release Signing: Production installers are signed outside the repository using `TAURI_SIGNING_PRIVATE_KEY`.
2. Release Distribution: Artifacts (`.exe`, `.msi`, `.sig`, and `latest.json`) are published to the public GitHub Releases repository (`VectorisAI/Vectoris`).
3. On-Device Verification: The desktop client queries the HTTPS release endpoint and verifies signatures against the public key embedded in `tauri.conf.json`.
4. "Stay Put" Experience: Upon verification, Vectoris enters a dedicated handoff view before gracefully handing execution to the passive Windows installer.

For complete update documentation, refer to `Summary.md`.

---

## Documentation Links

- [Documentation Index](./docs/DOCUMENTATION_MANIFEST.md)
- [Architecture & Tech Stack](./docs/03_ARCHITECTURE/TECH_STACK.md)
- [Design System & UI Tokens](./docs/02_DESIGN/DESIGN_SYSTEM.md)
- [Update Foundation Summary](./Summary.md)
- [Forensic Repository Audits](./Research%20Folder/AUDIT_02.md)

---

## License

Proprietary Internal Enterprise Workstation Edition. Copyright (c) 2026 Vectoris AI Inc. All rights reserved.