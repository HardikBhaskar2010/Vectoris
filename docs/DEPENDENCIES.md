# Vectoris — Dependency Registry

**Status:** LOCKED (Framework)  
**Owner of:** Centralized third-party library tracking  
**Does not own:** Architecture decisions (→ `03_ARCHITECTURE/TECH_STACK.md`)

---

## 1. Purpose

This document serves as the single source of truth for third-party libraries used in Vectoris. It establishes clear boundaries and responsibilities for each dependency to prevent feature overlap and UI inconsistency.

## 2. UI / Components

| Dependency | Purpose | Where Used | Status |
|---|---|---|---|
| **ReactBits** | Custom interactive components, visual effects, premium interactions | Global | **LOCKED** |
| **Bklit UI** | Dashboard components, data tables, structural cards | Dashboard, Projects | **LOCKED** |
| **assistant-ui** | AI Agent chat foundation, message rendering, tool surfaces | AI Session, Takeoff Review | **LOCKED** |
| **Skiper UI** | Premium motion components, animated theme controls, Dynamic Island | Global, Settings | **LOCKED** (selective) |
| **Driver.js** | Product onboarding, guided tours, contextual walkthroughs | Onboarding Flow | **LOCKED** |
| **Thinking Orbs** | AI activity visualization, agent processing states | AI Session, Global | **LOCKED** (selective) |

*(Note: Tailark is explicitly excluded and REJECTED from the Vectoris ecosystem).*

## 3. Motion

| Dependency | Purpose | Where Used | Status |
|---|---|---|---|
| **Motion (Framer Motion)** | Application-level transitions, layout transitions, state transitions | Global | **LOCKED** |

## 4. Core Stack

| Dependency | Purpose | Where Used | Status |
|---|---|---|---|
| **React** | Core UI rendering | Frontend | **LOCKED** |
| **TypeScript** | Type safety | Frontend, Backend (node workers if any) | **LOCKED** |
| **Vite** | Frontend build tooling | Frontend | **LOCKED** |
| **Tauri** | Desktop application shell, OS integration | Native Layer | **LOCKED** |
| **Rust** | System integration, local filesystem access | Native Layer | **LOCKED** |

## 5. Backend & Data

| Dependency | Purpose | Where Used | Status |
|---|---|---|---|
| **Python** | Backend core, AI orchestration, document processing | Backend | **RECOMMENDED** |
| **FastAPI** | API serving | Backend | **RECOMMENDED** |
| **Supabase** | Managed database, authentication, row-level security | Cloud | **LOCKED** |
| **PostgreSQL** | Relational data model | Cloud | **LOCKED** |
| **Redis** | In-memory message broker for Celery queues | Backend | **LOCKED** |
| **Celery** | Job queue management, retry logic, workers | Backend | **LOCKED** |

## 6. Monitoring

| Dependency | Purpose | Where Used | Status |
|---|---|---|---|
| **PostHog** | Product usage analytics | Global | **RECOMMENDED** |

## 7. Dependency Chain Rule

To maintain architectural integrity, the following dependency chain must be respected:

`PRD` → `Architecture` → `Design System` → `Component Strategy` → `Page Specs` → `UI Libraries` → `Implementation`

UI libraries exist to implement the design system, not to define it.
