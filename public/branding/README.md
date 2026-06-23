# public/branding — Identité visuelle Cursus

> Tous les assets de marque (logos, favicon, palette, guidelines). Stockés dans `public/` pour pouvoir être servis directement par Nuxt en production.

---

## Fichiers

| Fichier                                        | Format             | Usage                                                                                                 |
| ---------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| [`logo-full.svg`](./logo-full.svg)             | SVG vectoriel      | Logo complet (icône + wordmark "Cursus"). Header de l'app, signatures email, README.                  |
| [`logo-icon.svg`](./logo-icon.svg)             | SVG carré 1:1      | Icône seule (sans wordmark). Avatars, app icons, favicons larges.                                     |
| [`logo-monochrome.svg`](./logo-monochrome.svg) | SVG `currentColor` | Variante monochrome qui hérite de la couleur du parent. Pour fonds colorés, impression noir et blanc. |
| [`favicon.svg`](./favicon.svg)                 | SVG 32×32          | Favicon avec `prefers-color-scheme` natif (s'adapte dark/light)                                       |
| [`palette.md`](./palette.md)                   | Markdown           | Palette de couleurs OKLCH + fallback hex + config Tailwind 4 prête à coller                           |
| [`brand-guidelines.md`](./brand-guidelines.md) | Markdown           | Guide marque : logo, espaces blancs, voix, ton, lexique                                               |

---

## Concept du logo

**Cercle de progression à ~75 % qui se referme avec une coche centrée.** Triple lecture :

1. Le **cycle d'apprentissage** par module hebdomadaire
2. La **validation par le harnais** (la coche = check passé)
3. L'**inachevé qui se complète** progressivement (chaque livrable ferme le cercle un peu plus)

**Gradient indigo signature** : `oklch(0.62 0.20 264) → oklch(0.50 0.24 270)` sur l'arc, coche en accent plein, ring de track subtil à 15-18% d'opacité.

---

## À ajouter plus tard (post-MVP)

| Asset                                  | Pourquoi                                 | Quand                                |
| -------------------------------------- | ---------------------------------------- | ------------------------------------ |
| `favicon.ico` (multi-tailles 16/32/48) | Compatibilité IE/anciens browsers        | Si stats analytics montrent users IE |
| `favicon-180.png` (Apple touch icon)   | iOS home screen install                  | Pré-lancement public                 |
| `og-image.png` (1200×630)              | Open Graph pour partages réseaux sociaux | Avant communication marketing        |
| `logo.png` (multi-tailles)             | Quand un client/partenaire demande PNG   | À la demande                         |
| Charte étendue (illustrations, motifs) | Quand le produit grandit                 | v1.x+                                |
| Versions traduites du logo             | Si i18n complète avec marché EN/ES/etc.  | v2+                                  |

---

## Utilisation dans l'app Nuxt

```vue
<!-- Composant Logo réutilisable -->
<template>
  <img
    :src="`/branding/${variant === 'icon' ? 'logo-icon' : variant === 'mono' ? 'logo-monochrome' : 'logo-full'}.svg`"
    :alt="`Cursus${variant === 'icon' ? ' icon' : ''}`"
    :width="width"
    :height="height"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'full' | 'icon' | 'mono';
    width?: number;
    height?: number;
  }>(),
  {
    variant: 'full',
    width: 120,
    height: 40,
  },
);
</script>
```

---

## Règles à respecter (résumé du brand-guidelines.md)

- ✅ Espace blanc minimal autour du logo : équivalent à 0.5× sa hauteur
- ✅ Taille minimum du wordmark : 14px (sinon utiliser `logo-icon.svg`)
- ❌ Ne pas étirer, rotater, déformer
- ❌ Ne pas appliquer de drop shadow ou outline custom
- ❌ Ne pas changer les couleurs du gradient (utiliser monochrome si besoin de couleur différente)
- ✅ Le wordmark peut s'omettre sur petits écrans (favicon, app icon)
