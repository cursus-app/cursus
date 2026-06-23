# Palette de couleurs — Cursus

> Palette sémantique de Cursus, alignée avec `docs/product/10-design-system.md`. Toutes les couleurs sont définies en **OKLCH** pour bénéficier d'un espace perceptuellement uniforme (luminance prévisible, transitions naturelles, dark mode cohérent), avec un fallback hex pour les outils qui ne supportent pas encore OKLCH (Figma legacy, Slack, etc.).

## Principes

1. **Sémantique d'abord** : on nomme par le rôle (`accent`, `success`, `danger`), pas par la teinte (`indigo-600`).
2. **OKLCH first** : tokens primaires en OKLCH, hex calculé seulement pour fallback / compatibilité.
3. **Contraste vérifié** : chaque paire texte/fond cible WCAG AA minimum, AAA sur écrans critiques.
4. **Dark mode natif** : chaque token a sa déclinaison `.dark`.

---

## Accent (interactif principal — indigo)

| Token           | Light OKLCH            | Light hex | Dark OKLCH             | Dark hex  | Usage                           |
| --------------- | ---------------------- | --------- | ---------------------- | --------- | ------------------------------- |
| `accent-base`   | `oklch(0.55 0.22 264)` | `#4F46E5` | `oklch(0.78 0.16 264)` | `#818CF8` | Boutons primaires, liens, focus |
| `accent-hover`  | `oklch(0.50 0.24 270)` | `#4338CA` | `oklch(0.85 0.13 264)` | `#A5B4FC` | États hover                     |
| `accent-subtle` | `oklch(0.97 0.02 264)` | `#EEF2FF` | `oklch(0.28 0.10 268)` | `#1E1B4B` | Fond bouton secondaire, badges  |
| `accent-text`   | `oklch(1 0 0)`         | `#FFFFFF` | `oklch(0.15 0.01 268)` | `#09090B` | Texte sur fond accent           |

---

## Surface (backgrounds)

| Token         | Light OKLCH             | Light hex | Dark OKLCH              | Dark hex  | Usage                       |
| ------------- | ----------------------- | --------- | ----------------------- | --------- | --------------------------- |
| `bg-base`     | `oklch(1 0 0)`          | `#FFFFFF` | `oklch(0.15 0.005 268)` | `#09090B` | Fond principal              |
| `bg-subtle`   | `oklch(0.985 0 0)`      | `#FAFAFA` | `oklch(0.19 0.008 268)` | `#18181B` | Sections alternées          |
| `bg-muted`    | `oklch(0.97 0.003 268)` | `#F4F4F5` | `oklch(0.24 0.01 268)`  | `#27272A` | Cards, hover rows           |
| `bg-emphasis` | `oklch(0.18 0.008 268)` | `#18181B` | `oklch(0.985 0 0)`      | `#FAFAFA` | Inverse (banners, callouts) |

---

## Texte

| Token          | Light OKLCH             | Light hex | Dark OKLCH              | Dark hex  | Contraste sur bg-base | Usage                 |
| -------------- | ----------------------- | --------- | ----------------------- | --------- | --------------------- | --------------------- |
| `text-base`    | `oklch(0.18 0.008 268)` | `#18181B` | `oklch(0.985 0 0)`      | `#FAFAFA` | 16:1 (AAA)            | Corps de texte        |
| `text-muted`   | `oklch(0.42 0.012 268)` | `#52525B` | `oklch(0.72 0.012 268)` | `#A1A1AA` | 7:1 (AAA)             | Texte secondaire      |
| `text-subtle`  | `oklch(0.62 0.012 268)` | `#A1A1AA` | `oklch(0.52 0.012 268)` | `#71717A` | 4.5:1 (AA)            | Captions, métadonnées |
| `text-inverse` | `oklch(0.985 0 0)`      | `#FAFAFA` | `oklch(0.18 0.008 268)` | `#18181B` | —                     | Texte sur fond sombre |

---

## Bordures

| Token           | Light OKLCH             | Light hex | Dark OKLCH              | Dark hex  | Usage                 |
| --------------- | ----------------------- | --------- | ----------------------- | --------- | --------------------- |
| `border-subtle` | `oklch(0.93 0.004 268)` | `#E4E4E7` | `oklch(0.24 0.01 268)`  | `#27272A` | Séparateurs, dividers |
| `border-base`   | `oklch(0.87 0.008 268)` | `#D4D4D8` | `oklch(0.32 0.01 268)`  | `#3F3F46` | Inputs, cards         |
| `border-strong` | `oklch(0.52 0.012 268)` | `#71717A` | `oklch(0.72 0.012 268)` | `#A1A1AA` | Inputs focus, outline |

