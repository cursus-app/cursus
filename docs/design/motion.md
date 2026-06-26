# Motion Design — Cursus

> Source : `app/utils/motionPresets.ts` · `app/composables/useReducedMotion.ts`
> Lib : `@vueuse/motion` v2 (directive `v-motion`, module Nuxt `@vueuse/motion/nuxt`)

---

## Politique prefers-reduced-motion

**REGLE OBLIGATOIRE** : toute animation > 200ms doit etre desactivee si
`useReducedMotion()` retourne `true`.

```typescript
const reducedMotion = useReducedMotion();
// Dans le template : n'appliquer le preset que si !reducedMotion.value
```

Le CSS embarque aussi un fallback media query (`@media (prefers-reduced-motion: reduce)`)
qui neutralise `.page-enter-active` / `.page-leave-active`. Les deux mecanismes sont
complementaires (defense en profondeur).

---

## useReducedMotion()

```typescript
import { useReducedMotion } from '~/composables/useReducedMotion';

const reducedMotion = useReducedMotion(); // ComputedRef<boolean>
```

- SSR ou `matchMedia` absent → `false` (pas de restriction)
- Reactif : se met a jour si l'utilisateur change le reglage OS sans recharger.

---

## motionPresets

| Preset           | Duree         | Description                           |
| ---------------- | ------------- | ------------------------------------- |
| `fadeIn`         | 200ms         | Opacite 0 → 1                         |
| `slideDown`      | 200ms         | -8px + fade (Cmd+K palette)           |
| `popover`        | 150ms         | Scale 0.95 → 1 + fade                 |
| `modalMobile`    | 300ms         | Slide depuis le bas                   |
| `modalDesktop`   | 250ms         | Scale 0.95 → 1 + fade                 |
| `bounce`         | 300ms         | Keyframes scale — badge XP validation |
| `staggerItem(i)` | 200ms + delai | Listes — 20ms/item, plafond 200ms     |

> **Presets > 200ms** : `modalMobile`, `modalDesktop`, `bounce`. Verifier `useReducedMotion()`.

### Utilisation

```vue
<!-- Preset statique -->
<div v-motion="motionPresets.fadeIn" />

<!-- Stagger sur liste -->
<div v-for="(item, i) in items" :key="item.id" v-motion="motionPresets.staggerItem(i)" />

<!-- Avec garde reduced-motion -->
<div :v-motion="reducedMotion ? undefined : motionPresets.bounce" />
```

---

## Transitions de page

Configurees dans `app/app.vue` via `<NuxtPage :transition>` :

- Nom : `page` → classes CSS `.page-enter-*` / `.page-leave-*` dans `assets/css/main.css`
- Duree : `--duration-subtle` (150ms)
- Easing : `--ease-out`
- Si `useReducedMotion()` → `transition: false` (pas de wrapping Transition)

---

## Tokens de duree (main.css)

| Token                | Valeur | Usage                           |
| -------------------- | ------ | ------------------------------- |
| `--duration-instant` | 100ms  | Interactions immediates         |
| `--duration-subtle`  | 150ms  | Transitions de page, focus ring |
| `--duration-fast`    | 200ms  | Fade, slide, stagger            |
| `--duration-base`    | 300ms  | Modals, bounce                  |
| `--duration-slow`    | 500ms  | Transitions complexes           |
