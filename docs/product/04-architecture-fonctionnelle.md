# 04 — Architecture fonctionnelle

Vue logique du produit, indépendante de la stack technique (celle-ci est dans `07-stack-tech.md`).

---

## Carte des modules fonctionnels

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CURSUS — Application                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   IDENTITY   │  │   CURSUS     │  │   COHORTE    │  │  PROGRESS  │ │
│  │   & ACCESS   │  │   BUILDER    │  │   MGMT       │  │  TRACKING  │ │
│  │              │  │              │  │              │  │            │ │
│  │ - Auth       │  │ - Cursus CRUD│  │ - Cohorte    │  │ - Livrable │ │
│  │ - Rôles      │  │ - Modules    │  │ - Invitation │  │ - Statut   │ │
│  │ - Invitations│  │ - Ressources │  │ - Planning   │  │ - Alertes  │ │
│  │ - OAuth GH   │  │ - Roadmap.sh │  │ - Multi-form │  │ - Override │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   HARNESS    │  │   QUIZ       │  │   CAPSTONE   │  │   PORTFOLIO│ │
│  │ (VALIDATION) │  │              │  │ & SOUTENANCE │  │  & CERTIF  │ │
│  │              │  │              │  │              │  │            │ │
│  │ - GH Actions │  │ - QCM        │  │ - Soumission │  │ - Profil   │ │
│  │ - Checks     │  │ - Texte court│  │ - Grille     │  │  public    │ │
│  │ - Lighthouse │  │ - Tirage     │  │ - Soutenance │  │ - PDF      │ │
│  │ - Tests      │  │  aléatoire   │  │ - 2 essais   │  │ - QR vérif │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   GAMIF      │  │ NOTIFICATIONS│  │  DASHBOARDS  │  │   ADMIN    │ │
│  │              │  │              │  │              │  │            │ │
│  │ - XP         │  │ - In-app     │  │ - Stagiaire  │  │ - Users    │ │
│  │ - Badges     │  │ - Email      │  │ - Formateur  │  │ - Reporting│ │
│  │ - Feed       │  │ - Digest     │  │ - Cohorte    │  │ - Export   │ │
│  │  cohorte     │  │  quotidien   │  │ - Cursus     │  │ - Branding │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Description de chaque module

### 1. Identity & Access