---

## Sémantique — Succès

| Token            | Light OKLCH            | Light hex | Dark OKLCH             | Dark hex  | Usage                   |
| ---------------- | ---------------------- | --------- | ---------------------- | --------- | ----------------------- |
| `success-base`   | `oklch(0.62 0.16 155)` | `#059669` | `oklch(0.72 0.16 155)` | `#34D399` | Harnais OK, validations |
| `success-subtle` | `oklch(0.96 0.05 155)` | `#D1FAE5` | `oklch(0.28 0.08 155)` | `#064E3B` | Fond badge succès       |
| `success-text`   | `oklch(0.35 0.10 155)` | `#065F46` | `oklch(0.92 0.08 155)` | `#A7F3D0` | Texte sur fond succès   |

---

## Sémantique — Avertissement

| Token            | Light OKLCH           | Light hex | Dark OKLCH            | Dark hex  | Usage                  |
| ---------------- | --------------------- | --------- | --------------------- | --------- | ---------------------- |
| `warning-base`   | `oklch(0.70 0.16 75)` | `#D97706` | `oklch(0.78 0.16 75)` | `#FBBF24` | Alertes, retards       |
| `warning-subtle` | `oklch(0.97 0.06 90)` | `#FEF3C7` | `oklch(0.30 0.08 75)` | `#451A03` | Fond banner warning    |
| `warning-text`   | `oklch(0.40 0.10 75)` | `#92400E` | `oklch(0.92 0.08 90)` | `#FDE68A` | Texte sur fond warning |

---

## Sémantique — Danger

| Token           | Light OKLCH           | Light hex | Dark OKLCH            | Dark hex  | Usage                            |
| --------------- | --------------------- | --------- | --------------------- | --------- | -------------------------------- |
| `danger-base`   | `oklch(0.58 0.22 25)` | `#DC2626` | `oklch(0.72 0.20 25)` | `#F87171` | Harnais KO, erreurs, suppression |
| `danger-subtle` | `oklch(0.96 0.05 25)` | `#FEE2E2` | `oklch(0.28 0.10 25)` | `#7F1D1D` | Fond badge erreur                |
| `danger-text`   | `oklch(0.35 0.16 25)` | `#991B1B` | `oklch(0.92 0.08 25)` | `#FECACA` | Texte sur fond erreur            |

---

## Sémantique — Information

| Token         | Light OKLCH            | Light hex | Dark OKLCH             | Dark hex  | Usage               |
| ------------- | ---------------------- | --------- | ---------------------- | --------- | ------------------- |
| `info-base`   | `oklch(0.68 0.13 235)` | `#0EA5E9` | `oklch(0.76 0.13 235)` | `#38BDF8` | Tips, info neutre   |
| `info-subtle` | `oklch(0.97 0.04 235)` | `#E0F2FE` | `oklch(0.28 0.08 235)` | `#0C4A6E` | Fond callout info   |
| `info-text`   | `oklch(0.38 0.10 235)` | `#0369A1` | `oklch(0.92 0.06 235)` | `#BAE6FD` | Texte sur fond info |

---

## Focus ring

| Token        | Light OKLCH            | Light hex | Dark OKLCH             | Dark hex  |
| ------------ | ---------------------- | --------- | ---------------------- | --------- |
| `focus-ring` | `oklch(0.65 0.20 264)` | `#6366F1` | `oklch(0.82 0.14 264)` | `#A5B4FC` |

