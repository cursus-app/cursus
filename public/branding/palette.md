# Palette de couleurs — Cursus

> **Palette définitive importée depuis Claude Design** (« Design system Cursus »,
> v0.1). La **source de vérité exécutable** est [`assets/css/main.css`](../../assets/css/main.css) ;
> la référence textuelle complète vit dans
> [`docs/design/claude-design-export/tokens.md`](../../docs/design/claude-design-export/tokens.md).
> Toutes les couleurs sont en **OKLCH** (espace perceptuellement uniforme, dark
> mode cohérent). L'OKLCH fait foi ; on ne maintient plus de fallback hex (utiliser
> un convertisseur si besoin pour un outil legacy).

## Principes

1. **Sémantique d'abord** : on nomme par le rôle (`--accent`, `--success-solid`), jamais par la teinte (`indigo-600`).
2. **3 couches** : primitifs → rôles (light/dark) → exposition Tailwind (`bg-surface`, `text-text-muted`…).
3. **Un seul accent** : l'indigo (« ça valide »). Le reste est neutre + sémantiques sobres.
4. **Contraste vérifié** : AA minimum, AAA sur écrans critiques (auth, certificat).
5. **Dark mode natif** : chaque rôle a sa déclinaison `.dark`.

---

## Accent — Indigo (teinte 264 constante)

| Rôle               | Light                                 | Dark                                  |
| ------------------ | ------------------------------------- | ------------------------------------- |
| `--accent`         | `oklch(0.550 0.220 264)` (indigo-600) | `oklch(0.605 0.205 264)` (indigo-500) |
| `--accent-hover`   | `oklch(0.488 0.198 264)` (indigo-700) | `oklch(0.685 0.170 264)` (indigo-400) |
| `--accent-subtle`  | `oklch(0.970 0.018 264)` (indigo-50)  | `oklch(0.300 0.090 264 / 0.35)`       |
| `--accent-border`  | `oklch(0.888 0.070 264)` (indigo-200) | `oklch(0.420 0.120 264)`              |
| `--accent-text`    | `oklch(0.488 0.198 264)` (indigo-700) | `oklch(0.812 0.112 264)` (indigo-300) |
| `--text-on-accent` | `oklch(1 0 268)`                      | `oklch(1 0 268)`                      |

---

## Surfaces

| Rôle           | Light                    | Dark                     |
| -------------- | ------------------------ | ------------------------ |
| `--bg-app`     | `oklch(0.990 0.003 268)` | `oklch(0.130 0.008 268)` |
| `--bg-surface` | `oklch(1 0 268)`         | `oklch(0.165 0.009 268)` |
| `--bg-subtle`  | `oklch(0.985 0.003 268)` | `oklch(0.190 0.009 268)` |
| `--bg-muted`   | `oklch(0.970 0.004 268)` | `oklch(0.230 0.010 268)` |
| `--bg-inset`   | `oklch(0.970 0.004 268)` | `oklch(0.150 0.010 268)` |

## Texte

| Rôle             | Light                    | Dark                     | Usage               |
| ---------------- | ------------------------ | ------------------------ | ------------------- |
| `--text-strong`  | `oklch(0.190 0.008 268)` | `oklch(0.975 0.004 268)` | titres              |
| `--text-default` | `oklch(0.270 0.008 268)` | `oklch(0.900 0.005 268)` | corps               |
| `--text-muted`   | `oklch(0.580 0.009 268)` | `oklch(0.660 0.009 268)` | secondaire          |
| `--text-subtle`  | `oklch(0.710 0.008 268)` | `oklch(0.500 0.009 268)` | hints, placeholders |

## Bordures

| Rôle               | Light                    | Dark                     |
| ------------------ | ------------------------ | ------------------------ |
| `--border-subtle`  | `oklch(0.930 0.005 268)` | `oklch(0.250 0.010 268)` |
| `--border-default` | `oklch(0.880 0.006 268)` | `oklch(0.310 0.011 268)` |
| `--border-strong`  | `oklch(0.710 0.008 268)` | `oklch(0.400 0.012 268)` |

---

## Sémantiques (sobres, désaturées — une teinte = un sens)

Chaque rôle expose `-bg` (fond léger), `-fg` (texte) et `-solid` (aplat).

| Rôle          | `-solid` (aplat)         | Teinte            | Usage                            |
| ------------- | ------------------------ | ----------------- | -------------------------------- |
| `--success-*` | `oklch(0.560 0.115 155)` | 155 (vert sauge)  | harnais OK, validations          |
| `--warning-*` | `oklch(0.700 0.135 75)`  | 75 (ambre)        | alertes, retards, override       |
| `--danger-*`  | `oklch(0.560 0.180 25)`  | 25 (rouge brique) | harnais KO, erreurs, suppression |
| `--info-*`    | `oklch(0.600 0.125 240)` | 240 (bleu calme)  | en cours, info neutre            |

Light : `-bg` = échelon `50`, `-fg` = échelon `700`, `-solid` = `600`.
Dark : `-bg` translucide (`/ 0.30`), `-fg` éclairci, `-solid` = échelon `500`.
Valeurs complètes : `tokens.md`.

## Focus ring

`--ring` : `oklch(0.605 0.205 264)` (light) · `oklch(0.685 0.170 264)` (dark).
Anneau visible obligatoire : `outline: 2px solid var(--ring); outline-offset: 2px`
sur tout `:focus-visible`.

---

## Gradient signature (logo, hero)

```css
background: linear-gradient(
  135deg,
  oklch(0.685 0.17 264) 0%,
  /* indigo-400 */ oklch(0.488 0.198 264) 100% /* indigo-700 */
);
```

## Couleurs Harnais (statuts)

| État               | Token sémantique       | Icône Tabler    |
| ------------------ | ---------------------- | --------------- |
| Check OK           | `--success-solid`      | `circle-check`  |
| Check KO           | `--danger-solid`       | `x-circle`      |
| Check en cours     | `--info-solid` (animé) | `loader-2`      |
| Check skippé       | `--text-subtle`        | `circle-dashed` |
| Override formateur | `--warning-solid`      | `shield-check`  |

---

## Migration depuis l'ancienne nomenclature

L'ancienne palette (`accent-base`, `bg-base`, `success-base`…) est remplacée par
les rôles du design system. Table de correspondance :

| Ancien (`--color-*`)        | Nouveau rôle                                                |
| --------------------------- | ----------------------------------------------------------- |
| `accent-base`               | `--accent`                                                  |
| `accent-hover`              | `--accent-hover`                                            |
| `accent-subtle`             | `--accent-subtle`                                           |
| `accent-text` (sur accent)  | `--text-on-accent`                                          |
| `bg-base`                   | `--bg-app` / `--bg-surface`                                 |
| `bg-subtle`                 | `--bg-subtle`                                               |
| `bg-muted`                  | `--bg-muted`                                                |
| `text-base`                 | `--text-strong` / `--text-default`                          |
| `text-muted`                | `--text-muted`                                              |
| `text-subtle`               | `--text-subtle`                                             |
| `border-subtle/base/strong` | `--border-subtle/default/strong`                            |
| `success-base`              | `--success-solid` (badge : `--success-bg` + `--success-fg`) |
| `warning-base`              | `--warning-solid`                                           |
| `danger-base`               | `--danger-solid`                                            |
| `info-base`                 | `--info-solid`                                              |

En Tailwind, ces rôles sont exposés via `@theme inline` : `bg-accent`,
`text-text-muted`, `bg-success-bg`, `text-danger-fg`, `border-border-subtle`, etc.
