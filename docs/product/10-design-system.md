# 10 — Design System premium

> Référence visuelle et d'interaction pour Cursus. Ce document précède le code Figma/Storybook et sera mis à jour au fur et à mesure de la conception.

---

## 0. Principes directeurs

1. **Sobriété fonctionnelle.** Pas de superflu décoratif. Chaque élément doit servir une intention de l'utilisateur.
2. **Hiérarchie claire.** Un seul point focal par écran. Le reste se range derrière.
3. **Densité maîtrisée.** Adaptée à chaque rôle : dense pour le formateur (vue cohorte), aéré pour le stagiaire (un livrable à la fois).
4. **Mouvement intentionnel.** Les transitions servent à expliquer, jamais à impressionner. Respect de `prefers-reduced-motion`.
5. **Cohérence avant créativité.** Mieux vaut un système prévisible qu'un coup brillant isolé.
6. **Accessibilité par défaut.** Tout composant naît accessible — keyboard, focus visible, ARIA, contraste.

---

## 1. Design tokens

Tokens centralisés dans `assets/css/tokens.css` et exposés en variables CSS. Tailwind config étendu pour les consommer.

### 1.1 Couleurs — système sémantique d'abord

On évite de nommer les couleurs par leur teinte (« blue-500 »). On les nomme par leur **rôle**.

```css
/* assets/css/tokens.css */
:root {
  /* Surface */
  --color-bg-base: 255 255 255;
  --color-bg-subtle: 250 250 250;
  --color-bg-muted: 244 244 245;
  --color-bg-emphasis: 24 24 27;

  /* Texte */
  --color-text-base: 24 24 27;
  --color-text-muted: 82 82 91;
  --color-text-subtle: 161 161 170;
  --color-text-inverse: 250 250 250;

  /* Bordure */
  --color-border-subtle: 228 228 231;
  --color-border-base: 212 212 216;
  --color-border-strong: 113 113 122;

  /* Accent (interactif principal) */
  --color-accent-base: 79 70 229; /* indigo-600 */
  --color-accent-hover: 67 56 202; /* indigo-700 */
  --color-accent-subtle: 238 242 255; /* indigo-50 */
  --color-accent-text: 255 255 255;

  /* Sémantiques */
  --color-success-base: 5 150 105;
  --color-success-subtle: 209 250 229;
  --color-warning-base: 217 119 6;
  --color-warning-subtle: 254 243 199;
  --color-danger-base: 220 38 38;
  --color-danger-subtle: 254 226 226;
  --color-info-base: 14 165 233;
  --color-info-subtle: 224 242 254;

  /* Focus ring */
  --color-focus-ring: 99 102 241;
}

.dark {
  --color-bg-base: 9 9 11;
  --color-bg-subtle: 24 24 27;
  --color-bg-muted: 39 39 42;
  --color-bg-emphasis: 250 250 250;

  --color-text-base: 250 250 250;
  --color-text-muted: 161 161 170;
  --color-text-subtle: 113 113 122;
  --color-text-inverse: 24 24 27;

  --color-border-subtle: 39 39 42;
  --color-border-base: 63 63 70;
  --color-border-strong: 161 161 170;

  --color-accent-base: 129 140 248;
  --color-accent-hover: 165 180 252;
  --color-accent-subtle: 30 27 75;
  --color-accent-text: 9 9 11;

  /* ...sémantiques dark mode... */
}
```

**Contraste vérifié** :

- Texte base sur bg base : 16:1 (AA AAA passes)
- Texte muted sur bg base : 7:1 (AAA passes)
- Accent sur bg base : 4.8:1 (AA passes)

### 1.2 Typographie

**Font family** :

- Texte courant : Inter (variable font) ou alternative système (`-apple-system, BlinkMacSystemFont, Segoe UI, ...`)
- Monospace : JetBrains Mono ou IBM Plex Mono pour les blocs de code

**Échelle modulaire (1.25 — major third)** :

| Token       | Taille | Line height | Usage                |
| ----------- | ------ | ----------- | -------------------- |
| `text-xs`   | 12 px  | 16 px       | Métadonnées, labels  |
| `text-sm`   | 14 px  | 20 px       | UI dense, secondaire |
| `text-base` | 16 px  | 24 px       | Corps de texte       |
| `text-lg`   | 18 px  | 28 px       | Sous-titres          |
| `text-xl`   | 20 px  | 28 px       | Titres de section    |
| `text-2xl`  | 24 px  | 32 px       | Titres de page       |
| `text-3xl`  | 30 px  | 36 px       | Pages d'accueil      |
| `text-4xl`  | 36 px  | 40 px       | Hero                 |

