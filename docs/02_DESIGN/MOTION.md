# Vectoris — Motion Principles

**Status:** LOCKED  
**Owner of:** Motion principles and library choice  
**Does not own:** Component visuals (→ COMPONENTS.md), color (→ DESIGN_SYSTEM.md)

---

## 1. Motion Sources

**ReactBits**
- Interactive visual effects
- Component-level motion

**Skiper UI**
- Specialized premium interactions
- Animated theme controls
- Dynamic Island

**Motion / Framer Motion**
- Application-level transitions
- Layout transitions
- State transitions

## 2. Principles

1. **Motion communicates state, not decoration.** Transitions should clarify what changed (a detection was accepted, a job progressed) rather than exist for visual flourish.
2. **Restraint over spectacle.** Consistent with the "premium, calm, engineering-grade" design intent (`DESIGN.md`) — avoid bouncy/playful easing; favor smooth, confident, low-amplitude motion.
3. **Never block user action.** Loading/processing motion must not prevent the user from navigating away or cancelling where cancellation is supported (see `../03_ARCHITECTURE/EVENT_SYSTEM.md`).
4. **Respect reduced-motion preferences.** The application must honor the OS `prefers-reduced-motion` media query by turning off decorative animations and crossfades, snapping instantly to final states where applicable.

## 3. Where Motion Matters Most

- Job/processing progress (Processing page)
- Detection accept/reject feedback (Takeoff Review)
- Panel/drawer open-close (contextual surfaces)
- Theme transitions (dark/light)

## 4. Cross-References

- `DESIGN.md`, `DESIGN_SYSTEM.md`
- `../03_ARCHITECTURE/TECH_STACK.md` (frontend framework)
