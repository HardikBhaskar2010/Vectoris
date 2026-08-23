# Vectoris — Onboarding

**Status:** LOCKED (Flow and Tooling)  
**Owner of:** First-time user experience (FTUE), guided tours  
**Does not own:** General page layouts (→ specific page docs)

---

## 1. Tooling

Product onboarding and contextual feature walkthroughs are powered by **Driver.js** (`LOCKED`).

## 2. Philosophy

- **Focused, not exhausting:** Do not make onboarding a 25-step tutorial. Keep it strictly focused on the core value loop.
- **Contextual:** Show users how to use a feature when they encounter it, rather than upfront.
- **Dismissible:** The user must always be able to exit the tour immediately.

## 3. Core Onboarding Flow

The initial guided tour walks the user through the fundamental Vectoris value loop:

1. **First Project:** Creating the initial project structure.
2. **Upload Documents:** Adding a drawing to the project.
3. **Document Viewer:** Navigating the drawing canvas (pan, zoom).
4. **Ask Vectoris:** Introducing the AI agent capabilities.
5. **Takeoff Workspace:** Viewing the extracted data.
6. **Review:** Approving or correcting AI detections.
7. **Export:** Generating the final BOQ.

## 4. Implementation Rules

- Driver.js tooltips must use the Vectoris typography (Urbanist) and respect the dark/light theming system.
- Overlays must not permanently block access to core engineering data.
- Completion of the onboarding flow must be recorded (e.g., in user settings) so it is not shown again on subsequent launches.

## 5. Cross-References

- `DEPENDENCIES.md` (Driver.js)
- `../02_DESIGN/COMPONENTS.md`
