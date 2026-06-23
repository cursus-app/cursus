# 12 — Checklist pré-vol (avant Sprint 1)

> Cocher au fur et à mesure. **Cible : phases A et B terminées avant le Spike S0**. Phase C peut avancer en parallèle.

---

## Phase A — Administratif & identité (~2-3h)

### A.1 — Nom et identité produit

- [x] Choisir le nom officiel du produit (challenger "Cursus" si tu veux)
- [x] **Démarrage 100% gratuit** : utiliser le sous-domaine `cursus-app.vercel.app` (auto-créé par Vercel à l'import du repo). Pas besoin d'acheter un domaine pour le pilote.
- [ ] **Pour la prod stable** (plus tard) : acheter un domaine custom (~10-15$/an)
  - [ ] Registrar recommandé : [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (prix coûtant, pas de markup) ou [Namecheap](https://www.namecheap.com)
  - [ ] DNS pointé vers Vercel
- [ ] Créer une identité visuelle minimale
  - [ ] Logo (même placeholder SVG simple, optimisable plus tard)
  - [ ] 1 couleur d'accent principale (deviendra `--color-accent-base` dans Tailwind v4)
  - [ ] 1 typo principale (recommandation : Inter Variable)

### A.2 — Structure juridique

- [ ] Décider de la structure qui porte le projet :
  - [ ] Projet perso (auto-entrepreneur si nécessaire)
  - [ ] Association
  - [ ] Structure existante (entreprise actuelle)
  - [ ] Autre
- [ ] **Conséquence directe** : qui signe les certificats émis, qui est responsable RGPD du traitement de données stagiaires.

### A.3 — Documents légaux (drafts maintenant, finalisation en S1)

- [ ] CGU — partir d'un template (ex : [Termly](https://termly.io) ou avocat si budget)
- [ ] Politique de confidentialité conforme RGPD
- [ ] Mentions légales
- [ ] Préparer un DPA (Data Processing Agreement) si tu accueilles des stagiaires d'autres structures
- [ ] Documenter la base légale de chaque traitement (consentement, intérêt légitime, contrat...)

**Référence** : `09-engineering-playbook.md` section 6 (sécurité) et `05-backlog-jira.md` EP-15 (Conformité RGPD).

---

## Phase B — Comptes et infrastructure (~2h)

### B.1 — GitHub

- [ ] Compte GitHub principal (perso ou nouveau)
- [x] **Créer une org dédiée** : `cursus-app` (ou ton nom de choix)
  - URL : `https://github.com/settings/organizations` → New organization
  - Plan Free OK pour démarrer
- [x] Créer 2 repos dans l'org :
  - [x] `cursus` — l'application principale (privé pour démarrer)
  - [x] `cursus-harness-runner` — le repo qui héberge le workflow GH Actions du harnais (public, pour économiser des minutes GH Actions vs privé)
- [x] **Créer la GitHub App "Cursus Harness"**
  - Aller dans `Settings org → Developer settings → GitHub Apps → New GitHub App`
  - Nom : `Cursus Harness`
  - Homepage URL : domaine choisi en A.1
  - Webhook URL : à remplir plus tard avec l'URL de production
  - Permissions :
    - Repository → Actions : Read & write
    - Repository → Contents : Read
    - Repository → Metadata : Read (auto)
  - Subscribe to events : `Workflow run`, `Workflow job`
  - Where can this app be installed : Only on this account
- [x] Télécharger la **private key** (.pem) immédiatement après création — elle ne sera plus jamais visible
  - Stocker dans un gestionnaire de mots de passe (1Password / Bitwarden)
- [x] Installer l'app sur l'org `cursus-app` et sur le repo `cursus-harness-runner`
- [x] Noter l'**App ID** et l'**Installation ID** (à mettre dans `.env`)

### B.2 — Créer une OAuth App (pour la connexion GitHub stagiaire)

- [ ] `Settings org → Developer settings → OAuth Apps → New OAuth App`
- [ ] Nom : `Cursus Sign-in`
- [ ] Homepage URL : domaine choisi
- [ ] Authorization callback URL : `https://<ton-domaine>/auth/callback/github` (et `http://localhost:3000/auth/callback/github` pour dev)
- [ ] Noter Client ID et Client Secret (à mettre dans `.env`)

### B.3 — Supabase

- [ ] Compte Supabase ([supabase.com](https://supabase.com))
- [ ] Créer une organisation Supabase (gratuit)
- [ ] Créer un projet "cursus" :
  - Region : **eu-west-3 (Paris)** ou eu-central-1 (Francfort)
  - Plan : **Free** au démarrage (500MB DB, 1GB Storage, 50K MAU, pause auto après 7j d'inactivité). Workaround pause : Inngest cron ping quotidien (déjà prévu dans le code).
  - **Upgrade Pro** ($25/mois) recommandé avant ouverture publique : sauvegardes quotidiennes, pas de pause, support, branching.
- [ ] Récupérer dans `Settings → API` :
  - [ ] `Project URL`
  - [ ] `anon public` key
  - [ ] `service_role` key (admin — JAMAIS côté client)
- [ ] Récupérer dans `Settings → Database` :
  - [ ] Connection string `Transaction` pooler (port 6543) → `DATABASE_URL`
  - [ ] Connection string `Direct` (port 5432) → `DIRECT_URL`
- [ ] Configurer les Auth providers dans `Authentication → Providers` :
  - [ ] Email/Password : activé
  - [ ] GitHub : activé avec OAuth Client ID/Secret de B.2

### B.4 — Vercel

- [ ] Compte Vercel ([vercel.com](https://vercel.com))
- [ ] Connecter au compte GitHub (autoriser sur l'org `cursus-app`)
- [ ] Importer le repo `cursus` (le déploiement se déclenchera plus tard, après ST-01.1)
- [ ] Configurer le domaine custom dans `Settings → Domains`
  - [ ] Ajouter le domaine apex (`cursus.app`)
  - [ ] Ajouter `www.cursus.app` avec redirection
- [ ] Préparer les **variables d'environnement** (les remplir progressivement) :
  - [ ] Settings → Environment Variables → Add each from `.env.example`
  - [ ] Distinguer Preview vs Production (variables sensibles uniquement en Production)

### B.5 — Resend (emails)

- [ ] Compte Resend ([resend.com](https://resend.com))
- [ ] Plan Free OK (3000 emails/mois)
- [ ] Ajouter ton domaine et configurer DKIM/SPF/DMARC dans les DNS
- [ ] Vérifier que le domaine est `Verified` (vert)
- [ ] Créer une API key dans `API Keys → Create` (scope : Sending only)
- [ ] Noter la key → `RESEND_API_KEY`

### B.6 — Sentry (monitoring)

- [ ] Compte Sentry ([sentry.io](https://sentry.io))
- [ ] Plan Developer Free (5K events/mois — suffisant pilote)
- [ ] Créer l'organisation `cursus`
- [ ] Créer un projet `cursus-app` (platform : Nuxt)
- [ ] Récupérer le DSN
- [ ] Générer un Auth Token (`Settings → Auth Tokens → Create`)
  - Scopes : `project:releases`, `project:read`

### B.7 — PostHog Cloud Free (analytics RGPD-friendly)

- [ ] Compte [PostHog](https://us.posthog.com/signup) (région EU recommandée pour conformité RGPD)
- [ ] Free tier : **1M events/mois** + session replay + feature flags + experiments inclus
- [ ] Créer un projet "cursus"
- [ ] Récupérer le `Project API Key` (cphc_xxx)
- [ ] Choisir région EU : `https://eu.i.posthog.com` (conformité RGPD)

- **Pourquoi PostHog plutôt que Plausible ?** Free tier généreux (Plausible est payant dès $9/mois), session replay inclus pour debug UX, feature flags pour le déploiement progressif des Stories EP-21+.

### B.8 — Inngest (queue)

- [ ] Compte Inngest ([inngest.com](https://inngest.com))
- [ ] Plan Hobby Free (largement suffisant pilote)
- [ ] Créer un environnement "production" et "development"
- [ ] Récupérer `INNGEST_EVENT_KEY` et `INNGEST_SIGNING_KEY` pour chaque env

### B.9 — Upstash Redis (cache + rate limit)

- [ ] Compte Upstash ([upstash.com](https://upstash.com))
- [ ] Créer une database Redis :
  - Type : Regional
  - Region : eu-west-1
  - Eviction : enabled (allkeys-lru)
- [ ] Récupérer `REST URL` et `REST Token`

### B.10 — Chromatic (tests visuels)

- [ ] Compte Chromatic ([chromatic.com](https://www.chromatic.com))
- [ ] Plan Free (5000 snapshots/mois)
- [ ] Lier au repo `cursus` (sera utile quand Storybook sera setup en ST-16.10)
- [ ] Noter `CHROMATIC_PROJECT_TOKEN`

### B.11 — Cloudflare Turnstile (captcha anti-brute force)

- [ ] Compte Cloudflare (gratuit) ([cloudflare.com](https://www.cloudflare.com))
- [ ] Section Turnstile → Add site
- [ ] Mode : Managed (recommandé)
- [ ] Récupérer Site Key et Secret Key

### B.12 — Stockage sécurisé des secrets

- [ ] Choisir un gestionnaire : 1Password / Bitwarden / Vaultwarden (selfhost)
- [ ] Créer un coffre "Cursus prod" avec toutes les clés ci-dessus
- [ ] Activer 2FA sur le gestionnaire
- [ ] (Plus tard) Partager le coffre avec les co-formateurs/admins identifiés

### B.13 — Repo Git initial

- [ ] Cloner `cursus` en local
- [ ] Créer un fichier `.env.local` à partir du `.env.example` fourni dans ce projet (`INTERNSHIP_MANAGEMENT/.env.example`)
- [ ] Tester que `git status` ignore bien `.env.local`
- [ ] Installer `gitleaks` localement : `brew install gitleaks` (ou équivalent)
- [ ] Ajouter le `.env.example` à `INTERNSHIP_MANAGEMENT/` au repo Cursus (sans les vraies valeurs)

---

## Phase C — Préparation pédagogique (effort principal Mohamed, peut démarrer en parallèle)

### C.1 — Cohorte pilote

- [ ] Identifier 3 à 5 stagiaires volontaires
  - [ ] Briefer chacun : "version pilote, vos retours seront utilisés pour itérer"
  - [ ] Recueillir leur accord (oral suffit à ce stade, écrit à signature du DPA si nécessaire)
- [ ] Vérifier que chacun :
  - [ ] A (ou peut créer) un compte GitHub avec email pro/perso
  - [ ] Possède un ordinateur portable avec Node 20+ installable
  - [ ] Est disponible sur la durée prévue du cursus (8-12 semaines)

### C.2 — Cursus pilote (recommandé : Cybersec L1)

- [ ] Choisir le cursus pilote
  - Recommandation : **Sécurité Informatique Niveau 1** (basique, bien outillé, beaucoup de livrables "noir/blanc" faciles à harnacher)
- [ ] Lister les 6-10 modules hebdo :
  - [ ] Module 1 : titre + objectif pédagogique + 2-3 ressources externes
  - [ ] Module 2 : idem
  - [ ] ...
  - [ ] Module N : idem
- [ ] Pour chaque module, définir le livrable concret + critères harnais :
  - [ ] Description du livrable (Markdown)
  - [ ] Liste des checks attendus parmi : `repo_exists_public`, `branch_exists`, `file_exists`, `tests_pass`, `linter_pass`, `url_responds`, `lighthouse_min`, `commits_signed`, `pr_merged_with_strategy`
- [ ] Préparer le sujet capstone (projet final)
  - [ ] Énoncé clair (1 page Markdown)
  - [ ] Délai prévu (10-14 jours)
  - [ ] Critères harnais à passer
- [ ] Préparer la grille d'évaluation soutenance
  - [ ] 5 critères × note /4
  - [ ] Mention : <10 non validé, 10-12 validé sous conditions, 13-15 validé, 16-20 validé avec mention

### C.3 — Co-formateurs éventuels

- [ ] Identifier les co-formateurs (si applicable)
- [ ] Briefer sur leur rôle (revue d'un module ou de toute la cohorte)
- [ ] Préparer leur compte (création en S2 quand l'app sera prête)

### C.4 — Communication pilote

- [ ] Rédiger un email d'invitation pour les 3-5 stagiaires (envoi en S5)
- [ ] Préparer une FAQ courte pour les stagiaires
- [ ] Planifier un kick-off (visio 30 min) pour démarrer le pilote

---

## Phase 0 — Spike harnais (3 jours, juste avant Sprint 1)

> **Hypothèse #1 du produit à valider : le harnais GH Actions tient une latence p95 < 5 min en conditions réelles.** Si Go : on enchaîne en confiance. Si No-Go : on pivote avant tout investissement code lourd.

### Jour 1 — Setup

- [ ] Créer 3-4 repos fixtures publics sur l'org `cursus-app` :
  - [ ] `cursus-fixture-all-green` (tous les checks passent)
  - [ ] `cursus-fixture-missing-branch` (1 check échoue)
  - [ ] `cursus-fixture-no-signed-commits` (commits non signés)
  - [ ] `cursus-fixture-broken-deploy` (URL down)
- [ ] Écrire un workflow GitHub Actions générique `.github/workflows/harness.yml` dans `cursus-harness-runner` avec 3 checks de base : `repo_exists`, `branch_exists`, `file_exists`

### Jour 2 — Logique de déclenchement

- [ ] Écrire un script Node `spikes/harness-poc/trigger.ts` qui :
  - Authentifie via la GitHub App
  - Déclenche le workflow_dispatch avec un payload JSON
  - Écoute le webhook de retour (serveur HTTP local + ngrok pour exposer)
  - Affiche le résultat structuré
- [ ] Lancer 10 runs successifs

### Jour 3 — Mesure et décision

- [ ] Mesurer latence p50, p95, max sur 10 runs (script bash + jq)
- [ ] **Critères Go** : p95 < 5 min ET p50 < 3 min ET aucune perte de webhook
- [ ] **Plan B si No-Go** : runners self-hosted, ou queue de pré-warming, ou refonte côté workflow
- [ ] **Rédiger ADR-002** (`docs/adr/002-harness-feasibility.md`) avec :
  - Mesures précises
  - Décision Go / No-Go / Go avec ajustements
  - Si ajustements : liste des modifications à faire avant Sprint 1
- [ ] **Rédiger ADR-001** (`docs/adr/001-stack-technique.md`) en parallèle, ressources : `07-stack-tech.md` du projet INTERNSHIP_MANAGEMENT

### Critères de Go pour Sprint 1

- [ ] ADR-001 et ADR-002 commités dans `cursus/docs/adr/`
- [ ] Latence harnais validée
- [ ] Aucun comptes ou clés Phase B manquants
- [ ] CGU + Privacy en draft accessible

---

## Suivi du temps

| Phase           | Effort estimé | Échéance suggérée  |
| --------------- | ------------- | ------------------ |
| Phase A         | 2-3h          | Semaine -2         |
| Phase B         | 2h            | Semaine -2 / -1    |
| Phase C         | 8-15h         | Étalé sur S-1 à S5 |
| Phase 0 (Spike) | 3 jours       | Semaine 0          |

---

## En cas de blocage

- **Compte ou clé difficile à obtenir** → continuer sur les autres, garder une todo dans la PR finale du Sprint 0
- **Spike en difficulté** → revenir au plan B documenté dans ADR-002 (runners self-hosted, etc.)
- **Cohorte pilote incomplète** → démarrer avec 3 stagiaires minimum, ajouter au fur et à mesure

---

## Quand tout est coché → tu es prêt pour le Sprint 1 sur l'EP-01 Fondations

Le ticket CUR-25 (ST-01.1 Bootstrap projet Nuxt 4 + Supabase + Prisma) est ton point de départ. Tout est documenté dedans pour qu'un dev (toi ou un agent) puisse démarrer le code immédiatement.
