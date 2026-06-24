# Matrice RLS — Cursus

> Source de vérité : policies Supabase Postgres activées sur chaque table.
> Mise à jour à chaque modification de schéma ou de policy RLS.
> Référence : `tests/rls/` (suite de tests d'intégration).

## Légende

| Symbole | Signification                                      |
| ------- | -------------------------------------------------- |
| ✅      | Autorisé sans restriction                          |
| ❌      | Refusé (RLS bloque, 0 rows ou erreur policy)       |
| 🔒      | Propre seulement (`user_id = auth.uid()`)          |
| 🏠      | Cohorte seulement (même cohorte que l'utilisateur) |
| 🔍      | Lecture publique (profils publics ou certificats)  |

## Rôles

| Identifiant           | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `STAGIAIRE`           | Stagiaire inscrit dans une cohorte                           |
| `FORMATEUR_PRINCIPAL` | Formateur principal assigné à une cohorte                    |
| `CO_FORMATEUR`        | Co-formateur assigné à un ou plusieurs modules d'une cohorte |
| `ADMIN`               | Administrateur global (global_role = ADMIN)                  |
| `anonymous`           | Utilisateur non authentifié                                  |

---

## Table : `users`

> Profils utilisateurs. Contient email, rôle global, données personnelles.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | 🏠           | ✅    | 🔍        |
| INSERT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | 🔒        | ❌                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Un stagiaire voit et modifie uniquement son propre profil (`id = auth.uid()`).
- Un formateur/co-formateur peut voir les profils des membres de ses cohortes (sans PII sensibles).
- Anonymous : uniquement les profils avec `is_public = true` (portfolio public, vérification certificat).
- `global_role` ne peut être modifié que par un ADMIN (policy `CHECK` sur la colonne).

---

## Table : `invitations`

> Tokens d'invitation par email. Contient email destinataire, rôle, cohorte cible.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | ❌           | ✅    | ❌        |
| INSERT    | ❌        | 🏠                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | 🏠                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | 🏠                  | ❌           | ✅    | ❌        |

**Notes :**

- Un stagiaire peut uniquement voir l'invitation qui le concerne (`email = auth.email()`).
- Un formateur principal gère les invitations de sa cohorte uniquement.
- Pas de DELETE physique sur invitations acceptées (audit trail).

---

## Table : `cohortes`

> Cohortes de formation. Données structurantes du cursus.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🏠        | 🏠                  | 🏠           | ✅    | ❌        |
| INSERT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | 🏠                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Toute personne authentifiée membre d'une cohorte peut la lire.
- Seul un formateur principal peut modifier sa cohorte (pas d'autres cohortes).
- Création et suppression réservées à l'ADMIN uniquement.

---

## Table : `memberships`

> Appartenance utilisateur ↔ cohorte avec rôle.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | 🏠           | ✅    | ❌        |
| INSERT    | ❌        | 🏠                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | 🏠                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | 🏠                  | ❌           | ✅    | ❌        |

**Notes :**

- Un stagiaire voit uniquement sa propre appartenance.
- Un formateur principal peut gérer les memberships de sa cohorte (ajouter/retirer des membres).
- Escalade de rôle interdite : un formateur ne peut pas se donner le rôle ADMIN via membership.

---

## Table : `submissions`

> Livrables soumis par les stagiaires. Données les plus sensibles de l'app.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | 🏠           | ✅    | ❌        |
| INSERT    | 🔒        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | 🏠                  | 🏠           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Un stagiaire ne peut soumettre qu'en son propre nom (`user_id = auth.uid()`).
- Un stagiaire ne peut pas modifier ses soumissions après envoi (seul un formateur peut override).
- Le formateur/co-formateur peut lire et valider/override les submissions de sa cohorte.
- Pas de DELETE physique : soft-delete via `status = BLOCKED`.

---

## Table : `harness_runs`

> Résultats d'exécution du harnais GitHub Actions.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | 🏠           | ✅    | ❌        |
| INSERT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Lecture via la submission parente (RLS transitive : accès harness_run si accès à la submission).
- INSERT/UPDATE réservés à l'ADMIN et au service role (webhook GitHub Actions).
- Aucune modification utilisateur directe autorisée.

---

## Table : `alerts`

> Alertes générées automatiquement sur les stagiaires (retard, blocage, etc.).

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | 🏠           | ✅    | ❌        |
| INSERT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | 🏠                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Un stagiaire peut voir ses propres alertes (pour information).
- Un formateur principal peut résoudre (`resolved_at`, `resolved_by_id`) les alertes de sa cohorte.
- Les alertes sont créées par des jobs Inngest (service role), pas par des utilisateurs.

---

## Table : `notifications`

> Notifications in-app pour chaque utilisateur.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🔒                  | 🔒           | ✅    | ❌        |
| INSERT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | 🔒        | 🔒                  | 🔒           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Chaque utilisateur ne voit et ne modifie que ses propres notifications (`user_id = auth.uid()`).
- UPDATE autorisé uniquement pour marquer comme lu (`read_at`).
- Création par service role (jobs Inngest).

---

## Table : `audit_logs`

> Journal d'audit immuable de toutes les actions sensibles.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| INSERT    | ❌        | ❌                  | ❌           | ❌    | ❌        |
| UPDATE    | ❌        | ❌                  | ❌           | ❌    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ❌    | ❌        |

**Notes :**

- Table append-only : INSERT via service role uniquement (middleware Nitro).
- AUCUN UPDATE ni DELETE autorisé, même pour ADMIN (immuabilité de l'audit trail).
- Lecture réservée à l'ADMIN pour investigation.
- En pratique : l'ADMIN lit via l'interface d'administration, pas directement PostgREST.

---

## Table : `quiz_attempts`

> Tentatives de quiz par les stagiaires.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | 🏠           | ✅    | ❌        |
| INSERT    | 🔒        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Un stagiaire ne peut soumettre qu'en son propre nom.
- Immutabilité des tentatives une fois soumises (pas d'UPDATE).

---

## Table : `user_badges`

> Badges décernés aux stagiaires.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | 🏠                  | 🏠           | ✅    | 🔍        |
| INSERT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Les badges sont décernés automatiquement par des jobs Inngest (service role).
- Les badges des profils publics sont visibles par anonymous (portfolio public).

---

## Table : `feature_flags`

> Flags de fonctionnalités et configuration du rollout.

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | ✅        | ✅                  | ✅           | ✅    | ❌        |
| INSERT    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Lecture autorisée à tous les utilisateurs authentifiés (nécessaire pour le client).
- Modification réservée à l'ADMIN.

---

## Table : `gdpr_export_jobs`

> Jobs d'export RGPD (droit à la portabilité).

| Opération | STAGIAIRE | FORMATEUR_PRINCIPAL | CO_FORMATEUR | ADMIN | anonymous |
| --------- | --------- | ------------------- | ------------ | ----- | --------- |
| SELECT    | 🔒        | ❌                  | ❌           | ✅    | ❌        |
| INSERT    | 🔒        | ❌                  | ❌           | ✅    | ❌        |
| UPDATE    | ❌        | ❌                  | ❌           | ✅    | ❌        |
| DELETE    | ❌        | ❌                  | ❌           | ✅    | ❌        |

**Notes :**

- Chaque utilisateur peut uniquement voir et créer ses propres demandes d'export.
- La complétion (UPDATE) est réalisée par service role (job Inngest).

---

## Couverture des tests

| Table              | Fichier de test                     | Cas négatifs | Cas positifs |
| ------------------ | ----------------------------------- | ------------ | ------------ |
| `users`            | `tests/rls/users.rls.spec.ts`       | 4            | 3            |
| `invitations`      | (à implémenter)                     | -            | -            |
| `cohortes`         | `tests/rls/cohortes.rls.spec.ts`    | 4            | 3            |
| `memberships`      | `tests/rls/memberships.rls.spec.ts` | 4            | 3            |
| `submissions`      | `tests/rls/submissions.rls.spec.ts` | 5            | 4            |
| `harness_runs`     | (inclus dans submissions)           | 2            | 1            |
| `alerts`           | (à implémenter)                     | -            | -            |
| `notifications`    | (à implémenter)                     | -            | -            |
| `audit_logs`       | `tests/rls/audit_logs.rls.spec.ts`  | 4            | 1            |
| `quiz_attempts`    | (à implémenter)                     | -            | -            |
| `user_badges`      | (à implémenter)                     | -            | -            |
| `feature_flags`    | (à implémenter)                     | -            | -            |
| `gdpr_export_jobs` | (à implémenter)                     | -            | -            |

---

## Processus d'audit

1. **CI** : `pnpm test:rls` est bloquant sur chaque PR modifiant un schéma ou une policy.
2. **Trimestriel** : revue manuelle par le security champion des policies Supabase.
3. **Staging** : red team manuelle avant chaque déploiement majeur.
4. **Drift** : toute divergence entre cette matrice et les policies réelles est un incident P1.

---

_Dernière mise à jour : 2026-06-24 — ST-15.6_
