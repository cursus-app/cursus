# public/landing — Landing page statique

> Page HTML autonome destinée à être servie en production **avant que l'app Cursus elle-même ne soit prête**. Tu peux l'uploader sur n'importe quel hébergeur statique pour réserver le domaine, capter les premières inscriptions au pilote, et donner un point d'entrée pro à ton projet.

---

## Fichier

| Fichier                      | Taille | Lignes     |
| ---------------------------- | ------ | ---------- |
| [`index.html`](./index.html) | 37 KB  | 671 lignes |

**Un seul fichier, autonome.** Tailwind via CDN, aucune dépendance externe sauf Google Fonts (Inter).

---

## Sections de la page

1. **Header** — Logo + nav (Fonctionnalités, FAQ, Pilote)
2. **Hero** — Tagline accrocheuse + sub-line + CTA "Rejoindre le pilote"
3. **Problème** — 3-4 phrases sur le pain point formateur
4. **Solution** — Les 3 piliers (cadencement, harnais, portfolio) avec icônes
5. **Inspirations** — "Inspiré de l'École 42, Epitech, roadmap.sh"
6. **Pour qui** — 2 personas brefs (formateur + stagiaire)
7. **Comment ça marche** — Timeline 4 étapes
8. **FAQ** — 5-6 questions clés
9. **Pilote** — Formulaire capture email (Formspree placeholder)
10. **Footer** — Liens légaux + copyright

---

## Déploiement (3 options gratuites)

### Option 1 — Vercel (recommandée si tu utilises déjà Vercel)

```bash
cd /Users/sadjad/Dev/perso/cursus
vercel --prod public/landing
# → URL temporaire : https://<random>.vercel.app
# → Configurer un domaine custom dans Vercel dashboard
```

### Option 2 — Cloudflare Pages

1. Créer un repo Git séparé (ou utiliser un sous-dossier)
2. Connecter à Cloudflare Pages
3. Build command : (vide, c'est statique)
4. Output directory : `.`

### Option 3 — GitHub Pages

1. Pousser le contenu de `public/landing/` dans un repo `cursus-landing` (branche `gh-pages`)
2. Activer GitHub Pages dans Settings
3. URL : `https://<org>.github.io/cursus-landing/`

---

## À personnaliser AVANT déploiement

### 1. Endpoint Formspree (formulaire pilote)

Dans le code HTML, chercher `https://formspree.io/f/PLACEHOLDER` et remplacer par ton vrai endpoint :

```html
<form action="https://formspree.io/f/TON_ID_FORMSPREE" method="POST"></form>
```

**Pour créer un endpoint Formspree** :

1. Aller sur [formspree.io](https://formspree.io) (gratuit jusqu'à 50 submissions/mois)
2. Créer un nouveau form
3. Copier l'ID (format `xyzabc12`)
4. Coller dans le HTML

**Alternative** : Netlify Forms, Resend (via une mini API serverless), Tally, Cal.com forms.

### 2. URLs de pages internes

Liens vers `/cgu`, `/privacy`, `/mentions` dans le footer pointent vers `#` actuellement. À mettre à jour quand tu auras déployé les vraies pages :

- Soit pages HTML statiques additionnelles
- Soit pages Nuxt une fois l'app déployée
- Soit pages générées depuis `docs/product/legal-templates/`

### 3. OG image (partages réseaux sociaux)

`<meta property="og:image" content="..." />` est un placeholder. Génère une image 1200×630 (canva, figma) qui met en avant le tagline + logo, et upload-la dans `public/branding/og-image.png`.

### 4. JSON-LD Organization

Mettre à jour les champs `url`, `logo`, `sameAs` (twitter, linkedin) selon ce que tu as configuré.

---

## Performance attendue

- **Lighthouse Performance** : 95+ (SVG inline, pas d'image lourde, Tailwind CDN)
- **Lighthouse Accessibility** : 100 (sémantique HTML5 + ARIA + contraste WCAG AA)
- **First Contentful Paint** : < 1s sur connexion correcte
- **Bundle size** : ~40 KB (HTML+CSS+JS inline) + Tailwind CDN (~10 KB après tree-shake)

**À mesurer avant publication** : `lighthouse https://ton-url.vercel.app` ou Chrome DevTools.

---

## Évolution suggérée

| Étape                     | Action                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| **Maintenant**            | Déployer telle quelle + configurer Formspree                                                      |
| **Pré-pilote**            | Personnaliser FAQ avec tes vrais Q/R + OG image                                                   |
| **Pendant le pilote**     | Ajouter des témoignages stagiaires en cours                                                       |
| **Post-pilote**           | Section "Résultats" avec metrics réelles                                                          |
| **Quand l'app est prête** | Soit remplacer entièrement par la page Nuxt, soit la garder en /landing avec redirect intelligent |

---

## Note sur Tailwind CDN en prod

Tailwind via CDN est **acceptable pour une landing simple** mais **pas idéal pour une app de production**. Quand l'app Nuxt sera déployée, elle aura sa propre stack Tailwind 4 buildée localement (plus performant, tree-shaking complet, dark mode natif).

La landing reste utile pour : SEO (page indexable séparément), capture de leads pré-app, point d'entrée marketing.
