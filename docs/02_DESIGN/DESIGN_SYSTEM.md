# Vectoris — Design System

**Status:** LOCKED (colour palette · Liquid Glass rules · spacing · typography system)  
**Owner of:** Color tokens, typography status, spacing scale  
**Does not own:** Philosophy (→ DESIGN.md), component behavior (→ COMPONENTS.md)

---

## 1. Color Palette (LOCKED)

The following colours are the **definitive, founder-locked** Vectoris colour schema. These values must not be changed without an explicit founder decision. Semantic role descriptions are founder-provided.

### Dark Mode — Primary

| Color | HEX | Role |
|---|---|---|
| Black Cherry | `#55100D` | Deep brand/surface tone |
| Coffee Bean | `#1A0706` | Deepest backgrounds / dark surfaces |
| Racing Red | `#DD0200` | Primary actions, active states, emphasis |
| Alabaster Grey | `#D9D9D9` | Light text / contrast elements |

### Light Mode

| Color | HEX | Role |
|---|---|---|
| Alabaster Cream | `#F1ECE6` | Primary background |
| Warm Greige | `#DDD5CD` | Secondary surfaces |
| Vintage Rosewood | `#7D4047` | Brand/accent color |
| Charcoal Espresso | `#2E2E2E` | Primary dark text / contrast |

### Design Token Mapping

| Token | Name | HEX | Theme |
|---|---|---|---|
| `color.dark.background` | Coffee Bean | `#1A0706` | Dark |
| `color.dark.surface.primary` | Black Cherry | `#55100D` | Dark |
| `color.dark.accent.primary` | Racing Red | `#DD0200` | Dark |
| `color.dark.text.primary` | Alabaster Grey | `#D9D9D9` | Dark |
| `color.light.background` | Alabaster Cream | `#F1ECE6` | Light |
| `color.light.surface.secondary` | Warm Greige | `#DDD5CD` | Light |
| `color.light.accent.primary` | Vintage Rosewood | `#7D4047` | Light |
| `color.light.text.primary` | Charcoal Espresso | `#2E2E2E` | Light |

> **Status:** HEX values are **LOCKED** (founder-provided). Full semantic token mapping (which token maps to which specific UI element — e.g., CTA background, hover state, error state, destructive action) is **TBD** pending detailed screen designs. Do not assume Racing Red = "error/danger" — in Vectoris's engineering-grade design language, Racing Red is the primary brand accent, not a danger indicator.


## 2. Typography (LOCKED System)

The typography system is **LOCKED**, though the exact display font awaits final design comparison.

- **UI:** Urbanist
- **Technical:** IBM Plex Mono (used for measurements, coordinates, IDs, technical metadata, system information, engineering values)
- **Display / Brand:** Distinctive editorial/display typography (e.g., Quffer, Apoc, Relevation). The exact font gets selected against actual Vectoris designs to form the distinctive brand identity.

## 3. Spacing & Layout Scale (LOCKED)

The foundational grid is **LOCKED** to an 8px base grid. 

**Vectoris Spacing Tokens:**
- `4px`   — micro spacing (for tiny adjustments)
- `8px`   — base (the foundational rhythm)
- `12px`  — compact
- `16px`  — standard
- `20px`  — comfortable
- `24px`  — section
- `32px`  — large
- `40px`  — major
- `48px`  — large separation
- `64px`  — structural
- `80px`  — major layout
- `96px`  — display/layout

## 4. Theming

System theme (dark + light) must be supported natively, not as an afterthought. Both palettes above must reach equivalent contrast/accessibility standards — exact contrast ratios TBD, requires accessibility audit once real screens exist.

## 5. Liquid Glass — Usage Specification (LOCKED)

> **Core philosophy:** Vectoris is solid and precise at its foundation, fluid and glassy only where the interface floats above the work.

---

### Where Liquid Glass IS Used

Glass surfaces are reserved for **floating, transient, and overlaid UI** — controls and surfaces that sit above the primary content layer.