- Authentification email/mot de passe + magic link (pour invitations)
- Connexion OAuth GitHub (obligatoire pour les stagiaires — c'est la base du harnais)
- Rôles : `stagiaire`, `formateur_principal`, `co_formateur`, `admin`
- Système d'invitations (token signé, expire 7 jours)
- Reset mot de passe
- 2FA optionnel (TOTP) en v1.1

### 2. Cursus Builder

- CRUD complet sur un cursus (titre, domaine, niveau, durée, prérequis)
- Composition en modules (semaine N → titre, objectifs, ressources, livrable, quiz, badge)
- Brouillon / Publié / Archivé
- Versionning : modifier un cursus déjà utilisé crée une nouvelle version, les cohortes en cours restent figées sur leur version
- Clonage de cursus
- Import depuis roadmap.sh (squelette uniquement, dans le respect des licences)
- Templates de critères de validation (cases à cocher pour le harnais)

### 3. Cohorte Mgmt

- Création de cohorte (cursus + dates début/fin + rythme + formateurs rattachés)
- Invitation de stagiaires (email)
- Attribution d'un formateur principal (1 obligatoire) + N co-formateurs optionnels
- Co-formateurs peuvent être assignés à des modules spécifiques
- Statut cohorte : `brouillon`, `active`, `terminée`, `archivée`
- Échéancier : décalage en cas de retard collectif (jours fériés, événements)

### 4. Progress Tracking

- Pour chaque (stagiaire × module) : statut (`à venir`, `en cours`, `soumis`, `validé`, `bloqué`, `en alerte`)
- Historique des soumissions (chaque livrable peut être soumis N fois)
- Calcul automatique du statut "en alerte" selon règles configurables :
  - Retard > 48h sans soumission
  - 2 quiz consécutifs ratés
  - 5+ soumissions échouées sur même livrable
  - Bouton "Je suis bloqué" cliqué
- Override : un formateur peut forcer un statut (validation manuelle exceptionnelle)
- Audit log : trace de toutes les modifications de statut

### 5. Harness (Validation automatique)

- Cœur du produit. Implémenté via **GitHub Actions** déclenché par webhook.
- Un livrable a une **fiche de critères** définie par le formateur :
  - Repo existe et est public
  - Branches X, Y, Z existent
  - PR mergée selon stratégie donnée (squash / rebase / merge commit)
  - Tests d'un sous-dossier passent
  - Fichier README.md présent avec sections requises
  - URL de déploiement répond en 200
  - Lighthouse score >= seuil (perf, a11y, best-practices)
  - Commits signés GPG
  - Linter passe (eslint, ruff, etc.)
- Le harnais publie un **rapport structuré** dans l'app (pas un brut log)
- Latence cible : **< 5 min** par run
- Limite : 10 soumissions par livrable, puis blocage jusqu'à action formateur
- Mode "ambitieux" : on chaîne plusieurs jobs (clone → install → test → lighthouse → deploy preview)

### 6. Quiz

- QCM avec une ou plusieurs bonnes réponses
- Texte court (validation par exact match insensible à la casse, ou par revue formateur)
- 5 à 10 questions par quiz
- Tirage aléatoire dans une banque (si la banque a >N questions)
- Ordre des questions et options randomisé
- Affichage du score au stagiaire uniquement
- Pas d'anti-triche fort au MVP (cohérent avec la vision)

### 7. Capstone & Soutenance

- Cycle de vie : `verrouillé` → `débloqué` → `en cours` → `soumis` → `en attente soutenance` → `validé` / `non validé` → `re-tentative` (max 2)
- Stockage de versions intermédiaires (le stagiaire peut soumettre plusieurs fois pour pré-checks)
- Champ "Date prévue de soutenance" + lien visio
- Grille d'évaluation : 5 critères, note /4 par critère, commentaire optionnel
- Score final calculé automatiquement, mention attribuée selon seuil
- Bascule du statut → trigger émission certificat

### 8. Portfolio & Certificat

- Chaque livrable validé alimente le profil
- Profil privé tant que le capstone n'est pas validé
- À la validation du capstone : profil devient public sur un slug propre (`cursus.app/p/karim-d`)
- Le profil public affiche : photo, nom, cursus suivi, liste des livrables (avec liens vers les repos publics), badges, capstone, certificat
- PDF du certificat généré automatiquement (template configurable par l'admin)
- QR code dans le PDF → page publique de vérification (vérification d'intégrité par signature)

### 9. Gamification

- XP : chaque livrable validé donne X XP (X défini par module), chaque quiz validé donne Y XP
- Badges : déclenchés par des règles (premier deploy en prod, capstone livré en avance, 100 % d'un cursus, etc.)
- Feed cohorte : flux d'activité positive ("Marie a débloqué Docker") — désactivable
- **Aucun leaderboard** (anti-pilier)

### 10. Notifications

- In-app : centre de notifications par utilisateur
- Email transactionnel : invitations, alertes, certificat, rappels
- Digest quotidien (8h) pour les formateurs : "X stagiaires en alerte, Y livrables à reviewer"
- Préférences utilisateur (mute par catégorie)

### 11. Dashboards

- **Stagiaire** : progression cursus, semaine en cours, XP/badges, prochaine échéance, mes alertes
- **Formateur principal** : vue cohorte (liste stagiaires + statut), alertes ouvertes, livrables à reviewer (override), capstones à soutenir
- **Cohorte** : avancement médian, qui est où, écarts
- **Cursus** : vue globale d'un cursus pour le formateur qui le maintient

### 12. Admin

- Gestion des utilisateurs (création formateurs, désactivation comptes)
- Reporting agrégé (CSV export)
- Configuration : branding, template certificat, paramètres email, intégrations
- Audit log accessible

---

## Modèle de données (simplifié, niveau conceptuel)

```
┌────────────┐
│   User     │ id, email, role, github_handle, avatar, ...
└────────────┘
      │
      │ 1..N
      ▼
┌────────────┐         ┌──────────────┐
│ Membership │ ◄──────►│   Cohorte    │ id, cursus_version_id, start_date, end_date, status
└────────────┘ N..1    └──────────────┘
                              │ N..1
                              ▼
                       ┌──────────────┐
                       │CursusVersion │ id, cursus_id, version, snapshot_json
                       └──────────────┘
                              │ N..1
                              ▼
                       ┌──────────────┐
                       │   Cursus     │ id, title, domain, level, duration_weeks
                       └──────────────┘
                              │
                              │ 1..N
                              ▼
                       ┌──────────────┐
                       │   Module     │ id, cursus_id, week, title, objectives,
                       │              │ resources_json, deliverable_spec_json,
                       │              │ quiz_id, badge_id
                       └──────────────┘

┌────────────┐
│ Submission │ id, user_id, module_id, repo_url, deploy_url, harness_run_id,
│            │ status, submitted_at, validated_at, overridden_by
└────────────┘
      │
      │ 1..N
      ▼
┌────────────┐
│ HarnessRun │ id, submission_id, started_at, finished_at, status,
│            │ checks_json (liste des résultats par critère)
└────────────┘

┌────────────┐
│   Quiz     │ id, module_id, questions_json
└────────────┘
      │
      ▼
┌────────────┐
│QuizAttempt │ id, user_id, quiz_id, answers_json, score, attempted_at
└────────────┘

┌────────────┐
│  Capstone  │ id, user_id, cohorte_id, status, submission_url,
│  Submission│ deploy_url, soutenance_at, soutenance_link,
│            │ evaluation_json, mention
└────────────┘

┌────────────┐
│   Badge    │ id, code, name, description, icon, criteria_json
└────────────┘
      │
      ▼
┌────────────┐
│ UserBadge  │ id, user_id, badge_id, awarded_at, awarded_by_rule
└────────────┘

┌────────────┐
│   Alert    │ id, user_id, kind, source_id, source_type, created_at,
│            │ resolved_at, resolved_by
└────────────┘

┌────────────┐
│Certificate │ id, user_id, cohorte_id, issued_at, pdf_url, verify_token
└────────────┘

┌────────────┐
│Notification│ id, user_id, type, payload_json, read_at
└────────────┘
```

---

## Flux d'événements clés (event-driven)

L'app aura intérêt à publier des **événements internes** pour découpler les actions et les effets de bord :

| Événement              | Émis quand                           | Conséquences (handlers)                                                     |
| ---------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `submission.created`   | Stagiaire soumet livrable            | → lance HarnessRun, notifie formateurs si premier essai                     |
| `harness.completed`    | GitHub Actions termine               | → update Submission.status, recalcule alertes, attribue XP/badges si validé |
| `submission.validated` | Statut → validé                      | → ajoute au portfolio, déclenche badges, met à jour progression             |
| `stagiaire.blocked`    | Bouton "bloqué" cliqué               | → crée Alert, envoie notif au formateur                                     |
| `progress.stalled`     | Job nocturne détecte retard          | → crée Alert, ajoute au digest formateur                                    |
| `capstone.evaluated`   | Soutenance terminée + grille remplie | → si validé : émet certificat, rend portfolio public                        |
| `certificate.issued`   | Certificat émis                      | → envoie email au stagiaire, met à jour profil public                       |

---

## Considérations transverses

### Sécurité

- Auth forte (mot de passe + magic link), 2FA en v1.1
- RLS (Row Level Security) au niveau base de données pour isoler les cohortes
- Tokens d'invitation signés (JWT) avec expiration
- Vérification publique du certificat par signature asymétrique (un tiers peut vérifier sans appeler l'API)

### Performance

- Dashboard cohorte doit charger en < 1.5s pour 20 stagiaires
- Le harnais ne doit jamais bloquer l'UI : asynchrone, polling ou realtime push

### Internationalisation

- MVP : français uniquement
- v1.1 : i18n (FR/EN minimum) si demande pour ouvrir à d'autres organisations

### Accessibilité

- WCAG 2.1 AA visé. Notamment : navigation clavier complète, contraste, labels ARIA sur le harnais (qui est très textuel)

### Conformité (RGPD)

- Export des données stagiaire à la demande
- Droit à l'oubli : possibilité de supprimer un compte (le portfolio public s'éteint, le certificat reste vérifiable de manière anonymisée)
- Pas de tracking analytique tiers au MVP
