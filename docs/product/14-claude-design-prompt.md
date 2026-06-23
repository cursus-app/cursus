# 14 — Pipeline Claude Design → repo Cursus

> Comment générer le design system de Cursus avec **Claude Design** (`claude.ai/design`), l'intégrer dans le repo, et le rendre **obligatoire** pour toutes les implémentations futures (humains et agents).

---

## Pourquoi cette approche

Notre `10-design-system.md` décrit déjà les principes (sobriété, premium, motion intentionnel, AAA sur écrans critiques) et les composants nécessaires (~50 atomes/molécules/organismes). Claude Design va matérialiser tout ça en **tokens CSS + composants visuels** — bien plus rapide que de tout dessiner à la main dans Figma, et avec une cohérence garantie d'entrée.

Le résultat est ensuite **importé une fois pour toutes** dans le repo, et les agents Claude Code **n'ont plus le droit d'inventer** de couleurs, espacements ou variantes : ils consomment les tokens.

---

## ÉTAPE 1 — Le prompt à coller dans Claude Design

> Copie-colle le bloc ci-dessous, **tel quel**, dans `claude.ai/design`. Plus le brief est précis, plus l'output est utilisable.

```markdown
# Design system — Cursus

Je veux générer le design system complet d'une application web SaaS appelée
**Cursus**. Le design system sera consommé par une équipe d'agents IA qui
écriront du code Vue 3.5 + Nuxt 4 + Tailwind CSS 4 + @nuxt/ui v4 — il doit
donc s'exprimer en design tokens CSS variables et en composants atomiques.

---

## 1 · Le produit

Cursus est un **harnais de cadencement et de validation pratique pour stages
tech**. Concrètement :

- Un formateur encadre 5 à 20 stagiaires (dev web, cybersec, IA…) sur 8 à 12
  semaines, sans pouvoir les surveiller en permanence.
- Chaque semaine, le stagiaire produit un livrable (repo GitHub) que GitHub
  Actions valide automatiquement (la "moulinette" — inspirée École 42).
- En sortie : un portfolio public + un certificat PDF signé numériquement,
  vérifiable par un recruteur via QR code.

Anti-positionnement : ce **n'est pas** une plateforme de cours (style
Coursera), **pas** un Trello, **pas** un Slack. C'est un **outil de travail**,
dense d'information, professionnel, pensé pour être utilisé 1-2 h par jour.

## 2 · Audience

| Persona                 | Caractéristiques                                                      | Densité info |
| ----------------------- | --------------------------------------------------------------------- | ------------ |
| **Formateur** (admin)   | Ingénieur senior, 30-45 ans, dashboard cohorte, gère 10-20 stagiaires | Dense        |
| **Stagiaire**           | 18-25 ans, junior, suit son parcours hebdo                            | Moyenne      |
| **Co-formateur**        | Expert ponctuel sur 1-2 modules                                       | Moyenne      |
| **Recruteur** (externe) | Visite la page publique de vérification d'un certificat               | Aérée        |

## 3 · Voix et ton de la marque

- **Sobre, factuel, respectueux** : on parle à des adultes professionnels.
- **Tutoiement** par défaut dans l'app (proximité formation).
- **Vouvoiement** sur les pages publiques (portfolio, vérification certif).
- **Pas de jargon corporate** : "stagiaire" pas "apprenant", "livrable" pas
  "devoir", "harnais" pas "vérificateur automatisé".
- **Action verbs** sur les boutons : "Soumettre", "Inviter", "Valider".
- **Erreurs empathiques** : "Cette URL ne semble pas être un repo GitHub" et
  non "URL invalide".

## 4 · Esthétique cible

### Mood board (inspirations)

- **Linear.app** — sobriété maximale, hiérarchie typographique, Cmd+K natif,
  raccourcis clavier, palette monochrome avec un accent.
- **Vercel.com** — dashboards data-dense lisibles, dark mode parfait, motion
  subtile.
- **Stripe Dashboard** — densité d'information sans étouffement, monospace
  bien utilisé pour les IDs/URLs.
- **Cursor.com** — typographie soignée, accent indigo, sentiment "outil
  pro pour développeurs".
- **GitHub.com** — patterns familiers pour la cible (repos, PRs, branches).

### Anti-inspirations (à éviter explicitement)

- ❌ Bootstrap par défaut, Material Design générique, DaisyUI, NextUI gratuit.
- ❌ Style "SaaS B2C friendly" (Notion, Asana) — trop ludique, trop coloré.
- ❌ Glassmorphism excessif, néon, gradient flashy, ombres lourdes.
- ❌ Style "EdTech" (Duolingo, Khan Academy) — trop infantilisant.
- ❌ Icons remplis (filled) — uniquement outline (Tabler Icons).

### Palette signature

- **Couleur d'accent principale : indigo** `oklch(0.55 0.22 264)` (proche
  `#4f46e5` / Tailwind `indigo-600`). Cette couleur incarne la "validation",
  le "harnais qui valide", le "label de qualité".
