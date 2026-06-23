# Brand guidelines — Cursus

> Mini-guide de marque pour Cursus. À jour pour la version 1.0 de l'identité visuelle (juin 2026).

---

## 1. La marque en une phrase

> **Cursus est un harnais de cadencement et de validation pratique pour stages tech.**

Inspiré de l'École 42 (moulinette), d'Epitech (portfolio cumulatif) et de Linear (sobriété d'interface). On ne raconte pas, **on montre**.

---

## 2. Logo

### 2.1 Concept

L'icône est un **cercle de progression incomplet** (~75%) accompagné d'une **coche de validation** centrée. Elle évoque :

- Le **cycle d'apprentissage** par module (progression visible)
- La **validation pratique** par le harnais (la coche)
- L'**inachevé** qui se complète, métaphore du parcours

### 2.2 Variantes disponibles

| Fichier               | Usage                                                            |
| --------------------- | ---------------------------------------------------------------- |
| `logo-full.svg`       | Logo complet (icône + wordmark), usage standard horizontal       |
| `logo-icon.svg`       | Icône seule, ratio 1:1 — favicons, app icons, avatars            |
| `logo-monochrome.svg` | Variante `currentColor` — print noir/blanc, fond coloré, overlay |
| `favicon.svg`         | Favicon adaptatif (dark mode auto via `prefers-color-scheme`)    |

### 2.3 Espace blanc minimum

Conserver autour du logo un espace blanc **au moins équivalent à la hauteur du `C` du wordmark** (ou 1/4 de la hauteur totale du logo).

### 2.4 Taille minimale

- Logo complet : **120 px de large** minimum
- Icône seule : **24 px** minimum (favicon : 16 px)
- En dessous, préférer l'icône seule à un logo complet illisible

### 2.5 Ce qu'on **ne fait pas**

- Pas d'effets (ombre portée, glow, biseau, 3D)
- Pas de rotation
- Pas de déformation (jamais d'étirement non proportionnel)
- Pas de changement de couleur arbitraire (utiliser uniquement les variantes officielles)
- Pas d'ajout d'éléments accolés (slogans, ornements)
- Pas de placement sur un fond qui ne respecte pas le contraste WCAG AA (4.5:1 minimum)

---

## 3. Couleurs

Détail complet dans `palette.md`. Résumé :

### 3.1 Couleurs principales

- **Accent (indigo)** : `oklch(0.55 0.22 264)` ≈ `#4F46E5` — boutons primaires, liens, focus
- **Texte** : `oklch(0.18 0.008 268)` ≈ `#18181B` sur fond clair
- **Fond** : `oklch(1 0 0)` (blanc pur) en light, `oklch(0.15 0.005 268)` ≈ `#09090B` en dark

### 3.2 Ratios de contraste

- **Texte body sur bg base** : 16:1 (AAA ✅)
- **Texte muted sur bg base** : 7:1 (AAA ✅)
- **Accent sur bg base** : 4.8:1 (AA ✅)
- **Bouton accent (texte blanc / fond indigo)** : 5.1:1 (AA ✅)

Tout texte d'interface doit atteindre AA minimum, AAA sur écrans critiques (auth, capstone, vérification certif).

### 3.3 Gradient signature

```css
linear-gradient(135deg, oklch(0.62 0.20 264) 0%, oklch(0.50 0.24 270) 100%)
```

À utiliser **avec parcimonie** : hero de la landing, arc de progression du logo, illustration d'un état "premium" (badge débloqué, capstone validé). **Pas** dans l'UI quotidienne.

---

## 4. Typographie

### 4.1 Familles

- **Sans-serif (UI, body, titres)** : **Inter Variable** — fallback système : `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Monospace (code, métadonnées techniques)** : **JetBrains Mono** — fallback : `'Menlo', 'Consolas', monospace`

### 4.2 Poids autorisés

- 400 (regular) — body
- 500 (medium) — labels, UI dense
- 600 (semibold) — boutons, titres de section, wordmark logo
- 700 (bold) — titres de page, hero

**Bannis** : 100, 200, 300 (trop fin sur dark mode), 800, 900 (trop gras pour l'esthétique sobre).

### 4.3 Échelle modulaire

Ratio **1.25 (major third)**. Tokens : `text-xs` à `text-4xl`. Voir `10-design-system.md` §1.2.

### 4.4 Letter-spacing

- Titres ≥ `text-2xl` : `letter-spacing: -0.02em` (légèrement resserré)
- Body : `letter-spacing: 0` (par défaut)
- Caps / labels en majuscules : `letter-spacing: 0.05em`

---

## 5. Iconographie

- **Lib unique** : **Tabler Icons** (outline, 5800+ icônes, open-source)
- Sizes standards : 16, 20, 24 px
- Stroke : 2 (defaults Tabler)
- Couleur : `currentColor` — héritée du parent
- **Pas d'emoji** dans l'UI sauf intention pédagogique explicite (feed cohorte chaleureux)

---

## 6. Voix et ton

### 6.1 Voix (constante)

- **Sobre, factuel, sans superlatif gratuit**
- **Tutoiement** dans l'app (proximité formation)
- **Vouvoiement** sur les pages publiques (portfolio, vérification certif, landing) — c'est un contexte externe
- **Phrases courtes**, voix active
- **Pas de jargon** technique côté utilisateur final (sauf sur rapport harnais)
- **Pas de "nous"** dans les messages d'erreur ("Cette URL ne semble pas être un repo GitHub", pas "Nous n'avons pas pu valider votre URL")

### 6.2 Ton (variable selon contexte)

| Contexte                             | Ton                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| Onboarding stagiaire                 | Accueillant, légèrement énergique                                                  |
| Validation d'un livrable (milestone) | Encourageant ("Bien joué, ton livrable est validé !")                              |
| Échec harnais                        | Empathique, factuel ("Cette vérification n'est pas passée. Voici pourquoi.")       |
| Erreur 500                           | Honnête, accessible ("Quelque chose s'est mal passé. On a une trace, on regarde.") |
| Confirmation administrative          | Neutre, professionnel                                                              |
| Pages publiques                      | Vouvoiement, ton institutionnel sobre                                              |
| Documentation                        | Pédagogique, exemples concrets                                                     |

### 6.3 Mots à privilégier vs éviter

| Préférer                                                   | Éviter                          |
| ---------------------------------------------------------- | ------------------------------- |
| Livrable                                                   | Devoir, exercice                |
| Harnais (en interne), validation automatique (côté public) | Auto-correction, robot          |
| Cursus, parcours                                           | Formation (trop scolaire)       |
| Stagiaire                                                  | Apprenant (trop institutionnel) |
| Formateur                                                  | Prof, enseignant                |
| Cohorte                                                    | Promo, classe                   |
| Capstone                                                   | Projet final (un peu plat)      |
| Soutenance                                                 | Présentation, oral              |
| Soumettre un livrable                                      | Envoyer un devoir               |

---

## 7. Photographie et illustration

### 7.1 Photo

**Pas de stock photos** dans le produit ou la landing au MVP. Si besoin de visuels :

- Captures d'écran réelles du produit (à privilégier)
- Schémas et illustrations vectorielles

### 7.2 Illustrations

- Style **SVG monochrome** avec accent indigo
- Sobres, géométriques, pas de personnages cartoon
- Kit recommandé : **unDraw** ou **Storyset** customisés avec la couleur accent
- Pas d'illustration custom au MVP (coût)

---

## 8. Motion

Voir `10-design-system.md` §4. Principes :

- **Mouvement intentionnel** : explique, n'impressionne pas
- Durées : 100 ms (instant), 200 ms (fast), 300 ms (base), 500 ms (slow)
- Easing : `ease-out` pour entrées, `ease-in` pour sorties, **pas de linear** (sauf chargement)
- **Respect de `prefers-reduced-motion`** sur toute animation > 200 ms

---

## 9. Cas d'usage spécifiques

### 9.1 Email signatures

```
Prénom Nom — Cursus
[Email] · [Téléphone]
cursus.app
```

Pas d'image dans la signature (mauvaise compatibilité, considéré spam-y par certains MX).

### 9.2 Réseaux sociaux

- **Avatar** : `logo-icon.svg` rendu en 400x400 PNG
- **Bannière** : gradient signature + wordmark blanc, 1500x500
- **Tone** : sobre, factuel, partage de jalons produit. Pas de hype, pas d'émoji décoratif.

### 9.3 Documentation publique

- Style : pédagogique avec exemples concrets
- Schémas générés via Mermaid (cohérence visuelle)
- Captures d'écran avec annotations sobres (rectangle accent indigo, pas de flèches rouges criardes)

### 9.4 Certificat

Le certificat numérique doit respecter :

- Logo `logo-full.svg` en haut à gauche
- Nom du stagiaire en `text-3xl` semibold
- Compétences attestées en liste à puces sobre
- Signature cryptographique en mono `text-xs` en pied
- Couleurs : fond `bg-base`, accent uniquement pour le sceau de validation
- Format A4 paysage, exportable en PDF

---

## 10. Évolutions prévues

- Personnalisation du logo par cohorte (post-MVP)
- Set d'illustrations signature commissionnées (post-MVP)
- Variante "celebration" du logo pour les milestones importants (capstone validé, certificat émis)
- Système de templates pour les publications réseaux sociaux (annonce promo, certificat délivré, jalon cohorte)
