# tasks/ — Backlog d'exécution autonome

> 158 fichiers tâche (24 Epics + 134 Stories) qui décrivent **tout ce qu'il faut faire pour construire Cursus**, dans un format conçu pour qu'un agent puisse les exécuter en autonomie sans intervention humaine.

---

## Source de vérité

| Aspect                  | Source                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Spec fonctionnelle**  | Les fichiers `tasks/EP-XX/ST-XX.Y.md` (autonomes, complets)                            |
| **Statut opérationnel** | Le frontmatter YAML de chaque fichier (`status`, `branch`, `pr`, `merged_at`)          |
| **Tracking projet**     | JIRA `https://ousmanesadjad.atlassian.net/jira/software/projects/CUR` (sync via hooks) |
| **Doc produit**         | `docs/product/` (référence externe)                                                    |

Quand tu travailles sur une Story, le **fichier local est la source de vérité**. À la fin, tu push l'état vers JIRA via le hook post-merge.

---

## Structure du dossier

```
tasks/
├── _README.md              ⬅️ ce fichier
├── _index.md               ⬅️ vue d'ensemble navigable (24 Epics × 134 Stories)
├── _workflow.md            ⬅️ workflow d'exécution autonome détaillé
├── _blockers.md            ⬅️ append-only — bloquages rencontrés pendant l'exécution
├── _changelog.md           ⬅️ append-only — Stories mergées par date
└── EP-XX-<slug>/           ⬅️ 1 dossier par Epic
    ├── EP-XX.md            ⬅️ description Epic (objectif, business value, risques)
    └── ST-XX.Y-<slug>.md   ⬅️ 1 fichier par Story (full spec autonome)
```

---

## Format d'un fichier Story

Chaque `tasks/EP-XX/ST-XX.Y-<slug>.md` contient :

### Frontmatter YAML (toujours en haut)

```yaml
---
id: ST-XX.Y # identifiant interne (jamais modifié)
jira: CUR-NN # clé JIRA correspondante
title: Bootstrap projet ... # titre humain
epic: EP-XX # epic parent
status: pending # pending | in_progress | review | done | blocked | cancelled
priority: highest # highest | high | medium | low
size: S # XS | S | M | L | XL | XXL (t-shirt)
story_points: 2 # estimation Fibonacci
sprint: 1 # sprint cible (0 = spike, 1-5 = MVP)
tier: core # core | premium | differentiator
labels: [mvp, core, fondations]
depends_on: [] # IDs des Stories bloquantes (qui doivent être done avant)
blocks: [ST-XX.Y, ST-XX.Z] # IDs des Stories que celle-ci bloque
assigned_agent: null # nom du sub-agent qui travaille dessus
branch: null # nom de la branche Git (rempli au début)
pr: null # URL de la PR (rempli quand ouverte)
started_at: null # timestamp ISO début travail
merged_at: null # timestamp ISO merge sur main
---
```

### Corps Markdown (12 sections obligatoires)

1. **Contexte business** — le "pourquoi" (1-3 paragraphes)
2. **Description fonctionnelle** — le "quoi" côté utilisateur
3. **Critères d'acceptation (Gherkin)** — au moins 3 scénarios `Given/When/Then`
4. **Cas limites à traiter** — au moins 3
5. **Sous-tâches techniques** — au moins 3 TT-XX.Y.Z avec actions concrètes
6. **Dépendances** — Bloqué par / Bloque (avec IDs)
7. **Non-goals** — ce que la Story NE FAIT PAS (au moins 2)
8. **Tests à écrire** — Unit + Integration + E2E + a11y + Security selon pertinence
9. **Observabilité** — logs, métriques, alertes
10. **Considérations sécurité** (si applicable)
11. **Considérations accessibilité** (si UI)
12. **Considérations performance** (si critique)
13. **Definition of Done spécifique** — critères supplémentaires bloquants pour ce ticket

---

## Statuts (machine à états)

```
pending ──────► in_progress ──────► review ──────► done
   │                │                  │              │
   ▼                ▼                  ▼              ▼
cancelled       blocked             blocked        (final)
```

- **pending** : tâche pas encore commencée
- **in_progress** : un agent travaille dessus (frontmatter `assigned_agent` rempli)
- **review** : PR ouverte, en attente de CI/review
- **done** : mergée sur main (frontmatter `merged_at` rempli)
- **blocked** : impossible d'avancer (cause documentée dans `_blockers.md`)
- **cancelled** : abandonnée (rare, justifié)

---

## Comment l'agent met à jour un fichier

Quand l'agent démarre une Story :

```diff
---
- status: pending
+ status: in_progress
- assigned_agent: null
+ assigned_agent: code-writer
- branch: null
+ branch: feat/ST-01.1-bootstrap
- started_at: null
+ started_at: 2026-06-15T08:30:00Z
---
```

Quand la PR est ouverte :

```diff
---
- status: in_progress
+ status: review
- pr: null
+ pr: https://github.com/cursus-app/cursus/pull/12
---
```

Quand mergée :

```diff
---
- status: review
+ status: done
- merged_at: null
+ merged_at: 2026-06-15T11:45:00Z
---
```

---

## Commandes Claude Code utiles sur tasks/

| Commande              | Action                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `/audit-tasks`        | Lance le sub-agent `task-auditor` sur les 158 fichiers — vérifie les 12 critères, bloque si <10/12 |
| `/status`             | Vue d'ensemble : combien `pending` / `in_progress` / `review` / `done` / `blocked`, par sprint     |
| `/start-task ST-XX.Y` | Charge le fichier, suit le workflow d'exécution autonome                                           |
| `/start-sprint N`     | Enchaîne **toutes** les Stories du Sprint N dans l'ordre des dépendances                           |
| `/sync-jira`          | Push l'état des frontmatter vers JIRA (status, links)                                              |

Plus de détails dans `_workflow.md`.

---

## Génération initiale des 158 fichiers

Les fichiers ont été générés à partir des tickets JIRA enrichis (mai 2026) qui respectent la checklist qualité 12 critères (`docs/product/11-ticket-quality-checklist.md`). Score moyen initial : ~11.5/12.

Pour re-générer un fichier depuis JIRA (si modifié manuellement dans JIRA après cette génération) :

```bash
/sync-jira-to-local ST-XX.Y
```

---

## Évolution du backlog

Pour **ajouter** une Story :

1. Créer le ticket dans JIRA (project CUR)
2. Lancer `/sync-jira-to-local` pour pull le nouveau ticket en local
3. Vérifier le score qualité via `/audit-tasks`

Pour **supprimer** une Story :

1. Marquer `status: cancelled` dans le frontmatter
2. Ne pas supprimer le fichier (historique préservé)

Pour **modifier** une Story :

- Si pas encore commencée : modifier directement le fichier markdown
- Si en cours / done : créer une nouvelle Story de modification, garder l'original intact