Anneau de focus visible avec `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. Obligatoire sur tout élément focusable (`:focus-visible`).

---

## Couleurs d'illustration (gradient signature)

Gradient utilisé sur le hero de la landing et le logo principal :

```css
background: linear-gradient(135deg, oklch(0.62 0.2 264) 0%, oklch(0.5 0.24 270) 100%);
```

Hex équivalent : `linear-gradient(135deg, #6366F1 0%, #4338CA 100%)`.

---

## Couleurs Harnais (statuts)

Tokens dédiés au rapport du Harnais, pour la lisibilité immédiate :

| État               | Token sémantique    | Icône Tabler    |
| ------------------ | ------------------- | --------------- |
| Check OK           | `success-base`      | `check-circle`  |
| Check KO           | `danger-base`       | `x-circle`      |
| Check en cours     | `info-base` (animé) | `loader-2`      |
| Check skippé       | `text-subtle`       | `circle-dashed` |
| Override formateur | `warning-base`      | `shield-check`  |

---

## Suggestions d'usage

### Boutons

- **Primary** : `bg-accent-base text-accent-text` (hover : `bg-accent-hover`)
- **Secondary** : `bg-accent-subtle text-accent-base border border-transparent`
- **Ghost** : `text-text-base hover:bg-bg-muted`
- **Danger** : `bg-danger-base text-white hover:bg-danger-base/90`

### Cards

- `bg-bg-base border border-border-subtle shadow-sm` en light
- `bg-bg-subtle border border-border-subtle` en dark (pas d'ombre, juste l'outline)

### Badges

- Succès : `bg-success-subtle text-success-text`
- Warning : `bg-warning-subtle text-warning-text`
- Danger : `bg-danger-subtle text-danger-text`
- Info : `bg-info-subtle text-info-text`

### Liens

- `text-accent-base hover:text-accent-hover underline underline-offset-2`

---

## Configuration Tailwind 4 (CSS-first)

```css
/* assets/css/main.css */
@import 'tailwindcss';

@theme {
  /* Accent */
  --color-accent-base: oklch(0.55 0.22 264);
  --color-accent-hover: oklch(0.5 0.24 270);
  --color-accent-subtle: oklch(0.97 0.02 264);
  --color-accent-text: oklch(1 0 0);

  /* Surface */
  --color-bg-base: oklch(1 0 0);
  --color-bg-subtle: oklch(0.985 0 0);
  --color-bg-muted: oklch(0.97 0.003 268);
  --color-bg-emphasis: oklch(0.18 0.008 268);

  /* Texte */
  --color-text-base: oklch(0.18 0.008 268);
  --color-text-muted: oklch(0.42 0.012 268);
  --color-text-subtle: oklch(0.62 0.012 268);
  --color-text-inverse: oklch(0.985 0 0);

  /* Bordure */
  --color-border-subtle: oklch(0.93 0.004 268);
  --color-border-base: oklch(0.87 0.008 268);
  --color-border-strong: oklch(0.52 0.012 268);

  /* Sémantiques */
  --color-success-base: oklch(0.62 0.16 155);
  --color-success-subtle: oklch(0.96 0.05 155);
  --color-warning-base: oklch(0.7 0.16 75);
  --color-warning-subtle: oklch(0.97 0.06 90);
  --color-danger-base: oklch(0.58 0.22 25);
  --color-danger-subtle: oklch(0.96 0.05 25);
  --color-info-base: oklch(0.68 0.13 235);
  --color-info-subtle: oklch(0.97 0.04 235);

  /* Focus */
  --color-focus-ring: oklch(0.65 0.2 264);
}

@layer base {
  .dark {
    --color-accent-base: oklch(0.78 0.16 264);
    --color-accent-hover: oklch(0.85 0.13 264);
    --color-accent-subtle: oklch(0.28 0.1 268);
    --color-accent-text: oklch(0.15 0.01 268);

    --color-bg-base: oklch(0.15 0.005 268);
    --color-bg-subtle: oklch(0.19 0.008 268);
    --color-bg-muted: oklch(0.24 0.01 268);
    --color-bg-emphasis: oklch(0.985 0 0);

    --color-text-base: oklch(0.985 0 0);
    --color-text-muted: oklch(0.72 0.012 268);
    --color-text-subtle: oklch(0.52 0.012 268);
    --color-text-inverse: oklch(0.18 0.008 268);

    --color-border-subtle: oklch(0.24 0.01 268);
    --color-border-base: oklch(0.32 0.01 268);
    --color-border-strong: oklch(0.72 0.012 268);

    --color-success-base: oklch(0.72 0.16 155);
    --color-success-subtle: oklch(0.28 0.08 155);
    --color-warning-base: oklch(0.78 0.16 75);
    --color-warning-subtle: oklch(0.3 0.08 75);
    --color-danger-base: oklch(0.72 0.2 25);
    --color-danger-subtle: oklch(0.28 0.1 25);
    --color-info-base: oklch(0.76 0.13 235);
    --color-info-subtle: oklch(0.28 0.08 235);

    --color-focus-ring: oklch(0.82 0.14 264);
  }
}
```