**Poids autorisés** : 400 (regular), 500 (medium), 600 (semibold), 700 (bold). Pas de 300 ni 900.

### 1.3 Espacements

Système 4-point (rem-based). Aucun pixel "magique".

| Token      | Valeur          |
| ---------- | --------------- |
| `space-1`  | 0.25rem (4 px)  |
| `space-2`  | 0.5rem (8 px)   |
| `space-3`  | 0.75rem (12 px) |
| `space-4`  | 1rem (16 px)    |
| `space-6`  | 1.5rem (24 px)  |
| `space-8`  | 2rem (32 px)    |
| `space-12` | 3rem (48 px)    |
| `space-16` | 4rem (64 px)    |
| `space-24` | 6rem (96 px)    |

### 1.4 Border radius

| Token         | Valeur  | Usage          |
| ------------- | ------- | -------------- |
| `radius-sm`   | 4 px    | Inputs, tags   |
| `radius-md`   | 8 px    | Boutons, cards |
| `radius-lg`   | 12 px   | Modals, panels |
| `radius-full` | 9999 px | Avatars, pills |

### 1.5 Ombres

Très discrètes. On évite les "drop shadows" lourdes.

| Token       | Valeur                                                                | Usage         |
| ----------- | --------------------------------------------------------------------- | ------------- |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)`                                          | Boutons hover |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)`    | Cards         |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.04)`  | Popovers      |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)` | Modals        |

En dark mode, ombres remplacées par un `outline` ou `ring` léger sur la bordure.

### 1.6 Z-index

Échelle explicite, pas de magic numbers.

| Token        | Valeur | Usage |
| ------------ | ------ | ----- |
| `z-dropdown` | 10     |
| `z-sticky`   | 20     |
| `z-fixed`    | 30     |
| `z-overlay`  | 40     |
| `z-modal`    | 50     |
| `z-popover`  | 60     |
| `z-toast`    | 70     |
| `z-tooltip`  | 80     |

---

## 2. Composants

### 2.1 Atomes

À implémenter dans `components/atoms/` :

- `Button` — variants : primary, secondary, ghost, danger ; sizes : sm, md, lg
- `Input` — text, email, password, number, search
- `Textarea`
- `Select`
- `Checkbox`, `Radio`, `Switch`
- `Badge` — variants : default, success, warning, danger, info
- `Avatar` — sizes : xs, sm, md, lg, xl
- `Icon` — wrapper Tabler Icons
- `Spinner`
- `Skeleton` — loading state placeholder
- `Tooltip`
- `Tag` — proche du Badge mais cliquable et fermable

### 2.2 Molécules

`components/molecules/` :

- `FormField` (label + input + erreur + helper)
- `Card` (container + header + body + footer)
- `Alert` (notif inline, dismissible)
- `Banner` (notif top de page)
- `Toast` (notif éphémère)
- `EmptyState` — illustration + titre + description + CTA
- `ProgressBar` (linear et circular)
- `Stepper` (multi-step forms / onboarding)
- `DataTable` (tri, filtre, pagination)
- `SearchInput` (avec Cmd+K hint)
- `DateRangePicker`

### 2.3 Organismes

`components/organisms/` :

- `NavBar`
- `SideBar` (formateur)
- `CommandPalette` (Cmd+K global)
- `HarnessReport` (carte par check, états)
- `ModuleCard` (vue stagiaire)
- `CohorteTable` (dashboard formateur)
- `NotificationCenter`
- `ProfileHeader` (portfolio public)

### 2.4 Templates (layouts)

- `layouts/stagiaire.vue`
- `layouts/formateur.vue`
- `layouts/public.vue` (portfolio, vérification certif)
- `layouts/auth.vue` (login, signup, magic link)

---

## 3. États (states) à concevoir pour chaque écran

Tout écran complexe doit traiter ces 5 états explicitement, pas juste le happy path :

1. **Loading** (skeleton, jamais un spinner global)
2. **Empty** (illustration + texte + CTA)
3. **Error** (message clair + bouton réessayer + lien support)
4. **Partial** (chargé partiellement, indicateurs de ce qui charge encore)
5. **Default** (le happy path)

**Anti-pattern** : un loading state qui ressemble à l'écran vide. **Solution** : `Skeleton` avec la structure attendue.