**1. Floating Navigation / Utility Controls**
- Top search bar
- User / profile controls
- Notifications
- Local Engine status badge
- Floating toolbars in the Drawing Viewer

These use subtle translucency + backdrop blur.

**2. Drawing Viewer Controls** *(best use case)*
The floating toolbar — Pan · Zoom · Fit · Measure · Layers · AI tools — sits over the drawing as a translucent glass panel. Same for contextual tooltips and floating measurement controls. The drawing is the work; the controls float above it.

**3. AI Agent Panels**
The Vectoris Agent can use slightly translucent elevated surfaces, especially when overlaying or sitting beside the drawing. **The engineering data itself must remain at full contrast — glass is the container, not the content.**

**4. Modals / Command Palettes**
Appropriate glass surfaces for:
- Command palette
- Quick actions
- File picker
- Share dialog
- Create Project modal
- Context menus

**5. Temporary Overlays**
Surfaces that float above the application layer:
- Notifications
- Quick actions
- AI suggestions
- Measurement annotations
- Context menus

---

### Where Liquid Glass Is NOT Used

Do not apply glass to:

- Main page backgrounds
- Large data tables
- BOQ / takeoff review tables
- Takeoff line-item lists
- Dense engineering information displays
- Long AI conversation streams
- Document processing timeline
- Forms
- Primary navigation / sidebar
- Every card (indiscriminate use destroys the hierarchy)

Applying glass universally produces an "Apple Vision Pro Engineering Dashboard" — which looks visually impressive and functionally illegible for engineering data. Liquid Glass only works because it is **selective**.

---

### Visual Rule

```
SOLID SURFACES
      ↓
Core content + engineering data

LIQUID GLASS
      ↓
Floating controls + transient UI

RACING RED  (Dark) / VINTAGE ROSEWOOD (Light)
      ↓
Actions + active states + important emphasis
```

---

### Glass Token Specification

Glass surfaces must be **subtle** — not performative:

| Property | Value |
|---|---|
| Opacity | Low — background content must remain partially visible |
| Backdrop blur | Moderate — enough to separate layers, not to obscure |
| Border | Thin, low-opacity — not a hard edge |
| Shadow | Very restrained |
| Text contrast | High — engineering data must always be clearly readable |
| Reflections | None / near-none |
| Gradients | No large glowing gradients |

**Dark Mode glass:**
- Background: Coffee Bean (`#1A0706`) / Black Cherry (`#55100D`) translucency
- Border: subtle Alabaster Grey (`#D9D9D9`) at low opacity
- Accent: Racing Red (`#DD0200`)

**Light Mode glass:**
- Background: Alabaster Cream (`#F1ECE6`) / Warm Greige (`#DDD5CD`) translucency
- Border: subtle Charcoal Espresso (`#2E2E2E`) at low opacity
- Accent: Vintage Rosewood (`#7D4047`)

Concrete blur radius / opacity values: **TBD** — to be determined during the design spike and locked once actual component implementations are reviewed against the real screen designs.

## 6. Cross-References

- Philosophy: `DESIGN.md`
- Component inventory: `COMPONENTS.md`
- Motion: `MOTION.md`

## 7. Third-Party Component Strategy

Third-party libraries provide implementation primitives. **They do NOT define the Vectoris design system.**

Vectoris design tokens remain authoritative:
- Color
- Typography
- 8px spacing system
- Radius
- Shadows
- Liquid Glass
- Motion
- Accessibility
- Light/Dark themes

Third-party components must be adapted to these tokens before being considered production-ready. No library may introduce an independent visual language into Vectoris.

### Library Roles (Preventing Frankenstein UI)

- **Bklit UI** → Dashboard/data UI
- **ReactBits** → Custom/premium interactions
- **assistant-ui** → Agent/chat
- **Skiper UI** → Specialized motion/interactions
- **Driver.js** → Onboarding
- **Thinking Orbs** → AI activity visualization
