# Design tokens — Cursus (référence textuelle)

> Version textuelle des tokens importés depuis Claude Design. **La source de
> vérité exécutable reste `assets/css/main.css`** (bloc `@theme` + `:root` +
> `.dark` + `@theme inline`). Ce document sert de référence lisible et de base de
> revue. Tout en **OKLCH** (natif Tailwind v4).

## Principe

Trois couches :

1. **Primitifs** — palettes brutes (`--color-indigo-600`…). Jamais consommés
   directement dans un composant.
2. **Sémantiques (rôles)** — alias de rôle (`--accent`, `--text-muted`,
   `--bg-surface`…) déclinés `light` (`:root`) et `dark` (`.dark`). **C'est ce
   qu'on consomme.**
3. **Exposition Tailwind** (`@theme inline`) — rend les rôles dispo en
   utilitaires : `bg-surface`, `text-text-muted`, `border-border-subtle`,
   `bg-accent`, `bg-success-bg`, `text-danger-fg`, `ring-ring`…

---

## 1 · Primitifs

### Accent — Indigo (teinte 264, signature « ça valide »)

| Token                | OKLCH                                  |
| -------------------- | -------------------------------------- |
| `--color-indigo-50`  | `oklch(0.970 0.018 264)`               |
| `--color-indigo-100` | `oklch(0.936 0.040 264)`               |
| `--color-indigo-200` | `oklch(0.888 0.070 264)`               |
| `--color-indigo-300` | `oklch(0.812 0.112 264)`               |
| `--color-indigo-400` | `oklch(0.685 0.170 264)`               |
| `--color-indigo-500` | `oklch(0.605 0.205 264)`               |
| `--color-indigo-600` | `oklch(0.550 0.220 264)` ← **PRIMARY** |
| `--color-indigo-700` | `oklch(0.488 0.198 264)`               |
| `--color-indigo-800` | `oklch(0.420 0.158 264)`               |
| `--color-indigo-900` | `oklch(0.368 0.120 264)`               |
| `--color-indigo-950` | `oklch(0.268 0.082 264)`               |

### Neutrals — warm-cool (teinte 268, chroma ≈ 0, jamais gris pur)

| Token                 | OKLCH                                   |
| --------------------- | --------------------------------------- |
| `--color-neutral-0`   | `oklch(1.000 0.000 268)`                |
| `--color-neutral-50`  | `oklch(0.985 0.003 268)`                |
| `--color-neutral-100` | `oklch(0.970 0.004 268)`                |
| `--color-neutral-200` | `oklch(0.930 0.005 268)`                |
| `--color-neutral-300` | `oklch(0.880 0.006 268)`                |
| `--color-neutral-400` | `oklch(0.710 0.008 268)`                |
| `--color-neutral-500` | `oklch(0.580 0.009 268)`                |
| `--color-neutral-600` | `oklch(0.480 0.009 268)`                |
| `--color-neutral-700` | `oklch(0.390 0.008 268)`                |
| `--color-neutral-800` | `oklch(0.270 0.008 268)`                |
| `--color-neutral-900` | `oklch(0.190 0.008 268)`                |
| `--color-neutral-950` | `oklch(0.130 0.008 268)` ← dark bg base |

### Sémantiques (désaturées ~10-15 %, une teinte = un sens)

| Rôle                  | `-600` (aplat)           | Teinte |
| --------------------- | ------------------------ | ------ |
| success (vert sauge)  | `oklch(0.560 0.115 155)` | 155    |
| warning (ambre)       | `oklch(0.700 0.135 75)`  | 75     |
| danger (rouge brique) | `oklch(0.560 0.180 25)`  | 25     |
| info (bleu calme)     | `oklch(0.600 0.125 240)` | 240    |

Échelons `50 / 100 / 500 / 600 / 700` définis pour chaque (cf. `main.css`).

---

## 2 · Sémantiques (rôles) — Light / Dark

### Surfaces

| Token          | Light                    | Dark                     |
| -------------- | ------------------------ | ------------------------ |
| `--bg-app`     | `oklch(0.990 0.003 268)` | `--color-neutral-950`    |
| `--bg-surface` | `--color-neutral-0`      | `oklch(0.165 0.009 268)` |
| `--bg-subtle`  | `--color-neutral-50`     | `oklch(0.190 0.009 268)` |
| `--bg-muted`   | `--color-neutral-100`    | `oklch(0.230 0.010 268)` |
| `--bg-inset`   | `--color-neutral-100`    | `oklch(0.150 0.010 268)` |
| `--bg-hover`   | `oklch(0.965 0.004 268)` | `oklch(0.215 0.010 268)` |
| `--bg-active`  | `oklch(0.945 0.005 268)` | `oklch(0.250 0.011 268)` |

### Bordures

| Token              | Light                 | Dark                     |
| ------------------ | --------------------- | ------------------------ |
| `--border-subtle`  | `--color-neutral-200` | `oklch(0.250 0.010 268)` |
| `--border-default` | `--color-neutral-300` | `oklch(0.310 0.011 268)` |
| `--border-strong`  | `--color-neutral-400` | `oklch(0.400 0.012 268)` |

