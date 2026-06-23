# 06 — MVP pilote : scope 5 semaines (v2 — recalibré premium)

> **Recalibrage v2** : passé de 3 à 5 semaines pour intégrer le tier premium (i18n, design system, command palette, 2FA, perf budgets) tout en gardant l'ambition harnais. Voir `00-audit-premium.md` section 3.2.

## Objectif du MVP

**Livrer en 5 semaines (+ 1 semaine 0 de spike) une version utilisable par une cohorte pilote de 3-5 stagiaires sur 1 seul cursus, avec qualité premium.**

L'objectif n'est PAS de tout livrer. C'est de **valider les 3 hypothèses critiques** sur un terrain réel :

1. Le harnais auto-valide la majorité des livrables sans intervention manuelle.
2. Les stagiaires acceptent et comprennent le flux "pousser un repo = être noté".
3. Le formateur économise vraiment du temps de suivi.

Si l'une de ces 3 hypothèses casse, on apprend tôt et on pivote, plutôt que d'avoir construit 6 mois en vain.

---

## Cohorte pilote

- **3-5 stagiaires** volontaires, briefés sur le caractère pilote
- **1 cursus** : recommandation **Sécurité Info L1** (basique, bien outillé, beaucoup de livrables "noir/blanc" faciles à harnacher)
- **Durée** : 3 semaines de pilote (≠ durée du cursus complet qui pourra continuer après)
- **Cadence** : 1 livrable par semaine (3 livrables au total pour le pilote)
- **Formateur principal** : Mohamed (lead)
- **Co-formateur** : optionnel, peut être ajouté si quelqu'un est disponible pour tester ce flux

---

## Périmètre IN (dans le MVP)

### Identity & Access (EP-02)

- ✅ ST-02.1 — Auth email + mot de passe
- ✅ ST-02.2 — Magic link invitation
- ✅ ST-02.3 — OAuth GitHub (essentiel)
- ⚠️ ST-02.4 — Système de rôles (version simplifiée : `stagiaire` + `formateur_principal` uniquement, pas de co-formateur ni admin au pilote)
- ❌ ST-02.5 — Édition profil avancée (uniquement avatar + nom)

### Cursus Builder (EP-03)

- ⚠️ ST-03.1 — CRUD cursus (version simplifiée : 1 seul cursus, pas de versionning)
- ✅ ST-03.2 — Édition des modules (manuel uniquement, pas de drag-drop fancy)
- ✅ ST-03.3 — Gestion des ressources (sans aperçu OG)
- ✅ ST-03.4 — Spécification livrable + critères harnais (subset : 5 checks essentiels)
- ❌ ST-03.5 — Versionning
- ❌ ST-03.6 — Clonage
- ❌ ST-03.7 — Import roadmap.sh
- ❌ ST-03.8 — Prévisualisation

### Cohorte (EP-04)

- ⚠️ ST-04.1 — CRUD cohorte (1 cohorte, simplifié)
- ✅ ST-04.2 — Invitation stagiaires
- ❌ ST-04.3 — Co-formateurs
- ❌ ST-04.4 — Décalage

### Parcours stagiaire (EP-05)

- ✅ ST-05.1 — Page "Cette semaine"
- ✅ ST-05.2 — Soumission livrable
- ✅ ST-05.3 — Bouton "Je suis bloqué"
- ⚠️ ST-05.4 — Historique soumissions (vue simplifiée)

### Harness (EP-06) — **priorité absolue**

- ✅ ST-06.1 — Worker GitHub Actions
- ⚠️ ST-06.2 — Bibliothèque checks (subset de 5 :
  - `repo_exists_public`
  - `branch_exists`
  - `file_exists`
  - `url_responds`
  - `commits_signed`)
- ✅ ST-06.3 — Rapport lisible
- ⚠️ ST-06.4 — Notification temps réel (polling toutes les 5s, pas de WebSocket si trop coûteux)
- ✅ ST-06.5 — Override manuel

### Quiz (EP-07) — **scope minimal**

- ⚠️ ST-07.1 — QCM uniquement (pas de texte court au MVP)
- ⚠️ ST-07.2 — Passage quiz, score affiché, 3 tentatives max
- ❌ ST-07.3 — Stats agrégées

### Progress & Alertes (EP-08)

