# DialKit framework entry points

Identical API surface across React, Solid, Svelte 5, and Vue 3 — only the entry point and how you read values differ. Verified against `dialkit@1.2.1` `exports`: `dialkit`, `dialkit/solid`, `dialkit/vue`, `dialkit/svelte`, `dialkit/styles.css`.

In every case: install, mount `<DialRoot />` once as a sibling at the app root, import `dialkit/styles.css`, then call the hook.

## React (default entry)

```bash
npm install dialkit motion
```

```jsx
import { useDialKit } from 'dialkit'
const params = useDialKit('Card', { blur: [24, 0, 100], scale: 1.2 })
// read directly: params.blur
```

## Solid — `dialkit/solid`

Returns an **accessor**; call it to read values.

```bash
npm install dialkit solid-js
```

```js
import { createDialKit, DialRoot } from 'dialkit/solid'
const params = createDialKit('Card', { blur: [24, 0, 100], scale: 1.2 })
params().blur   // accessor call
```

## Svelte — `dialkit/svelte` (Svelte ≥5.8.0)

Returns a reactive object; read directly.

```bash
npm install dialkit
```

```svelte
<script>
  import { createDialKit } from 'dialkit/svelte'
  const params = createDialKit('Card', { blur: [24, 0, 100], scale: 1.2 })
</script>
<div style:filter={`blur(${params.blur}px)`}>…</div>
```

## Vue — `dialkit/vue` (Vue ≥3.3.0)

Returns a reactive object. Note the animation peer is `motion-v`, not `motion`.

```bash
npm install dialkit motion-v vue
```

```vue
<script setup>
import { useDialKit } from 'dialkit/vue'
const params = useDialKit('Card', { blur: [24, 0, 100], scale: 1.2 })
</script>
<template>
  <div :style="{ filter: `blur(${params.blur}px)` }">…</div>
</template>
```
