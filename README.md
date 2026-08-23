# Vectoris

Vectoris is an AI-native electrical estimating and techno-commercial engineering platform. It provides a single merged pipeline for quantity takeoff from electrical drawings (H1) and AI-assisted solution configuration and quotation (H2).

## 📚 Documentation

The complete, locked architectural and product documentation is located in the `docs/` directory. 

**Start here:**
- [Documentation Manifest](./docs/DOCUMENTATION_MANIFEST.md) — The index of all documentation.
- [Tech Stack](./docs/03_ARCHITECTURE/TECH_STACK.md) — The locked technology choices.
- [Design System](./docs/02_DESIGN/DESIGN_SYSTEM.md) — The authoritative UI tokens and third-party library rules.
- [AI System](./docs/04_AI/AI_SYSTEM.md) — The agentic hybrid architecture.

## 🎨 Designs

Final, locked screen layouts and visual components are located in the `designs/stitch/` directory as static HTML and PNG references.

## 🏗️ Architecture Overview

Vectoris is a local-first desktop application wrapped in a **Tauri** shell, communicating with a **Python/FastAPI** backend and **Supabase** for metadata syncing and authentication. Long-running AI jobs and document ingestion are handled asynchronously via **Redis and BullMQ**.

The frontend is built with **React, TypeScript, and Vite**, leveraging a curated ecosystem of libraries (`Bklit UI`, `ReactBits`, `assistant-ui`, `Skiper UI`) that are adapted strictly to the proprietary Vectoris Design System.

*For full dependency tracking, see [DEPENDENCIES.md](./docs/DEPENDENCIES.md).*

## 🔍 Research & History

Historical discovery documents, early scope definitions, the original project thesis, and founder briefs are archived in the `Research Folder/` for reference.