- **Couleurs sémantiques sobres** : success vert sauge, warning ambre,
  danger rouge brique, info bleu calme. Toutes désaturées de ~10-15 %.
- **Neutrals** : grise très légèrement teintée indigo (warm-cool neutral),
  pas un gris pur.
- **Background** : blanc cassé en light (`oklch(0.99 0.003 268)`), noir bleu
  profond en dark (`oklch(0.13 0.008 268)`).

### Typographie

- **Sans-serif principale** : Inter Variable (déjà choisie). Échelle modulaire
  type 1.25 (Major Third), de 12 px à 36 px. Poids 400/500/600/700 seulement
  (pas de 300 light, pas de 800 black).
- **Monospace** : JetBrains Mono Variable pour les IDs, URLs, code, logs
  harnais.
- **Pas de serif** au MVP (peut être réintroduit en v1.x pour le certificat
  PDF dans un esprit "diplôme").

### Motion et micro-interactions

- **Durées** : instant 100 ms (hover), fast 200 ms (toggle), base 300 ms
  (composant), slow 500 ms (transition de page).
- **Easings** : `ease-out` à l'entrée, `ease-in` à la sortie. Pas de bounce
  exagéré, pas de spring élastique.
- **Respect `prefers-reduced-motion`** strict.
- **Micro-interactions signature** :
  - Validation d'un livrable : sparkle + bounce léger du badge XP qui s'ajoute.
  - Déblocage badge : card qui flip avec révélation, son optionnel (off).
  - Bouton "Je suis bloqué" : toast positif, **jamais** négatif.

## 5 · Contraintes techniques

Le système doit produire des **tokens CSS variables** parfaitement compatibles
avec Tailwind CSS v4 (config CSS-first via `@theme`), à intégrer dans
`assets/css/main.css`. Format attendu pour les couleurs : **OKLCH** (Tailwind
v4 natif).

Le système doit aussi décliner les composants pour le mode **clair ET sombre**,
les deux étant production-ready (pas un dark mode bâclé).

## 6 · Composants à générer (priorité 1, MVP)

### Atomes

- Button (primary, secondary, ghost, danger ; sizes sm/md/lg ; loading state)
- Input (text, email, password, search ; avec icône préfixe optionnelle)
- Textarea
- Select (avec recherche)
- Checkbox, Radio, Switch
- Badge (default, success, warning, danger, info ; avec icône optionnelle)
- Avatar (xs/sm/md/lg/xl ; avec fallback initiales en gradient)
- Skeleton (loading placeholder)
- Tooltip
- Tag (cliquable, fermable)
- Kbd (raccourci clavier, ex. Cmd+K)

### Molécules

- FormField (label + input + erreur + helper)
- Card (header / body / footer)
- Alert (inline, dismissible)
- Toast (éphémère, 4 variantes)
- EmptyState (illustration sobre + titre + description + CTA)
- ProgressBar (linear + circular)
- Stepper (multi-step)
- DataTable (tri, filtre, pagination, sticky header)
- SearchInput (avec Cmd+K hint)

### Organismes critiques

- **CommandPalette** (Cmd+K, fuzzy search, sections, actions)
- **CohorteHeatmap** : tableau stagiaires (lignes) × semaines (colonnes),
  cellules colorées par statut (validé vert, en cours bleu, alerte orange,
  retard rouge), virtualization si > 20 lignes
- **HarnessReport** : carte par check, statut emoji ✅/❌/⚠️, message
  humain, accordion "voir le log brut"
- **ModuleCard** : vue stagiaire d'un module hebdo
- **NavBar** + **SideBar** par rôle (formateur dense, stagiaire aéré)
- **NotificationCenter** : panneau dropdown depuis cloche header

## 7 · États obligatoires par composant

Tout composant complexe doit décliner ces 5 états :

1. **Default** (happy path)
2. **Loading** (skeleton, jamais spinner global)
3. **Empty** (illustration + texte empathique + CTA)
4. **Error** (message clair + bouton réessayer)
5. **Partial** (chargé partiellement, indicateurs)

## 8 · Accessibilité

- WCAG 2.1 **AA partout**.
- WCAG 2.1 **AAA sur les écrans critiques** : login/signup, soumission de
  livrable, capstone, page publique de vérification du certificat.
- Focus visible obligatoire (outline ou ring custom, jamais `outline:none`).
- Touch targets ≥ 44 × 44 px.
- Contraste min 4.5:1 (AA texte normal), 3:1 (AA texte large), 7:1 (AAA).

## 9 · Output attendu

1. **Tokens CSS variables** dans un bloc `@theme` Tailwind v4, prêts à coller
   dans `assets/css/main.css`. Pour chaque token : light + dark.
