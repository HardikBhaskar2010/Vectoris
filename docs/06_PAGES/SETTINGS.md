# Vectoris — Settings

**Status:** PROVISIONAL (Layout) · LOCKED (Specific controls)  
**Owner of:** Application configuration, user preferences, theming  
**Does not own:** Project-specific settings (→ PROJECT_OVERVIEW.md)

---

## 1. Purpose

The Settings page provides a centralized location for users to configure their Vectoris experience, including appearance, local engine preferences, and account management.

## 2. Appearance & Theming

Vectoris supports full dark and light themes (see `../02_DESIGN/DESIGN_SYSTEM.md`). 

Theme switching must be animated and smooth.
- **Implementation:** The animated theme toggle and transition effects are provided by **Skiper UI** (`LOCKED`).

## 3. General Settings (Conceptual)

- **Appearance:** Theme toggle (Dark/Light/System).
- **Local Engine:** Status, resource allocation, and model management for local AI processing.
- **Account:** User profile, organization management (if Admin/Owner).
- **Notifications:** Preferences for job completion alerts.

## 4. Component Strategy

Settings interfaces should utilize standard **Bklit UI** primitives (cards, lists, toggles) adapted to the Vectoris design system to ensure a clean, engineering-grade appearance.

## 5. Cross-References

- `../02_DESIGN/DESIGN_SYSTEM.md` (Theming rules)
- `../02_DESIGN/MOTION.md` (Skiper UI motion)
- `../DEPENDENCIES.md`