### 3.1 Empty states — règle

- Pas de "Vous n'avez rien." sec et froid.
- Illustration légère (SVG sobre, pas de dessin pataud)
- Message à la 2ᵉ personne : "Tu n'as pas encore soumis de livrable."
- CTA clair pour sortir de l'état vide
- Aide contextuelle (lien vers la doc) si pertinent

### 3.2 Error states — règle

- Format : « Quelque chose s'est mal passé. <Phrase humaine expliquant.> » + bouton "Réessayer"
- Pas de stack trace, pas de code HTTP nu
- Identifiant de support en bas (ID Sentry abrégé) pour aider au debug

---

## 4. Motion

### 4.1 Durées standards

| Token              | Valeur | Usage                     |
| ------------------ | ------ | ------------------------- |
| `duration-instant` | 100 ms | Hover, focus              |
| `duration-fast`    | 200 ms | Mini transitions (toggle) |
| `duration-base`    | 300 ms | Entrée/sortie composant   |
| `duration-slow`    | 500 ms | Transitions de page       |

### 4.2 Easing

- `ease-out` (transitions d'entrée — l'utilisateur attend le résultat)
- `ease-in` (transitions de sortie — l'élément s'évanouit)
- `ease-in-out` (transitions de mouvement)
- **Pas** de `linear` (sauf chargement)
- **Pas** d'easing custom au MVP (rester sur les Tailwind defaults)

### 4.3 Patterns à utiliser

- **Fade-in/out** pour les overlays
- **Slide** pour les modals (depuis le bas en mobile, depuis le centre en desktop)
- **Scale subtil** (0.95 → 1) pour les popovers
- **Skeleton shimmer** pour le loading
- **Bounce** sur les confirmations de succès (validate livrable, badge débloqué) — courte et discrète
- **Stagger** sur les listes qui apparaissent (10-30 ms entre éléments)

### 4.4 Respect prefers-reduced-motion

Toute animation > 200 ms wrappée dans :

```css
@media (prefers-reduced-motion: no-preference) {
  .animated-element {
    transition: transform 300ms ease-out;
  }
}
```

### 4.5 Lib recommandée

`@vueuse/motion` ou `motion-v` (port Vue de Motion / Framer Motion). Pour des animations plus complexes : `gsap` localement.

---

## 5. Micro-interactions signature

Une demi-douzaine de micro-interactions définissent l'identité du produit. À soigner :

| Interaction                              | Comportement                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| Validation d'un livrable (passe au vert) | Sparkle + bounce léger du badge XP qui s'ajoute                              |
| Déblocage d'un badge                     | Card qui flip avec révélation du badge, son court optionnel (off par défaut) |
| Connexion réussie                        | Avatar qui s'installe avec un crossfade depuis le logo                       |
| Bouton "Je suis bloqué" cliqué           | Toast positif "Mohamed a été prévenu" — pas négatif                          |
| Toggle dark/light mode                   | Crossfade des couleurs, transition de 250 ms                                 |
| Cmd+K palette                            | Slide-down + fade + autofocus instantané                                     |

---

## 6. Onboarding interactif (premium)

### 6.1 Stagiaire

Lib : **Driver.js** ou **Shepherd.js** pour les tours guidés.

Tour de 5-7 étapes la première fois :

1. "Bienvenue Karim, voici ton parcours" → flèche sur la timeline
2. "Cette semaine, tu travailles sur Git avancé" → flèche sur la card de la semaine
3. "Tes ressources sont ici" → flèche sur le panneau ressources
4. "Ton livrable est ce que tu soumettras" → flèche sur la card livrable
5. "Le harnais va vérifier automatiquement" → mini-démo animée
6. "Si tu es bloqué, ce bouton prévient Mohamed" → flèche sur le bouton
7. "Tu peux toujours rouvrir cette visite avec ce bouton" → flèche sur le `?` du header

Skip possible à toute étape. Ré-ouvrable depuis `Help → Tour guidé`.

### 6.2 Formateur

Tour de 6-8 étapes au premier login après création de la première cohorte.

### 6.3 Contextual hints

Au-delà du tour initial, des hints contextuels apparaissent UNE FOIS sur des actions importantes :

- Première création de cursus → hint sur le brouillon
- Première utilisation du Cmd+K → hint sur les actions disponibles
- Première alerte reçue → hint sur le bouton "Marquer traitée"

Hints stockés en local + DB (pour ne pas réafficher si l'utilisateur change d'appareil).

