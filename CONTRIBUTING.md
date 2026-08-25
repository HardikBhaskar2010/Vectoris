# Contributing to Vectoris

Welcome to the **Vectoris** engineering team. This document outlines our internal engineering practices, architecture boundaries, and code standards for developing on the Vectoris Desktop Workstation.

---

## 🏛️ Architectural Guardrails

When contributing code to Vectoris, adhere strictly to these core principles:

1. **Local-First Isolation:** Customer drawings, blueprint raster tiles, and takeoff quantities must never be sent to external cloud APIs without explicit per-job authorization.
2. **Domain Boundary Encapsulation:** React UI components must not directly invoke raw Tauri IPC (`invoke()`) or Tauri plugin methods. All desktop interactions belong inside dedicated service boundaries in `src/services/` (`dataService.ts`, `engineService.ts`, `updateService.ts`).
3. **Strict Cryptographic Trust:** In-app updates must use the official Tauri updater with Ed25519 public key verification. Never commit or leak private signing keys (`*.key`).
4. **Zero Simulated Telemetry:** Do not implement fake loading spinners, simulated timeouts, or invented progress percentages. Report honest system and runtime diagnostics.
5. **Design System Fidelity:** Use the proprietary Vectoris CSS custom properties and motion tokens. Avoid ad-hoc utility classes or arbitrary styling overrides.

---

## 🛠️ Development Workflow

### 1. Toolchain Setup
Ensure you have:
- Node.js 20+ and npm 10+
- Rust 1.77+ with `x86_64-pc-windows-gnu` or `x86_64-pc-windows-msvc`
- WebView2 Runtime

```bash
# Install dependencies
npm install

# Start local frontend dev preview
npm run dev

# Run native Tauri workstation in development
npm run tauri:dev
```

### 2. Pre-Commit Quality Checks
Before submitting a pull request, ensure all automated verification checks pass:

```bash
# 1. Typecheck TypeScript strictly
npm run typecheck

# 2. Build Vite production bundle
npm run build
```

---

## 📁 Code Organization

- `src/components/`: Reusable workstation UI components and overlays.
- `src/services/`: Isolated domain service boundaries and state machines.
- `src/pages/`: Main workstation page views (`DashboardPage`, `ProjectsPage`, `SettingsPage`, etc.).
- `src/styles/`: Global technical design tokens and liquid theme definitions.
- `src-tauri/`: Native Rust desktop shell, plugins, and capabilities manifests.
- `docs/`: Authoritative architectural and design system specifications.

---

## 🔒 Security & Secrets Hygiene

- **Never** place passwords, private keys, API tokens, or secrets inside source files.
- Ensure `.gitignore` rules prevent staging any `*.key`, `*.pem`, `*.sig`, or `.env` files.
- Report any potential security concerns according to [`SECURITY.md`](./SECURITY.md).
