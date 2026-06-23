# SETUP — À faire avant le premier `claude`

Liste des actions concrètes à exécuter dans l'ordre pour démarrer.

## 1. Nettoyer les artefacts résiduels (1 min)

Ces fichiers ont été créés pendant le bootstrap mais sont obsolètes :

```bash
cd /Users/sadjad/Dev/perso/cursus

# Nettoyer les .bak laissés par sed (permissions Cowork m'empêchaient de les supprimer)
find . -name "*.bak*" -not -path "./node_modules/*" -delete

# Nettoyer les 2 fichiers de test
rm -f .claude/test.txt tasks/EP-01-fondations/_test.md

# Vérifier que c'est propre
find . -name "*.bak*" -not -path "./node_modules/*"
find . -name "_test.md" -not -path "./node_modules/*"
```

## 2. Installer les prérequis (15 min)

```bash
# Node 20 (via nvm si pas déjà installé)
nvm install 20
nvm use 20

# pnpm
corepack enable
corepack prepare pnpm@latest --activate

# GitHub CLI
brew install gh
gh auth login   # suivre les instructions

# gitleaks (sécurité secrets)
brew install gitleaks

# Claude Code CLI
# Voir https://docs.claude.com/claude-code/getting-started
# (typiquement : npm install -g @anthropic-ai/claude-code)
```

## 3. Créer les comptes externes (Phase B Pre-Flight, 1-2h)

Suis `docs/product/12-pre-flight-checklist.md` section "Phase B" en cochant au fur et à mesure.

**Strictement nécessaires avant `pnpm dev`** :

- [ ] GitHub org `cursus-app` + repo + GitHub App Cursus Harness
- [ ] Supabase projet "cursus" en eu-west-3 (Free plan)
- [ ] Vercel connecté au repo

**Peut attendre 1-2 jours** :

- [ ] Resend, Sentry, PostHog, Inngest, Upstash, Chromatic, Turnstile

## 4. Configurer `.env.local` (5 min)

```bash
cp .env.example .env.local
# Édite .env.local avec les vraies valeurs récupérées des comptes ci-dessus
```

**Variables critiques pour démarrer le dev local** :

- `DATABASE_URL` (Supabase pooler :6543)
- `DIRECT_URL` (Supabase direct :5432)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Les autres peuvent attendre (l'app démarrera mais certaines fonctionnalités seront désactivées).

## 5. Initialiser le projet (5 min)

```bash
pnpm install
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm db:seed       # optionnel : crée 1 admin + 1 formateur + 3 stagiaires fictifs
```

## 6. Vérifier que tout marche (2 min)

```bash
pnpm dev
# → ouvrir http://localhost:3000
# → la page doit charger
# → http://localhost:3000/api/health doit retourner { ok: true }
```

## 7. Push initial vers GitHub (5 min)

```bash
git add .
git commit -m "chore: initial commit — bootstrap, tasks, docs/product, branding, landing"

# Configurer le remote (si pas déjà fait)
git remote add origin git@github.com:cursus-app/cursus.git

# Push
git push -u origin main

# Activer branch protection sur main
# (Settings → Branches → Add rule → Require PR + CI green)

# Vérifier que la CI tourne
gh pr checks   # (sur la branche main initiale, peut être vide)
```

## 8. Déployer la landing page (10 min, optionnel mais recommandé)

```bash
# Option Vercel
vercel --prod public/landing

# Configure ensuite ton domaine custom dans le dashboard Vercel
# Personnalise Formspree endpoint dans public/landing/index.html (cf README dans le dossier)
```

## 9. Premier `claude` dans le repo (15 min)

```bash
cd /Users/sadjad/Dev/perso/cursus
code .                  # Ouvre VS Code

# Dans le terminal intégré VS Code
claude

# Premières commandes
> /audit-tasks          # Audit qualité des 158 task files
> /status               # Vue d'ensemble du backlog
> /start-task ST-01.6   # Démarre le Spike harnais (3 jours)
```

## 10. Suite — Sprint 1 en autonomie

Quand le Spike S0 est validé (ADR-002 Go) :

```bash
> /start-sprint 1
# L'agent enchaîne les 33 Stories du Sprint 1 pendant 6-10h
# Tu reviens, tu vois le récap, tu valides les bloquages éventuels
```

---

**Tu n'as plus rien à demander pour préparer le terrain. Bon vol 🚀**

---

## ⚠️ Warnings peer dependencies connus (non bloquants)

Après `pnpm install`, tu verras 2 warnings de peer dependencies. **Pas bloquant** pour le développement, à monitorer :

```
✕ @nuxtjs/seo → unhead^3.1.4 attendu, trouvé 2.1.15 (transitif Nuxt 4.4.8)
✕ @sentry/nuxt → vite^3-6 attendu, trouvé 7.3.5 (Nuxt 4 utilise Vite 7)
```

**Cause** : Nuxt 4.4.8 ships avec Vite 7 + unhead 2.x, mais @nuxtjs/seo et @sentry/nuxt n'ont pas encore publié les versions alignées avec Vite 7 / unhead 3.

**Action recommandée** :

1. **Au démarrage** : ignorer, ces warnings ne bloquent ni l'install ni le runtime
2. **Si crash à l'usage** : appliquer un `pnpm.overrides` dans `package.json` pour forcer la version transitive, OU pinner Nuxt à 4.3.x (Vite 6) temporairement :
   ```json
   "pnpm": {
     "overrides": {
       "unhead": "^2.1.15",
       "vite": "^6.0.0"
     }
   }
   ```
3. **Long terme** : les mainteneurs sentry-nuxt + nuxtjs-seo sortiront des versions compatibles dans les semaines à venir → upgrade simple via `pnpm update`

## 🔧 Notes sur les versions corrigées (juin 2026)

Plusieurs packages dans `package.json` ont été corrigés vs la version initiale du repo :

| Package                | Avant     | Après                  | Raison                                                          |
| ---------------------- | --------- | ---------------------- | --------------------------------------------------------------- |
| `@iconify-json/tabler` | `^3.0.0`  | `^1.2.35`              | v3 n'existait pas (la latest est 1.2.x)                         |
| `@nuxtjs/security`     | `^2.0.0`  | `nuxt-security@^2.6.0` | Mauvais nom de package (le vrai est `nuxt-security` sans scope) |
| `@nuxt/image`          | `^1.8.0`  | `^2.0.0`               | v2 sortie compatible Nuxt 4                                     |
| `@nuxtjs/i18n`         | `^9.0.0`  | `^10.4.0`              | v10 sortie compatible Nuxt 4                                    |
| `@nuxtjs/seo`          | `^2.0.0`  | `^5.3.0`               | v5 sortie compatible Nuxt 4                                     |
| `@nuxt/eslint`         | `^0.7.0`  | `^1.16.0`              | Sorti v1 stable                                                 |
| `@nuxt/test-utils`     | `^3.14.0` | `^4.0.3`               | v4 aligné avec Nuxt 4                                           |
| `@vueuse/nuxt`         | `^12.0.0` | `^14.3.0`              | Tracker VueUse latest                                           |
| `eslint`               | `^9.0.0`  | `^10.0.0`              | Requis par @nuxt/eslint v1.16+                                  |
| `gitleaks`             | (npm)     | (retiré)               | C'est un binaire Go, à installer via `brew install gitleaks`    |

Et beaucoup de mineurs/patches harmonisés vers les latest stables (inngest 4, resend 6, pino 10, chromatic 17, lefthook 2, tsx 4.22, etc.).