### Texte

| Token              | Light                 | Dark                     | Usage               |
| ------------------ | --------------------- | ------------------------ | ------------------- |
| `--text-strong`    | `--color-neutral-900` | `oklch(0.975 0.004 268)` | titres              |
| `--text-default`   | `--color-neutral-800` | `oklch(0.900 0.005 268)` | corps               |
| `--text-muted`     | `--color-neutral-500` | `oklch(0.660 0.009 268)` | secondaire          |
| `--text-subtle`    | `--color-neutral-400` | `oklch(0.500 0.009 268)` | hints, placeholders |
| `--text-on-accent` | `--color-neutral-0`   | `--color-neutral-0`      | texte sur accent    |

### Accent / primary

| Token             | Light                | Dark                            |
| ----------------- | -------------------- | ------------------------------- |
| `--accent`        | `--color-indigo-600` | `--color-indigo-500`            |
| `--accent-hover`  | `--color-indigo-700` | `--color-indigo-400`            |
| `--accent-active` | `--color-indigo-800` | `--color-indigo-300`            |
| `--accent-subtle` | `--color-indigo-50`  | `oklch(0.300 0.090 264 / 0.35)` |
| `--accent-border` | `--color-indigo-200` | `oklch(0.420 0.120 264)`        |
| `--accent-text`   | `--color-indigo-700` | `--color-indigo-300`            |

### Statuts (`-bg` fond léger · `-fg` texte · `-solid` aplat)

| Rôle    | `-bg` light          | `-fg` light           | `-solid` light        |
| ------- | -------------------- | --------------------- | --------------------- |
| success | `--color-success-50` | `--color-success-700` | `--color-success-600` |
| warning | `--color-warning-50` | `--color-warning-700` | `--color-warning-600` |
| danger  | `--color-danger-50`  | `--color-danger-700`  | `--color-danger-600`  |
| info    | `--color-info-50`    | `--color-info-700`    | `--color-info-600`    |

En dark, `-bg` passe en teinte translucide (`/ 0.30`), `-fg` s'éclaircit, `-solid`
utilise l'échelon `-500`. Détail dans `main.css`.

### Focus & ombres

- `--ring` : `--color-indigo-500` (light) / `--color-indigo-400` (dark)
- `--shadow-xs|sm|md|lg` : ombres teintées cool (`oklch(0.13 0.02 268 / …)`), noires en dark
- `--shadow-focus` : `0 0 0 3px oklch(0.605 0.205 264 / 0.35)`

---

## 3 · Typographie

- **Familles** — `--font-sans: "Inter"` (UI) · `--font-mono: "JetBrains Mono"` (IDs/URLs/logs)
- **Poids** — 400 (corps) / 500 (labels) / 600 (titres, boutons) / 700 (H1-H2, chiffres)
- **Tracking** — `--tracking-tight: -0.014em` (titres) · `--tracking-wide: 0.02em` (labels uppercase)
- **Échelle** Major Third (1.25), bornée 12 → 36 :

| Token         | rem   | px  | line-height |
| ------------- | ----- | --- | ----------- |
| `--text-xs`   | 0.750 | 12  | 1rem        |
| `--text-sm`   | 0.875 | 14  | 1.25rem     |
| `--text-base` | 1.000 | 16  | 1.5rem      |
| `--text-lg`   | 1.125 | 18  | 1.75rem     |
| `--text-xl`   | 1.250 | 20  | 1.875rem    |
| `--text-2xl`  | 1.563 | 25  | 2rem        |
| `--text-3xl`  | 1.953 | 31  | 2.375rem    |
| `--text-4xl`  | 2.250 | 36  | 2.625rem    |

---

## 4 · Espacement, rayons

- **Espacement** — `--spacing: 0.25rem` (base 4 px ; Tailwind v4 multiplie : `p-4` = 1rem).
- **Rayons** — `sm 4` (inputs/badges) · `md 6` (boutons/champs) · `lg 8` (cards) · `xl 12` (modals) · `2xl 16` (feature cards) · `full 9999px`.

---

## 5 · Motion

| Token                | Valeur | Usage     |
| -------------------- | ------ | --------- |
| `--duration-instant` | 100ms  | hover     |
| `--duration-fast`    | 200ms  | toggle    |
| `--duration-base`    | 300ms  | composant |
| `--duration-slow`    | 500ms  | page      |

Easings : `--ease-out` (entrée, `cubic-bezier(0.16,1,0.3,1)`) · `--ease-in`
(sortie) · `--ease-inout`. **`prefers-reduced-motion` strict** : toute animation

> ~200ms est neutralisée (cf. `@layer base` de `main.css`).

---

## Consommation (rappel)

```vue
<!-- ✅ on consomme un rôle exposé en utilitaire -->
<div class="border border-border-subtle bg-surface text-text-default">…</div>
<UBadge class="bg-success-bg text-success-fg">Validé</UBadge>

<!-- ❌ jamais un primitif ni une valeur en dur -->
<div class="bg-[#4f46e5]">…</div>
<div class="bg-indigo-600">…</div>
```