- ✅ ST-08.1 — State machine (versions simplifiée : 5 statuts au lieu de 7)
- ⚠️ ST-08.2 — Détection alertes (1 règle : pas de soumission depuis 48h)
- ✅ ST-08.3 — Gestion alertes formateur (vue liste simple)
- ❌ ST-08.4 — Audit log (capture en DB mais pas d'UI dédiée)

### Capstone (EP-09) — **différé, sauf si le pilote dure assez**

- ❌ Toutes les stories
- _(Le pilote 3 semaines ne couvre pas le capstone, qui survient en fin de cursus 8-10 semaines. À implémenter avant la fin du cursus complet.)_

### Portfolio & Certif (EP-10) — **différé**

- ❌ Toutes les stories
- _(Idem capstone)_

### Gamification (EP-11) — **minimal**

- ⚠️ ST-11.1 — XP simple sur livrable validé (affichage profil)
- ❌ Badges (à activer après pilote)
- ❌ Feed cohorte

### Notifications (EP-12)

- ✅ ST-12.1 — Centre in-app
- ⚠️ ST-12.2 — Emails (uniquement invitation + alerte + livrable validé, pas tout le catalogue)
- ❌ ST-12.3 — Digest

### Dashboards (EP-13)

- ✅ ST-13.1 — Dashboard stagiaire (version basique)
- ⚠️ ST-13.2 — Dashboard formateur (tableau cohorte simple)
- ✅ ST-13.3 — Fiche stagiaire

### Admin (EP-14) — **différé**

- ❌

### Conformité (EP-15)

- ⚠️ CGU + politique confidentialité (texte simple, sans avocat au MVP — à régulariser avant ouverture publique)
- ❌ Export données / droit à l'oubli (manuel par admin si demande)
- ❌ 2FA

### Observabilité (EP-16)

- ✅ ST-16.1 — Logs structurés
- ✅ ST-16.2 — Sentry
- ❌ Analytics
- ⚠️ Tests E2E sur 2-3 parcours critiques uniquement
- ✅ Tests d'intégration harnais

### Pilote & déploiement (EP-17)

- ✅ Tout

### Fondations (EP-01)

- ✅ Tout

---

## Planning par semaine (proposition v2)

### Semaine 0 — Spike & ADRs (3 jours, en amont)

**Avant tout sprint développement, désamorcer le risque #1 (harnais).**

- ST-01.6 (Spike PoC harnais GH Actions, 3 jours)
- ST-01.5 (ADR-001 Stack technique)
- ADR-002 (suite du spike : faisabilité confirmée + plan d'optimisation)
- Création org GitHub `cursus-app`
- Choix domaine + setup Vercel (compte)

**Livrable fin S0** : Go/No-Go harnais documenté. Si Go : on enchaîne avec sérénité. Si KO : pivot avant tout investissement.

### Semaine 1 — Fondations + Identity (auth simple)

- Bootstrap Nuxt 4 + Supabase + Prisma 7 (ST-01.1)
- CI/CD GitHub Actions (ST-01.2)
- Déploiement preview/prod Vercel (ST-01.3)
- Schéma DB initial complet (ST-01.4)
- Observabilité minimale Sentry + Pino (ST-01.7)
- Auth email + mdp (ST-02.1)
- Magic link invitation (ST-02.2)
- **EP-18 amorcé** : design tokens (ST-18.1) + setup UI lib (ST-18.2)
- **EP-19 amorcé** : setup i18n (ST-19.1)

**Livrable fin S1** : un utilisateur peut être invité, créer son compte, voir une page d'accueil propre en FR ou EN.

### Semaine 2 — RBAC, GitHub OAuth, 2FA, Cursus Builder

- OAuth GitHub stagiaires (ST-02.3)
- RBAC + RLS exhaustifs (ST-02.4)
- 2FA TOTP (ST-02.5)
- Gestion profil (ST-02.6)
- CRUD cursus (ST-03.1)
- Édition modules + ressources (ST-03.2, ST-03.3)
- Cohorte CRUD (ST-04.1) + invitation stagiaires (ST-04.2)
- **EP-18 continue** : atomes composants Storybook (ST-18.3)
- **EP-15** : CGU + politique conf (ST-15.3), audit RLS (ST-15.6)

**Livrable fin S2** : Mohamed peut créer un cursus, ouvrir une cohorte, inviter des stagiaires. Sécurité validée par tests RLS exhaustifs.

### Semaine 3 — Parcours stagiaire + Harnais

- Page "Cette semaine" (ST-05.1)
- Spec livrable + critères (ST-03.4)
- Soumission livrable + Realtime (ST-05.2)
- Bouton "Je suis bloqué" (ST-05.3)
- State machine progressions (ST-08.1)
- Harness — GitHub App + worker (ST-06.1)
- Harness — 5 checks de base (ST-06.2 subset)
- Harness — rapport lisible (ST-06.3)
- Harness — Realtime push (ST-06.4)
- Harness — Inngest queue (ST-06.6)
- Notifications in-app + email (ST-12.1, ST-12.2)
- **EP-18 continue** : molécules composants (ST-18.4), dark mode (ST-18.5)

**Livrable fin S3** : un stagiaire peut soumettre son premier livrable et voir le résultat du harnais. Dark mode opérationnel.

### Semaine 4 — Dashboard formateur + Alertes + Premium polish

- Dashboard formateur cohorte heatmap (ST-13.2)
- Fiche stagiaire (ST-13.3)
- Dashboard stagiaire (ST-13.1)
- Détection alertes nocturne (ST-08.2)
- Gestion alertes formateur (ST-08.3)
- Override harnais (ST-06.5)
- Audit log (ST-08.4)
- Quiz création + passage (ST-07.1, ST-07.2)
- Digest quotidien formateur (ST-12.3)
- Préférences notifs (ST-12.5)
- **EP-20** : Command palette + search global (ST-20.1, ST-20.2, ST-20.5)
- **EP-19** : i18n EN traductions (ST-19.2, ST-19.3, ST-19.4)
- **EP-18** : motion, skeletons, empty states (ST-18.6, ST-18.7, ST-18.8)
- **EP-11** : XP + badges core (ST-11.1, ST-11.2)

**Livrable fin S4** : produit feature-complete sur le MVP. Mohamed peut piloter une cohorte de bout en bout (hors capstone).

### Semaine 5 — Tests + Capstone + Polish final

- Tests E2E parcours critiques (ST-16.4)
- Tests intégration harnais (ST-16.5)
- Lighthouse CI + perf budget (ST-16.6)
- Capstone soumission + soutenance + grille (ST-09.1, ST-09.2, ST-09.3)
- Portfolio public (ST-10.1)
- Certificat PDF signé (ST-10.2)
- Vérification publique (ST-10.3, ST-10.4)
- Onboarding interactif (ST-05.5)
- Feed cohorte (ST-11.3)
- Politique mdp + verrouillage (ST-15.4)
- Tour formateur + tour stagiaire validés
- **EP-17** : préparation cursus pilote (ST-17.2)
- **EP-17** : pré-vol tests internes (ST-17.3)

**Livrable fin S5** : version 1.0 prête. Cursus pilote prêt. Bug bash interne fait. Communication officielle préparée.

### Semaines 6-8 — Pilote en conditions réelles

- Les 3-5 stagiaires soumettent 1 livrable / semaine
- Mohamed gère les alertes, override, commentaire
- Mesure des métriques :
  - % de livrables validés au 1er essai
  - Latence harnais p50/p95
  - Temps moyen formateur sur l'app
  - Satisfaction stagiaire (1 entretien chacun en fin pilote)
  - Core Web Vitals en conditions réelles
- Hotfixes urgents possibles
- Pas de nouvelles features pendant le pilote (focus sur la stabilisation)

---

## Critères de succès du pilote (Go/No-Go pour la v1.0)

| Critère                              | Cible           | Mesure                  |
| ------------------------------------ | --------------- | ----------------------- |
| Taux de validation 1er essai         | ≥ 40 %          | Compteur sur HarnessRun |
| Latence harnais médiane              | < 5 min         | Logs                    |
| Stagiaires bloqués hors timing prévu | ≤ 1 sur 3-5     | Mohamed observe         |
| Temps formateur économisé déclaré    | ≥ 30 % vs avant | Auto-déclaratif Mohamed |
| Bugs bloquants en pilote             | ≤ 2             | Sentry + retours        |
| Satisfaction stagiaire               | ≥ 7/10 médiane  | Entretien fin pilote    |

Si on hit 4 critères sur 6 : **Go** pour la v1.0 (intégrer Capstone, Portfolio, Certif, Multi-formateurs).
Si on hit 2-3 : **Reload** : on garde le harnais, on revoit le reste.
Si on hit 0-1 : **Pivot majeur**, à discuter.

---

## Risques du MVP et mitigations

| Risque                                                          | Probabilité | Impact | Mitigation                                                                                       |
| --------------------------------------------------------------- | :---------: | :----: | ------------------------------------------------------------------------------------------------ |
| Le harnais GH Actions est trop lent (>10 min)                   |   Moyenne   | Élevé  | Optimiser dès la semaine 3, utiliser des runners self-hosted si besoin en v1.1                   |
| Les stagiaires n'ont pas de compte GitHub                       |   Faible    | Élevé  | Briefing préalable, onboarding inclut "Crée un compte GitHub si tu n'en as pas"                  |
| Mohamed n'a pas le temps de créer le cursus pilote en parallèle |   Élevée    | Élevé  | Bloquer 2 demi-journées dans son calendrier en S2 et S3                                          |
| Bug critique pendant le pilote                                  |   Moyenne   | Moyen  | Astreinte légère pendant les 3 semaines de pilote, hotfix path documenté                         |
| Les stagiaires trouvent l'UX confuse                            |   Moyenne   | Moyen  | Onboarding en 3 écrans + démo Loom envoyée avant le démarrage                                    |
| Le périmètre dérape                                             |   Élevée    | Élevé  | Cette page sert de référence stricte, toute demande de feature non-listée est notée pour la v1.0 |

---

## Ce qu'on NE livre pas et pourquoi

- **Capstone & soutenance** : le pilote dure 3 semaines, le capstone arrive en fin de cursus (semaine 8-10). On a le temps de l'ajouter en parallèle du pilote.
- **Portfolio public + Certificat** : idem, déclenché à la fin du cursus.
- **Multi-formateurs** : 1 formateur (Mohamed) suffit pour le pilote.
- **Import roadmap.sh** : nécessite recherche juridique + dev, on peut s'en passer pour 1 cursus créé manuellement.
- **Quiz à texte court** : QCM suffit pour valider l'idée du quiz.
- **Badges et feed cohorte** : "nice to have" qui n'invalident pas l'hypothèse principale.
- **Admin & Reporting** : Mohamed est seul, il a les droits étendus, pas besoin d'UI admin séparée.
- **2FA, RGPD complet** : nécessaire avant ouverture publique, pas avant pilote interne.

---

## Décisions à prendre AVANT le sprint 1

| Décision                                        | Recommandation par défaut                               | Qui décide               |
| ----------------------------------------------- | ------------------------------------------------------- | ------------------------ |
| Hébergement (Vercel vs Netlify vs auto-hébergé) | Vercel pour le MVP, migration possible plus tard        | Mohamed                  |
| Provider email                                  | Resend (DX simple) ou Postmark (fiabilité)              | Mohamed                  |
| Stockage logos / avatars                        | Supabase Storage                                        | Validé                   |
| Domaine de prod                                 | Sous-domaine `cursus.<entreprise>.com` ou domaine dédié | Mohamed                  |
| Compte GitHub pour le harnais                   | Compte org dédié `cursus-app`                           | Mohamed                  |
| Suivi des sprints                               | JIRA (déjà choisi)                                      | Validé                   |
| Projet JIRA cible                               | À créer ou utiliser BACK/BBOARD existant                | **Mohamed (en attente)** |
| Queue manager                                   | Inngest (free tier)                                     | Recommandé               |
| Cache éphémère + rate limit                     | Upstash Redis                                           | Recommandé               |
| Web analytics                                   | Plausible (9$/mois)                                     | Mohamed                  |
| Provider LLM (EP-21 v1.1)                       | Claude Haiku (rapide + bon marché)                      | Mohamed                  |
| Démarrage Spike S0                              | Date à fixer                                            | Mohamed                  |

## RACI MVP

| Activité                   | Responsable   | Accountable | Consulté                      | Informé    |
| -------------------------- | ------------- | ----------- | ----------------------------- | ---------- |
| Spike harnais (S0)         | Dev           | Mohamed     | —                             | équipe     |
| Décisions architecturales  | Dev + Mohamed | Mohamed     | —                             | équipe     |
| Création cursus pilote     | Mohamed       | Mohamed     | Dev (sur faisabilité harnais) | —          |
| Recrutement cohorte pilote | Mohamed       | Mohamed     | —                             | équipe     |
| Pré-vol QA                 | Dev           | Mohamed     | —                             | stagiaires |
| Animation pilote           | Mohamed       | Mohamed     | Dev (hotfixes)                | équipe     |
| Décision Go/No-Go v1.0     | Mohamed       | Mohamed     | Dev                           | équipe     |
