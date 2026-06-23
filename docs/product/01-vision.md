# 01 — Vision produit (v2 — version premium)

## Nom de travail

**Cursus** (placeholder — à challenger lors de la phase de naming officiel)

## Phrase de positioning (one-liner)

> **Cursus est un harnais de cadencement et de validation pratique pour stages tech, où chaque semaine produit un livrable vérifié automatiquement, et où la fin du parcours produit un portfolio reproductible et un certificat interopérable.**

## Le problème qu'on résout

Mohamed, encadreur d'une cohorte de 5 à 20 stagiaires en interne (entreprise/DSI avec une dimension centre de formation), n'a pas le temps de rester derrière chaque stagiaire en permanence. Il a besoin :

1. De **cadrer** un programme cohérent par cursus IT (dev web, ingénierie web, IA, cybersécurité, etc.) sans tout réinventer.
2. De **savoir en un coup d'œil** où en est chaque stagiaire et qui est en alerte.
3. De **valider la compréhension réelle**, pas une compréhension déclarative.
4. D'**intervenir uniquement quand c'est nécessaire** (blocage, retard, dérive), pas en continu.
5. De **prouver à la fin** que le stagiaire sait reproduire ce qu'il a appris.

Aujourd'hui : aucun outil utilisé. Le suivi se fait à la main, par messages ou de mémoire. Coût caché : du temps formateur perdu, des stagiaires qui décrochent sans qu'on le voie à temps, pas de trace de progression, pas de comparabilité entre promotions, certificats non vérifiables.

---

## Les 5 piliers du produit (le Core)

### 1. Cadencement structuré

Chaque cursus est un **chemin séquencé de modules** organisés par semaines. La structure s'inspire des roadmaps de roadmap.sh pour ne pas réinventer la pédagogie. Le stagiaire sait à tout moment ce qu'il doit faire cette semaine. Le formateur sait à tout moment ce qu'il devrait avoir fait.

### 2. Validation pratique automatique (le « harnais »)

Inspiré de la moulinette de l'École 42. Chaque livrable hebdo est **vérifié automatiquement** via GitHub Actions :

- URL de déploiement répondant 200 + Lighthouse minimal
- Repo public avec structure attendue (README, branches, commits signés)
- Tests unitaires fournis par le formateur qui passent
- Linter qui passe
- Checklist sémantique (a11y, sécurité de base)

C'est **la primitive centrale**. Sans elle, on est juste un Trello déguisé.

### 3. Portfolio cumulatif

Inspiré d'Epitech. Chaque livrable validé s'**ajoute au profil public** du stagiaire. À la fin des 2-3 mois, son profil = un portfolio de 10-15 réalisations + le capstone. **C'est la preuve qu'il « sait reproduire »** — son portfolio est son CV technique.

### 4. Suivi formateur asynchrone

Dashboard formateur avec vue d'ensemble de la cohorte, notifications quand un stagiaire est bloqué, commentaires asynchrones sur les livrables, intervention ciblée — sans obligation de présence continue.

### 5. Capstone + soutenance

Projet final qui combine tous les modules du cursus, soutenu **oralement** devant le formateur. La soutenance est la preuve définitive de compréhension. C'est aussi la raison pour laquelle on peut se permettre d'avoir une politique anti-triche très légère sur les quiz : le capstone et sa soutenance ne se trichent pas.

---

## Les 7 axes premium (le Premium tier)

Ce qui distingue Cursus d'un simple Trello pédagogique. Toute fonctionnalité premium est explicitement marquée comme telle dans le backlog.

### Premium 1 — Design system & motion

Dark/light mode natif, micro-interactions soignées, transitions de page, skeleton loaders, illustrations sobres. C'est le premier signal de qualité perçu.

### Premium 2 — Internationalisation FR + EN dès le MVP

Une seule source de truth pour les chaînes, dès le départ. Coût marginal très faible, douloureux à rétrofitter.

### Premium 3 — Command Palette (Cmd+K)

Navigation et actions au clavier comme dans Linear ou Vercel. Productivité réelle pour Mohamed qui passe son temps dans l'app.

### Premium 4 — Recherche globale

Postgres Full-Text Search couplé à la command palette. Trouver un stagiaire, un cursus, une alerte en 2 frappes.

### Premium 5 — 2FA TOTP dès le MVP

Non-négociable pour un produit qui émet des certificats. Anti-fraude.

### Premium 6 — Performance budgets

Core Web Vitals dans le vert, Lighthouse CI bloquant sur les régressions, bundle size monitoré. Mesurable, observable, différenciateur.

### Premium 7 — Accessibility AAA sur écrans critiques

Auth, capstone, vérification publique du certificat. Aller au-delà du minimum WCAG AA sur les écrans qui matérialisent la valeur du produit.

---

## Les 5 différenciateurs (les Differentiators)

