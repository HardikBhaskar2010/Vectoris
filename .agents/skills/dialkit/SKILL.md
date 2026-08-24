---
name: dialkit
description: Set up and use DialKit — a floating control panel that wires sliders, toggles, color pickers, spring/easing editors, and keyboard shortcuts to live UI values in React, Solid, Svelte, or Vue. Use when installing dialkit, mounting DialRoot, calling useDialKit, or adding real-time controls to tune animation, layout, or style values.
metadata:
  package: dialkit@1.2.1
  verified: React 19 + Vite 8, Chrome via Playwright
---

# DialKit

DialKit renders one floating **control panel** in the corner of your app. Each `useDialKit(name, config)` call adds a folder to it, with controls auto-inferred from the shape of each config value, and returns a reactive object whose values update live as you drag the controls. This skill covers React (default); other frameworks share the API — see [references/frameworks.md](references/frameworks.md).

After wiring it up, **verify with the bundled driver** ([smoke.mjs](smoke.mjs)) — it loads your dev server in Chrome, confirms the panel mounted, and proves a slider drives a value. Do not declare DialKit working off a clean build alone; a missing `styles.css` import compiles fine and renders an invisible panel.

## 1. Install

```bash
npm install dialkit motion
```

`motion` is the peer DialKit feeds spring/easing configs into. (Vue uses `motion-v` instead — see frameworks reference.)

## 2. Mount DialRoot once, at the app root

```jsx
import { DialRoot } from 'dialkit'
import 'dialkit/styles.css'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <DialRoot />
    </>
  )
}
```

**`<DialRoot />` is a sibling of `{children}`, never a wrapper** — it does not provide context; it renders the panel. Wrapping `{children}` in it is the most common setup mistake. The `import 'dialkit/styles.css'` is mandatory: without it the panel mounts but is unstyled and effectively invisible.

## 3. Add controls with useDialKit

Call it in any component. Each config value's shape picks its control:

```jsx
import { useDialKit } from 'dialkit'
import { motion } from 'motion/react'

function Card() {
  const params = useDialKit('Card', {
    blur: [24, 0, 100],   // [default, min, max]
    opacity: [0.8, 0, 1],
    scale: 1.18,          // bare number -> auto-ranged slider
    color: '#ff5500',     // hex string -> color picker
    visible: true,        // boolean -> toggle
    shadow: {             // nested object -> collapsible folder
      _collapsed: true,
      offsetY: [8, 0, 24],
      blur: [16, 0, 48],
    },
    spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
  })

  return (
    <motion.div
      style={{
        filter: `blur(${params.blur}px)`,
        opacity: params.visible ? params.opacity : 0,
        background: params.color,
        boxShadow: `0 ${params.shadow.offsetY}px ${params.shadow.blur}px rgba(0,0,0,0.3)`,
      }}
      animate={{ scale: params.scale }}
      transition={params.spring}
    />
  )
}
```

### Control inference

| Config value | Control |
|---|---|
| `[default, min, max, step?]` | Slider (explicit range) |
| `number` | Slider (auto range) |
| `boolean` | Toggle |
| `'#ff5500'` (hex string) | Color picker |
| `'text'` (non-hex string) | Text input |
| `{ type: 'select', options, default }` | Dropdown |
| `{ type: 'spring', … }` | Spring curve editor |
| `{ type: 'easing', … }` | Cubic-bezier editor |
| `{ type: 'action' }` | Button → `options.onAction(key)` |
| `{ nested: … }` | Folder (`_collapsed: true` = start closed) |

Explicit control forms, the spring/easing/select shapes, `onAction`, keyboard `shortcuts`, and `DialRoot` props (`position`, `mode: 'inline'`, `theme`, `productionEnabled`) are all in [references/controls.md](references/controls.md).

## 4. Verify (agent path)

The bundled [smoke.mjs](smoke.mjs) drives DialKit's own UI, so it works against any app regardless of which controls you defined. Run it from **inside the target project** (Node resolves `playwright` from the project's `node_modules`, not the skill dir):

```bash
cp <skill-dir>/smoke.mjs ./smoke.mjs       # bring the driver into the project
npm i -D playwright                        # uses system Chrome via channel — no browser download
npm run dev &                              # start the dev server
URL=http://localhost:5173/ OUT=./dialkit.png node smoke.mjs
```

Expected output (match your dev-server port in `URL`):

```
controls: {"sliders":5,"toggles":2,"colors":1,"folders":3}
slider value before=24 after=90
SMOKE PASS -> ./dialkit.png
```

`SMOKE PASS` + a screenshot showing the panel = setup is correct. `no sliders rendered` = `DialRoot` not mounted or no `useDialKit` call ran. `slider drag changed nothing` = `styles.css` not imported.

## Gotchas

- **`DialRoot` is a sibling, not a wrapper.** It renders the panel; it provides no context. Wrapping children breaks layout and is the top setup error.
- **`styles.css` is mandatory.** Omit it and the panel mounts invisibly — the build still succeeds, so this hides until runtime. The smoke driver's slider check catches it.
- **Hidden in production by default.** `<DialRoot />` renders nothing in production builds unless you pass `productionEnabled`.
- **Slider triple form is `[default, min, max]`, not `[min, max, default]`.** First element is the starting value.
- **Read nested values through the nesting** — `params.shadow.blur`, matching the config — not a flattened `params['shadow.blur']`. (Dot notation is only for the `shortcuts` map.)
- **DOM hooks for testing/automation:** `.dialkit-panel` (the panel), `.dialkit-slider` + `.dialkit-slider-value`, `.dialkit-segmented` (toggles), `.dialkit-color-control`, `.dialkit-folder`.
- **Vue's animation peer is `motion-v`,** not `motion`. Solid returns an **accessor** (`params()`), Svelte/Vue/React return reactive objects read directly. See frameworks reference.

## Frameworks

React is the default entry (`dialkit`). Solid (`dialkit/solid`), Svelte 5 (`dialkit/svelte`), and Vue 3 (`dialkit/vue`) share the API with per-framework value access — see [references/frameworks.md](references/frameworks.md).