---

## 7. Command Palette (Cmd+K)

### 7.1 Spécification

- Raccourci : `Cmd+K` (Mac), `Ctrl+K` (Windows/Linux)
- Slide-down depuis le haut avec backdrop blur
- Recherche fuzzy sur :
  - Navigation (mes parcours, mon profil, cursus, cohortes, alertes)
  - Actions (créer cursus, inviter stagiaire, marquer alerte traitée…)
  - Entités (cursus par nom, cohorte par nom, stagiaire par nom)
  - Aide (lien vers la doc avec recherche)
- Catégorisation visuelle des résultats
- Raccourcis flèches + Enter
- Ferme avec Esc

### 7.2 Lib recommandée

`@nuxt/ui` propose `UCommandPalette` natif. Sinon `cmdk-vue`.

---

## 8. Dark mode et thèmes

### 8.1 Détection

- Au premier visit : suivre `prefers-color-scheme`
- Toggle manuel persistant (localStorage)
- Préférence stockée aussi côté DB pour les utilisateurs authentifiés

### 8.2 Implémentation

Classe `dark` sur `<html>`. Toutes les couleurs via variables CSS qui changent avec le thème.

### 8.3 Test obligatoire

Chaque PR UI vérifiée en light ET dark. Captures dans la PR.

### 8.4 Thèmes par cohorte / org (post-MVP)

L'admin peut configurer une couleur d'accent et un logo par organisation. Système de tokens permet ça nativement.

---

## 9. Iconographie

- **Lib unique** : Tabler Icons (open-source, cohérent, 5800+ icônes)
- **Outline only** au MVP (pas de filled)
- Sizes standards : 16, 20, 24 px
- Couleur héritée du parent (`color: currentColor`)
- Pas d'emoji dans l'UI sauf intention pédagogique forte (ex : feed cohorte, où l'emoji ajoute du chaleureux)

---

## 10. Illustrations

Style retenu : **illustrations sobres SVG monochromes**, avec des accents d'accent color.

Pour le MVP : kit unDraw ou Storyset (légèrement personnalisé). Pas d'illustration custom au MVP (coût).

Post-MVP : commissionner 5-7 illustrations signatures pour les empty states et les pages clés.

---

## 11. Tone of voice

Pas strictement du design system, mais cohérent avec l'UI :

- **Tutoiement** par défaut (proximité, environnement formation)
- **Phrases courtes**, voix active
- **Action verbs** sur les boutons : "Soumettre", "Inviter", "Valider"
- **Pas de jargon** technique dans les messages utilisateur (sauf si l'utilisateur est sur le rapport harnais où il est attendu)
- **Erreurs** : empathiques, jamais blâmantes ("Cette URL ne semble pas être un repo GitHub", pas "URL invalide")
- **Confirmations** : positives ("Bien joué, ton livrable est validé !" sur les jalons importants ; sobre sinon)
- **Vouvoiement** sur les pages publiques (portfolio, vérif certif) — c'est un contexte externe

---

## 12. Storybook (à mettre en place)

- Storybook 8 + Vue 3
- Une story par variant de chaque atome / molécule
- Tests visuels via Chromatic en CI (free tier OK)
- Storybook déployé en preview (`stories.cursus.app/<branch>`)
- Documentation des composants via MDX

---

## 13. Tooling design

| Outil          | Usage                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| Figma          | Source de vérité des écrans (avec design tokens synchronisés via Tokens Studio) |
| Storybook      | Source de vérité des composants implémentés                                     |
| Chromatic      | Tests visuels et reviews UI                                                     |
| Figma Dev Mode | Handoff design → code                                                           |
| Excalidraw     | Wireframes bas-fi et schémas                                                    |

---

## 14. Process de validation visuelle

Chaque story UI passe par :

1. **Wireframe bas-fi** (Excalidraw) — validé par PM en 5 min
2. **Mockup haut-fi** (Figma) — si écran nouveau ou changement majeur
3. **Story Storybook** — implémentation isolée
4. **Capture light + dark** — attachée à la PR
5. **Tests a11y** automatisés (axe-core)
6. **Validation manuelle** par PM avant merge

---

## 15. Évolutions prévues post-MVP

- Personnalisation thèmes par organisation
- Mode "présentation" pour soutenances (UI plein écran, contrastée)
- Mode "impression" pour les rapports PDF (typo serif, layout document)
- Animations Lottie sur les milestones importants
- Sound design optionnel (off par défaut, opt-in)
