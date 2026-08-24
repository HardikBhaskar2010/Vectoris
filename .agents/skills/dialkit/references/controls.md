# DialKit control reference

Every control is inferred from the shape of its config value. Full catalog below.

## Slider

```js
blur: [24, 0, 100]        // [default, min, max]
columns: [3, 1, 6, 1]     // [default, min, max, step]
scale: 1.18               // bare number -> auto-inferred range
```

## Toggle

```js
enabled: true             // boolean -> on/off segmented control
darkMode: false
```

## Color

```js
color: '#ff5500'                          // hex string -> auto color picker
bg: { type: 'color', default: '#000' }    // explicit form
```

## Text

```js
title: 'Hello'                                              // non-hex string -> text input
subtitle: { type: 'text', default: '', placeholder: '…' }  // explicit, with placeholder
```

## Select

```js
layout: {
  type: 'select',
  options: ['stack', 'fan', 'grid'],   // or [{ value, label }]
  default: 'stack',
}
```

## Spring editor

Visual curve preview with Time and Physics modes. Returned object is passed straight to Motion's `transition`.

```js
// Time mode (simpler)
spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 }

// Physics mode (more control)
spring: { type: 'spring', stiffness: 200, damping: 25, mass: 1 }
```

## Easing editor

Cubic-bezier editor with duration and live preview. Also passed to Motion's `transition`.

```js
easing: { type: 'easing', duration: 0.3, ease: [0.4, 0, 0.2, 1] }
```

## Folders

Nested objects become collapsible folders. `_collapsed: true` starts one closed.

```js
shadow: {
  _collapsed: true,
  offsetY: [8, 0, 24],
  blur: [16, 0, 48],
}
```

Read nested values with the same nesting: `params.shadow.blur`.

## Actions

Buttons that fire `options.onAction` with the key name.

```js
const params = useDialKit('Controls', {
  next: { type: 'action' },
  reset: { type: 'action' },
}, {
  onAction: (action) => {
    if (action === 'next') goNext()
    if (action === 'reset') reset()
  },
})
```

## Keyboard shortcuts

Pass a `shortcuts` map in the options object. Use dot notation for nested keys. Each bound control shows a pill badge; shortcuts auto-disable while a text input is focused.

```js
const p = useDialKit('Card', {
  blur: [24, 0, 100],
  scale: 1.2,
  darkMode: true,
  shadow: { blur: [10, 0, 50] },
}, {
  shortcuts: {
    blur:          { key: 'b', mode: 'fine' },        // B + scroll
    scale:         { key: 's', interaction: 'drag' },  // S + drag
    darkMode:      { key: 'm' },                        // press M to toggle
    'shadow.blur': { key: 'd', mode: 'fine' },          // nested via dot notation
  },
})
```

`ShortcutConfig`: `key?` (optional for scroll-only), `modifier?` (`'alt'|'shift'|'meta'`), `mode?` (`'fine'|'normal'|'coarse'`, default `normal`), `interaction?` (`'scroll'|'drag'|'move'|'scroll-only'`, default `scroll`).

## DialRoot props

| Prop | Type | Default |
|---|---|---|
| `position` | `'top-right'｜'top-left'｜'bottom-right'｜'bottom-left'` | `'top-right'` |
| `defaultOpen` | `boolean` | `true` |
| `mode` | `'popover'｜'inline'` | `'popover'` |
| `theme` | `'light'｜'dark'｜'system'` | `'system'` |
| `productionEnabled` | `boolean` | `false` |

Inline mode embeds the panel in your layout instead of floating; it fills its container:

```jsx
<aside style={{ width: 300, height: '100vh', overflow: 'hidden' }}>
  <DialRoot mode="inline" />
</aside>
```