Ce qui peut faire de Cursus un produit qu'on n'oublie pas. À développer progressivement post-MVP, sauf les plus simples qui rentrent au MVP.

### Differentiator 1 — AI Assist

- **Génération assistée de quiz** à partir d'un module (le formateur valide/édite)
- **Résumé intelligent du rapport harnais** ("les 3 raisons principales du rejet")
- **Suggestion automatique de ressources** quand un formateur crée un module
- **Détection de patterns** dans les résultats quiz d'une cohorte (notions mal comprises)

Coût raisonnable via API LLM. Différenciateur radical sur un marché plutôt manuel.

### Differentiator 2 — Open Badges 3.0 + LinkedIn integration

Les badges et certificats Cursus sont au standard W3C Open Badges 3.0 : importables dans LinkedIn ("Add to Profile"), Mozilla Backpack, Credly. Crédibilise le certificat hors de l'écosystème Cursus.

### Differentiator 3 — Premium reporting

Graphes d'évolution cohorte, heatmap d'activité, comparaisons inter-cohortes, export PDF des rapports. Mohamed peut montrer la valeur à sa hiérarchie.

### Differentiator 4 — Webhooks & intégrations

Slack, Teams, Discord pour les notifs. Google Calendar / Outlook pour planifier les soutenances. Vivre dans l'écosystème de l'utilisateur, pas s'imposer en silo.

### Differentiator 5 — Real-time collaboration

Commentaires inline sur les livrables (à la GitHub PR review), mentions @user, threads de discussion sur les modules. Pour les cohortes où plusieurs formateurs interviennent.

---

## Anti-piliers (ce qu'on NE FAIT PAS — renforcés)

À garder collé au mur.

| Anti-pilier                                        | Pourquoi on ne le fait pas                                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Plateforme de cours en ligne**                   | freeCodeCamp, Coursera, Udemy le font mieux. Notre valeur c'est le harnais, pas le contenu.                                                |
| **Leaderboard public de la cohorte**               | Pour 5-20 personnes qui se connaissent, c'est toxique. Crée de la honte, casse la cohésion.                                                |
| **Streaks "X jours consécutifs"**                  | Mécanique Duolingo qui fait abandonner dès qu'on rate un jour. À bannir.                                                                   |
| **Proctoring strict des quiz**                     | Anti-éthique pour 5-20 personnes recrutées par toi. Contradictoire avec la gamification. La soutenance capstone fait office d'anti-triche. |
| **Mobile-first ou app native**                     | Le travail réel se fait sur ordinateur. PWA suffit pour le suivi mobile.                                                                   |
| **Multi-tenant / SaaS multi-organisations au MVP** | Une organisation, plusieurs formateurs, plusieurs cohortes. SaaS = v2.0+.                                                                  |
| **Génération IA des cursus complets**              | Pas au MVP. IA assiste sur quiz/résumés/suggestions. Cursus = curé par humain.                                                             |
| **Forum / chat de cohorte interne**                | Slack, Discord, Teams le font mieux. On intègre, on ne reconstruit pas.                                                                    |
| **Notation / classement entre stagiaires**         | XP individuel oui, pas de note relative à la cohorte.                                                                                      |
| **Marketplace de cursus**                          | Hors scope. Écosystème pas prêt.                                                                                                           |
| **Blockchain / NFT pour les certificats**          | Mode passagère. Open Badges 3.0 fait le job standard.                                                                                      |
| **Visio embarquée pour soutenances**               | Zoom/Meet font ça. On référence un lien externe.                                                                                           |
| **Boutique / économie virtuelle**                  | Pas de monétisation de la gamification.                                                                                                    |

---

## Inspirations assumées

- **École 42** — la moulinette (validation automatique), la soutenance orale, le cursus en cascade
- **Epitech** — portfolio cumulatif, projets qui se complexifient, "by doing"
- **roadmap.sh** — structure pédagogique des cursus, ordre des concepts
- **GitHub Classroom** — le modèle "pousser un repo = on note ton travail"
- **Linear** — sobriété du dashboard, command palette, motion design
- **Vercel** — performance, observabilité, changelog public
- **Open Badges (W3C)** — interopérabilité des certifications

---

## Métriques de succès

### North Star Metric

> **Taux de stagiaires capables de reproduire un livrable équivalent sans assistance à J+30 après fin de stage.**

Mesuré par un mini-challenge envoyé un mois après la fin du cursus. C'est la vraie mesure de "il a compris".

### Métrique opérationnelle proxy (corrélée, plus facile à mesurer en continu)

> **Taux de capstone validé au 1er essai sans override formateur.**

Mesurée à chaque clôture de cursus. Si elle reste ≥ 70 %, on a une raison de croire que la North Star est bonne.

### Métriques produit (suivies en interne)