2. **Composants** sous forme HTML/CSS minimal réutilisable (utilisables comme
   référence pour des Vue components qui wrappent les composants @nuxt/ui v4).
3. **Documentation visuelle** de chaque composant avec ses variants et états.
4. **Système d'icônes** : liste des icônes Tabler à utiliser pour chaque
   action récurrente (search, save, delete, edit, github, harness, alert…).
5. **Patterns d'usage** : 3-4 maquettes-clés montrant comment les composants
   se combinent (dashboard formateur, page semaine stagiaire, page publique
   vérification certificat, modal soumission livrable).

## 10 · Rendu de référence (1 phrase)

> Quand on regarde Cursus, on doit penser : "ça ressemble à ce que Linear
> ferait si Linear était un outil de pédagogie, pensé par des ingénieurs pour
> des ingénieurs."

Vas-y. Commence par me proposer la palette OKLCH (light + dark) avec
justifications, puis enchaîne par la typographie, les espacements, puis les
atomes par ordre de criticité.
```

---

## ÉTAPE 2 — Comment itérer dans Claude Design

Claude Design est conversationnel — tu peux affiner après le premier output.

### Itérations recommandées (dans l'ordre)

1. **Palette d'abord** (sans rien d'autre). Si l'indigo proposé n'est pas
   assez "validation/qualité" ou trop "tech bro", demande : "Décale l'accent
   de 5° vers le violet et désature de 5 % en dark mode."
2. **Typographie** : si Inter est trop "neutre", essaie : "Remplace Inter par
   Geist Sans pour un sentiment plus contemporain" (Vercel utilise Geist).
   Garder JetBrains Mono pour le mono.
3. **Composants atomiques un par un** : "Génère Button avec ses 4 variants et
   3 tailles, montre l'état hover/focus/disabled/loading sur chaque cellule
   de la matrice."
4. **Composants critiques métier** : "Génère le CohorteHeatmap avec 8
   stagiaires × 10 semaines, mélange réaliste de statuts."
5. **Maquettes-clés** : 3 écrans représentatifs pour valider la cohérence
   globale.

### Pièges à signaler à Claude Design pour corriger

- "Trop de couleurs primaires distinctes — réduis à 1 accent + 4 sémantiques."
- "Les ombres sont trop lourdes — `box-shadow` à au plus `0 10px 15px -3px
rgba(0,0,0,.08)`."
- "Le dark mode utilise du gris pur — réinjecte une légère teinte bleue
  (chroma 0.008 à 0.012 sur 268°)."
- "Les coins sont trop arrondis (style 2018) — descends à 8 px de radius par
  défaut."

### Quand tu es satisfait

Demande explicitement :

```
Exporte la palette complète en variables CSS dans un bloc @theme Tailwind v4,
en utilisant le format OKLCH. Exporte aussi les espacements, radius, shadows,
typographie, durations et z-index sous forme de variables. Format final prêt
à coller dans assets/css/main.css.
```

---

## ÉTAPE 3 — Intégration dans le repo

### 3.1 — Coller les tokens dans `assets/css/main.css`

Remplace le contenu actuel par l'export Claude Design, en gardant l'import
Tailwind :

```css
@import 'tailwindcss';

@theme {
  /* Ici les tokens générés par Claude Design — couleurs, typo, radius… */
}

@layer base {
  /* Reset éventuel + body styles */
}
```

### 3.2 — Sauvegarder le rendu visuel

Crée un dossier `docs/design/claude-design-export/` et dépose-y :

- `tokens.md` — l'export texte complet (référence)
- `palette-light.png` + `palette-dark.png` — captures des deux palettes
- `components-overview.png` — la maquette overview de tous les composants
- `mockups/` — les 3-4 maquettes-clés

Ces captures servent de **référence visuelle obligatoire** lors des reviews.

### 3.3 — Mettre à jour `docs/product/10-design-system.md`

Section à ajouter en haut du fichier :

```markdown
## Source de vérité

**La source de vérité visuelle de Cursus est l'export Claude Design** stocké
dans `docs/design/claude-design-export/`. Ce document (10-design-system.md)
décrit les **principes** ; l'export Claude Design fournit les **tokens** et
les **rendus de référence**.

Hiérarchie en cas de conflit :

1. Tokens dans `assets/css/main.css` (consommés au runtime — autoritaires)
2. Captures dans `docs/design/claude-design-export/*.png`
3. Ce document (principes)

