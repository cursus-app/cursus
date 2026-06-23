# 00 — Audit critique du cadrage initial & axes premium retenus

> Ce document fait office de **changelog de la pensée produit** entre la v1 du cadrage (livrée à la session précédente) et la v2 (ce qu'on construit maintenant). Il sert aussi de **journal de décisions** auquel on peut revenir si on doute d'un choix plus tard.

---

## 1. Constats sur la v1 — ce qui ne va pas (ou pas assez loin)

### 1.1 Sur la vision (`01-vision.md`)

| Faiblesse                                                          | Conséquence si non corrigée                                | Décision v2                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| North star (« reproduire à J+30 ») difficile à mesurer en pratique | On n'aura pas de métrique de succès réellement actionnable | Garder la North Star mais ajouter une **métrique opérationnelle proxy** : taux de capstone validé du 1er coup |
| Pas de différenciation « cœur » vs « polish premium »              | On va sous-investir ou sur-investir sur le polish          | Introduire 3 tiers : **Core**, **Premium**, **Differentiator** dans tout le backlog                           |
| Anti-piliers définis mais pas anti-features radicales              | La tentation reviendra                                     | Renforcer les anti-piliers et les ré-imposer dans chaque epic                                                 |
| Pas de stratégie de croissance / monétisation envisagée            | Difficile de scaler hors de l'usage interne                | Ajouter une section « Trajectoire long-terme » même si projet interne                                         |

### 1.2 Sur les personas (`02-personas.md`)

- **Manque un persona crucial** : _le recruteur / le tiers vérificateur du certificat_. C'est lui qui consomme la valeur finale du portfolio, et on lui a livré une page de vérification sans s'être posé la question de son expérience. À ajouter en persona 5.
- **Pas de quotes représentatives** ni de jobs-to-be-done (JTBD) formalisés. À enrichir.
- **Pas de scénarios "happy path" vs "unhappy path"** par persona. À ajouter.

### 1.3 Sur les parcours (`03-user-journeys.md`)

- L'**onboarding stagiaire en 3 écrans** est trop expéditif pour une expérience premium. Premium = _progressive onboarding_ avec product tour, contextual hints, et déblocage de fonctionnalités au fil de la 1ʳᵉ semaine.
- **Parcours manquants** :
  - Retour de vacances / longue absence (recalibrage automatique du planning)
  - 2ᵉ tentative capstone (suivi de la 1ʳᵉ avec axes d'amélioration mis en évidence)
  - Fin de cohorte / archivage (Mohamed clôture officiellement, génère rapport final, archive)
  - Onboarding du formateur (lui aussi mérite un tour)
  - Recruteur vérifiant un certificat (parcours public)
- Pas de **wireframes** pour les écrans critiques. À ajouter au moins en bas-fidélité.

### 1.4 Sur l'architecture fonctionnelle (`04-architecture-fonctionnelle.md`)

Modules absents qui méritent d'être au moins esquissés :

| Module manquant                       | Pourquoi c'est important                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **AI Assist**                         | Génération assistée (quiz, résumés rapport, suggestions ressources). Différenciateur fort, faible coût. |
| **Search & Command Palette**          | UX standard des produits premium (Linear, Notion). Cmd+K = signal de qualité.                           |
| **Help Center contextuel**            | Pour un produit auto-servi, l'aide intégrée évite des allers-retours support.                           |
| **Webhooks & Integrations sortantes** | Slack/Teams/Discord/Calendar — où vivent les utilisateurs aujourd'hui.                                  |
| **Feature Flags**                     | Pour livrer en continu sans risque (Flipt, GrowthBook ou simple table Supabase).                        |
| **Changelog & What's New**            | Transparence sur les évolutions, à la Linear/Vercel.                                                    |

Modules existants à enrichir :

- **Modèle de données** : RLS policies pas détaillées → besoin d'un doc à part, voir `09-engineering-playbook.md` section RLS
- **Cache** : pas de stratégie. Doit être explicitée (ETag, stale-while-revalidate, Supabase Realtime cache invalidation)
- **Event sourcing** : audit log devrait être un _vrai_ event log unifié, pas une table par feature
- **Queue async** : les jobs harnais, génération PDF, envois email doivent passer par une queue (Inngest, Trigger.dev, ou pg_cron + LISTEN/NOTIFY)

### 1.5 Sur le backlog (`05-backlog-jira.md`)

Le plus gros défaut. Les stories sont trop succinctes pour un dev qui n'aurait pas le contexte de la conversation. Manques :

- ❌ **Pas de section "Contexte"** (le _pourquoi_)
- ❌ **AC pas systématiquement en Gherkin** (Given/When/Then)
- ❌ **Pas de cas limites listés**
- ❌ **Pas de décomposition en sous-tâches techniques**
- ❌ **Pas de dépendances inter-stories**
- ❌ **Pas de non-goals** (ce que la story ne fait PAS)
- ❌ **Pas de tests à écrire** (unit/integration/e2e)
- ❌ **Pas de Definition of Ready / Definition of Done** transverse
- ❌ **Pas de métriques d'observabilité** à monitorer après livraison

Le **05-backlog-jira.md v2** corrigera tout ça.

### 1.6 Sur le MVP (`06-mvp-pilote.md`)

- **3 semaines est très optimiste** vu l'ambition du harnais. Le **harnais seul** mérite 1.5 semaines de focus. Soit on rallonge à 4-5 semaines, soit on simplifie radicalement.
- **Pas de buffer** pour les imprévus → risque de stress + qualité dégradée.
- **Pas de pré-vol / PoC technique** sur le harnais. Le risque #1 doit être désamorcé en 2-3 jours de spike AVANT le sprint 1.
- **Pas de RACI** (qui est responsable / consulté / informé)

### 1.7 Sur la stack (`07-stack-tech.md`)

Choix corrects mais sous-spécifiés. Manques :

- Pas de **typage end-to-end DB** (Drizzle ORM ou Kysely sur Supabase recommandé)
- Pas de **stratégie tests visuels** (Chromatic + Storybook)
- Pas de **Sentry Replay** pour le debug visuel
- Pas de **PWA** (service worker, install prompt, offline lite)
- Pas de **moteur de recherche** (Postgres FTS suffit au MVP, mais à expliciter)
- Pas de **Redis / Upstash** pour le rate limiting et le cache éphémère
- Pas de **queue managée** pour les jobs (Inngest a un excellent free tier)
- Pas de **validation runtime** (Zod) explicitée comme obligatoire à toutes les frontières

---

## 2. Les axes "premium" retenus

Tous les axes possibles ne se valent pas. Triés par **ratio impact / effort**, en gardant en tête que « premium » ne veut pas dire « tout faire ». Voici les 14 axes que je retiens dans le cadrage v2.

### Tier 1 — Quasi-obligatoires pour qu'on parle de "premium"

| #   | Axe                                                                                         | Pourquoi                                                                   | Effort relatif |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | :------------: |
| P1  | **Design system + motion premium** (dark/light, micro-interactions, transitions, skeletons) | C'est le premier signal de qualité perçu.                                  |     Moyen      |
| P2  | **Internationalisation FR + EN dès MVP**                                                    | Coût marginal très faible si fait dès le départ, douloureux à rétrofitter. |     Faible     |
| P3  | **Command palette (Cmd+K)**                                                                 | Signal premium fort, productivité réelle pour Mohamed.                     |     Faible     |
| P4  | **Recherche globale (Postgres FTS)**                                                        | Inévitable dès qu'on a du contenu.                                         |     Faible     |
| P5  | **2FA TOTP dès MVP** (au lieu de v1.1)                                                      | Sécurité non-négociable pour un produit qui émet des certificats.          |     Faible     |
| P6  | **Performance budgets + Core Web Vitals dans le vert**                                      | Mesurable, observable, différenciateur.                                    |     Moyen      |
| P7  | **Accessibility AAA sur écrans critiques** (auth, capstone, vérification certificat)        | Cohérent avec le sérieux du produit.                                       |     Moyen      |

### Tier 2 — Différenciateurs forts

| #   | Axe                                                                                                                                                                                                     | Pourquoi                                                                                              | Effort relatif |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | :------------: |
| P8  | **AI Assist** : génération de quiz depuis un module, résumé intelligent du rapport harnais (« les 3 raisons principales du rejet »), suggestion automatique de ressources lors de la création de module | Différenciateur radical, faisable à coût raisonnable via API LLM.                                     |     Moyen      |
| P9  | **Open Badges 3.0 + LinkedIn integration**                                                                                                                                                              | Standard W3C : badges interopérables, importables dans le profil LinkedIn. Crédibilise le certificat. |     Faible     |
| P10 | **Premium reporting** : graphes évolution cohorte, heatmap activité, comparaison inter-cohortes, export PDF des rapports                                                                                | Mohamed pourra montrer la valeur à sa hiérarchie.                                                     |     Moyen      |
| P11 | **Webhooks sortants + intégrations** : Slack, Discord, Teams, Google Calendar                                                                                                                           | Vivre dans l'écosystème de Mohamed, pas s'imposer en silo.                                            |     Moyen      |
| P12 | **Real-time collaboration sur les livrables** : commentaires inline, mentions @user, threads                                                                                                            | Inspiration GitHub PR review. Très utile en pratique.                                                 |     Élevé      |

### Tier 3 — Polish qui fait la différence

| #   | Axe                                                                  | Pourquoi                                         | Effort relatif |
| --- | -------------------------------------------------------------------- | ------------------------------------------------ | :------------: |
| P13 | **PWA + offline lite** : installable, lecture des modules hors-ligne | Touche "app native" sans le coût.                |     Moyen      |
| P14 | **Help center contextuel + changelog in-app**                        | Réduit la charge support, communique la roadmap. |     Faible     |

### Axes que je n'ai PAS retenus (volontairement)

| Axe                                                 | Raison du rejet                                            |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Mobile app native (iOS/Android)                     | PWA suffit. Coût natif énorme, ROI faible.                 |
| Multi-tenant complet                                | Pas d'utilité avant 12+ mois. Anti-pilier conservé.        |
| Blockchain / NFT pour les certificats               | Mode passagère, complexité énorme, valeur réelle douteuse. |
| Marketplace de cursus                               | Hors scope, écosystème pas prêt.                           |
| Visio embarquée pour soutenances                    | Zoom/Meet font ça très bien. Ne pas réinventer.            |
| Forum communautaire intégré                         | Slack/Discord externe.                                     |
| Gamification poussée (boutique, économie virtuelle) | Anti-pilier renforcé : on garde XP + badges minimalistes.  |

---

## 3. Impact sur le périmètre, le MVP et le planning

### 3.1 Re-tier des Epics

Les Epics initiaux sont conservés. On ajoute **5 nouveaux Epics premium** :

- **EP-18 — Design System & Motion** (P1)
- **EP-19 — i18n FR + EN** (P2)
- **EP-20 — Command Palette & Search** (P3, P4)
- **EP-21 — AI Assist** (P8)
- **EP-22 — Integrations & Webhooks** (P11)
- **EP-23 — Premium Reporting** (P10)
- **EP-24 — PWA & Offline Lite** (P13)

### 3.2 Re-calibrage du MVP

Le MVP passe de **3 semaines** à **5 semaines** :

- Semaine 0 (préalable) : **Spike harnais GitHub Actions** (3 jours) + setup org GitHub dédiée + ADR techniques
- Semaines 1-2 : Fondations + Identity + Cursus Builder (sans roadmap.sh)
- Semaine 3 : Parcours stagiaire + Harnais core
- Semaine 4 : Dashboard formateur + Alertes + Notifications + Polish premium (i18n setup, command palette légère, design tokens)
- Semaine 5 : Tests E2E + Pré-vol + Buffer

Le **pilote** reste 3 semaines, après le sprint 5. Au total : 8 semaines de bout en bout.

### 3.3 Bonnes pratiques formalisées

Création du fichier **`09-engineering-playbook.md`** consigné comme référence permanente. Il couvre :

- Git / commits / branches / PR
- Code review et Definition of Done
- Type safety stricte (TS strict + Zod aux frontières)
- Tests : pyramide, AAA pattern, fixtures harnais
- Sécurité : OWASP, secrets, RLS systématique, audit
- Accessibility : checklist par story
- Performance : budgets, Core Web Vitals, bundle analysis
- Observabilité : logs, traces, métriques, alertes
- ADRs (Architecture Decision Records)
- Feature flags
- Naming conventions
- Database migrations
- Release process

Et **`10-design-system.md`** pour la cohérence visuelle premium.

---

## 4. Tableau récapitulatif des nouveaux livrables

| Fichier                            | Statut                  | Contenu                                                                                                  |
| ---------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `00-audit-premium.md`              | ✅ Nouveau              | Ce document                                                                                              |
| `01-vision.md`                     | 🔄 Mis à jour           | + Tier premium, + North Star ajustée, + section trajectoire LT                                           |
| `02-personas.md`                   | 🔄 Mis à jour           | + Persona "Recruteur", + JTBD, + quotes                                                                  |
| `03-user-journeys.md`              | 🔄 Mis à jour           | + 4 parcours manquants, + wireframes bas-fi                                                              |
| `04-architecture-fonctionnelle.md` | 🔄 Mis à jour           | + 7 modules manquants, + cache, + queue, + event sourcing                                                |
| `05-backlog-jira.md`               | 🔄 **Refonte complète** | Stories ultra-détaillées : contexte, AC Gherkin, cas limites, sous-tâches, dépendances, non-goals, tests |
| `06-mvp-pilote.md`                 | 🔄 Mis à jour           | + Spike pré-MVP, + RACI, + buffer, recalibrage 5 semaines                                                |
| `07-stack-tech.md`                 | 🔄 Mis à jour           | + Drizzle, + Storybook, + Inngest, + Upstash, + Zod, + PWA                                               |
| `08-jira-import.csv`               | 🔄 Régénéré             | CSV enrichi avec descriptions complètes                                                                  |
| `09-engineering-playbook.md`       | ✅ Nouveau              | Bonnes pratiques de dev consignées                                                                       |
| `10-design-system.md`              | ✅ Nouveau              | Design system premium                                                                                    |
| `README.md`                        | 🔄 Mis à jour           | Index élargi                                                                                             |

---

## 5. Décisions ouvertes (pour Mohamed)

| #   | Décision                                                           | Recommandation par défaut                                                                              |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| D1  | MVP en 3 ou 5 semaines ?                                           | **5 semaines** (réaliste avec premium)                                                                 |
| D2  | Projet JIRA cible : créer un nouveau ou utiliser BACK/BBOARD ?     | **Créer un nouveau projet `CURSUS`** côté JIRA                                                         |
| D3  | Provider LLM pour AI Assist                                        | **Claude Haiku** (rapide, coût bas, qualité OK pour ce use-case)                                       |
| D4  | Provider PWA / push notifications web                              | **Web Push API native** (sans dépendance) au MVP                                                       |
| D5  | i18n EN au MVP — qui rédige les traductions ?                      | Toi (Mohamed) pour le pilote, on extrait toutes les strings dans un seul fichier `fr.json` / `en.json` |
| D6  | Open Badges 3.0 : émetteur autonome ou plateforme tierce (Badgr) ? | **Émetteur autonome** signé (clé asymétrique), interopérable                                           |