- **Taux de complétion par cohorte** : % de stagiaires qui finissent leur cursus dans les délais
- **Taux de validation au 1er essai par module** : % de livrables validés par le harnais à la 1ère soumission (cible : 40-60 % au MVP)
- **Temps formateur économisé** : auto-déclaratif par Mohamed en fin de cohorte
- **Délai d'intervention formateur** : temps entre l'alerte et la réponse (cible : <24h ouvrées)
- **Score capstone moyen** : note attribuée par le formateur

### Métriques premium (qualité d'expérience)

- **Core Web Vitals** : LCP < 2.5s, INP < 200ms, CLS < 0.1 sur p75
- **Erreurs Sentry par 1k sessions** : < 5
- **Latence harnais p95** : < 5 min
- **Lighthouse a11y score** : >= 95 sur écrans critiques

### Anti-métriques (qu'on REFUSE de suivre)

- Temps passé dans l'app
- Nombre de connexions
- Score de quiz comme indicateur de compétence

---

## Hypothèses risquées à valider (priorisées)

| #   | Hypothèse                                                                         | Risque | Comment la tester                                                       |
| --- | --------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| H1  | Le harnais GH Actions peut valider 80 % des livrables sans intervention           | Élevé  | **Spike de 3 jours avant sprint 1** sur un livrable Git+HTML réel       |
| H2  | Les stagiaires acceptent de pousser leur code sur un repo public dès la semaine 1 | Moyen  | Onboarding pilote, observer la friction, prévoir option privée si frein |
| H3  | La soutenance capstone est faisable à distance pour les stagiaires distants       | Faible | Pilote sur 1-2 capstones                                                |
| H4  | roadmap.sh fournit assez de structure pour 4 cursus                               | Moyen  | Mapping manuel des 4 roadmaps avant le code (ADR)                       |
| H5  | L'AI Assist génère des quiz de qualité acceptable                                 | Moyen  | PoC en 1 jour sur Claude Haiku, évaluation manuelle de 20 quiz          |
| H6  | La latence harnais p95 < 5 min est tenable                                        | Élevé  | Mesure dès le spike H1, plan B (runners self-hosted) si KO              |

---

## Trajectoire long-terme

Même si Cursus démarre comme un outil interne, il y a une trajectoire crédible vers l'externalisation. Anticiper dès maintenant ce qui sera réutilisable :

### v0 (MVP) — Q3 2026

Usage interne, 1 cohorte pilote, 1 cursus. Single-tenant.

### v1 (Industrialisation) — Q4 2026

Plusieurs cohortes, plusieurs cursus, multi-formateurs. Toujours single-tenant (une seule org : la tienne).

### v2 (Ouverture restreinte) — Q1-Q2 2027

Possibilité d'inviter d'autres formateurs externes sur la même instance (modèle "club d'encadreurs"). Sécurité accrue, audit log avancé, branding par cohorte.

### v3 (SaaS si validation) — H2 2027+

Multi-tenant complet, modèle d'abonnement par cohorte ou par stagiaire, marketplace de cursus, peer-review entre stagiaires (modèle 42).

### Décisions structurantes à prendre tôt pour ne pas se bloquer

- Schéma DB : prévoir une colonne `organization_id` même si non-utilisée au MVP (pour migration facile vers multi-tenant)
- Auth : Supabase supporte natifvement les orgs via JWT claims
- Branding : design tokens permettent du theming par org dès le départ
- Open Badges 3.0 : portable hors-Cursus dès le MVP

---

## Anti-features radicales (renforcement des anti-piliers)

Si quelqu'un suggère ça, **refuser systématiquement** :

- "On pourrait ajouter un chat / forum interne" → NON, intégrer Slack/Discord
- "On pourrait afficher un classement de la cohorte" → NON, tué en interview UX
- "On pourrait notifier le formateur en push toutes les heures" → NON, alertes pertinentes only
- "On pourrait laisser les stagiaires créer eux-mêmes leurs cursus" → NON, anti-pilier "plateforme de cours"
- "On pourrait vendre des cursus créés par d'autres formateurs" → NON, hors scope, marketplace = v3+
- "On pourrait faire du proctoring vidéo" → NON, anti-éthique au MVP
- "Et si on intégrait Microsoft Teams pour la visio embarquée ?" → NON, lien externe suffit

---

## Ce que la v2.0+ pourra promettre (parked)

Liste explicite pour ne pas perdre les bonnes idées qui ne sont juste pas pour maintenant :

- Génération IA d'exercices personnalisés selon les difficultés observées
- Marketplace de cursus contribués
- Peer-review entre stagiaires (modèle 42)
- Mode "piscine" (cursus intensif)
- Multi-tenant pour proposer à d'autres entreprises
- Intégration LMS standards (SCORM, xAPI)
- Mobile app native (si PWA insuffisante après validation)
- Sound design / animations Lottie sur les milestones
- Mode "présentation" plein écran pour les soutenances
- Personnalisation thèmes par organisation
- Plug-in IDE (VS Code extension) pour signaler la progression depuis l'IDE