Toute proposition qui diverge des tokens ou des captures doit passer par une
PR explicite avec justification.
```

### 3.4 — Re-générer les tokens dans tous les fichiers impactés

Le rendu Claude Design va certainement différer légèrement des couleurs
initialement déclarées. Donc à harmoniser :

- `public/branding/palette.md` → re-régénérer depuis le nouvel export
- `public/branding/logo-full.svg` et autres → adapter le gradient si la
  couleur d'accent a bougé
- `public/landing/index.html` → re-coller la palette dans le `<style>`

---

## ÉTAPE 4 — Forcer l'usage du DS par les agents

Sans contraintes, un agent Claude Code va inventer des couleurs et des
espacements. Mécanismes pour l'empêcher :

### 4.1 — Mettre à jour `CLAUDE.md` (déjà chargé par défaut)

Ajouter en début de la section "Conventions strictes → UI" :

```markdown
### Design system — RÈGLE NON NÉGOCIABLE

La source de vérité visuelle est **`assets/css/main.css`** (tokens) +
`docs/design/claude-design-export/` (captures).

INTERDIT formellement :

- Hex code en dur (`#fff`, `#4f46e5`, etc.) — utiliser les CSS variables
- Tailwind utilities sur les couleurs primitives (`bg-indigo-500`, `text-red-600`) —
  utiliser les utilities sémantiques (`bg-accent`, `text-danger`)
- Espacements arbitraires (`p-[17px]`, `mt-[23px]`) — utiliser l'échelle
  Tailwind (`p-4`, `mt-6`)
- Radius arbitraires (`rounded-[10px]`) — utiliser `rounded-md`/`rounded-lg`
- Shadows custom — utiliser les classes utilitaires définies

En cas de doute, regarder l'export Claude Design dans
`docs/design/claude-design-export/`.
```

### 4.2 — Mettre à jour les sub-agents

Dans `.claude/agents/code-writer.md` et `.claude/agents/code-reviewer.md`,
ajouter :

```markdown
## Design system

Avant d'écrire toute UI, RELIRE :

1. Les tokens dans `assets/css/main.css`
2. Les captures dans `docs/design/claude-design-export/`
3. Le doc principes `docs/product/10-design-system.md`

Tout PR avec couleur hex hardcodée ou utility primitive Tailwind sera
rejetée par code-reviewer.
```

### 4.3 — Lint rule custom dans ESLint

Ajouter dans `eslint.config.js` une règle qui rejette les hex codes dans les
fichiers Vue/TS :

```javascript
{
  rules: {
    'no-hardcoded-colors': {
      // Voir docs/runbooks/eslint-rules.md pour l'implémentation
    },
  },
}
```

(À implémenter en story dédiée : créer la règle, l'activer en `warn`, puis
`error` après stabilisation.)

### 4.4 — Storybook obligatoire pour chaque atome/molécule

Stratégie : tout composant `app/components/atoms/*` et `app/components/molecules/*`
doit avoir un fichier `<Component>.stories.ts` couvrant ses variants et états.
La CI Storybook + Chromatic snapshot bloquera les régressions visuelles.

Voir ST-16.10 (Storybook + Chromatic) dans le backlog — Sprint 4-5.

---

## ÉTAPE 5 — Workflow pour ajouter un nouveau composant après MVP

Quand tu veux un nouveau composant qui n'existe pas dans Claude Design :

1. Ouvre une conversation Claude Design en **mode itératif** sur le DS existant
2. Donne le contexte : "Voici les tokens actuels du système (paste le bloc
   @theme), génère-moi un composant XYZ qui les respecte exactement."
3. Récupère le composant produit
4. Ajoute-le au `docs/design/claude-design-export/components/` du repo
5. Ouvre une PR avec :
   - Le composant Vue dans `app/components/`
   - La story Storybook
   - Le snapshot Chromatic
6. Code-reviewer valide la cohérence avec les tokens existants

---

## ⚓ Référence : design system généré et sauvegardé

Le brief ci-dessus **a déjà été utilisé** pour générer un design system dans
Claude Design. Les références (URL projet, nom du fichier, workflow d'import
via MCP `claude_design`) sont sauvegardées dans **`15-design-system-import.md`**.

L'import n'est pas fait maintenant — on attendra le sprint 1-4 (story
ST-18.1) pour intégrer les tokens dans `assets/css/main.css`.

---

## Checklist finale

- [ ] Prompt collé dans Claude Design
- [ ] Palette + typographie + atomes générés
- [ ] Maquettes-clés validées (3-4 écrans)
- [ ] Export tokens en OKLCH dans `assets/css/main.css`
- [ ] Captures déposées dans `docs/design/claude-design-export/`
- [ ] `CLAUDE.md` mis à jour avec la règle non-négociable
- [ ] Sub-agents `code-writer` et `code-reviewer` mis à jour
- [ ] Section "Source de vérité" ajoutée à `10-design-system.md`
- [ ] Palette logo SVG harmonisée avec le nouvel accent
- [ ] Landing page harmonisée avec le nouvel accent

Quand toutes les cases sont cochées, le design system est officiellement
adopté et tout code futur doit le respecter.
