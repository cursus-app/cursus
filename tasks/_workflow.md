# tasks/\_workflow.md — Workflow d'exécution autonome

> Ce document décrit **exactement comment un agent doit travailler** sur les Stories du backlog. Suivi strict obligatoire pour garantir reproductibilité et qualité.

---

## Mode 1 — `/start-task ST-XX.Y` (exécuter UNE Story)

### Étape 1 — Charger le contexte

```
1. Lire CLAUDE.md (auto-chargé)
2. Lire tasks/EP-XX-<slug>/ST-XX.Y-<slug>.md (la Story à exécuter)
3. Vérifier les dépendances :
   - Pour chaque depends_on dans le frontmatter
   - Vérifier que status: done sur la Story dépendante
   - Si une dépendance n'est PAS done → STOP, log dans _blockers.md, demander à Mohamed
4. Lire le ticket JIRA en parallèle (sanity check : éviter divergence)
```

### Étape 2 — Marquer in_progress

```
1. Update frontmatter :
   - status: in_progress
   - assigned_agent: <nom de l'agent en cours>
   - started_at: <timestamp ISO>
2. Sync JIRA : transition du ticket vers "In Progress"
3. Append entrée dans tasks/_changelog.md :
   [YYYY-MM-DD HH:MM] STARTED ST-XX.Y — <titre>
```

### Étape 3 — Créer la branche

```bash
git checkout main
git pull origin main
git checkout -b feat/ST-XX.Y-<slug-kebab>
```

Update frontmatter : `branch: feat/ST-XX.Y-<slug-kebab>`

### Étape 4 — Implémenter

```
1. Lire les sous-tâches techniques (TT-XX.Y.Z) du fichier
2. Pour chaque TT, implémenter dans l'ordre :
   - Code de production dans app/, server/, prisma/, etc.
   - Composants UI selon design system (10-design-system.md)
   - Endpoints API avec validation Zod
   - Migrations Prisma si schéma touché
3. Respect strict des conventions :
   - TypeScript strict, pas de any
   - Zod aux frontières
   - Pattern Prisma singleton
   - Composants @nuxt/ui en priorité
   - Tailwind v4 utility classes uniquement
```

**Si Story > 5 story points → utiliser sub-agent code-writer pour gros morceaux et reviewer toi-même.**

### Étape 5 — Tester (PARALLÈLE à l'étape 4)

```
Lancer en parallèle (Task tool) sub-agent test-writer :
- Tests unit pour les helpers / composables / services
- Tests integration pour les endpoints API
- Tests E2E Playwright pour les parcours utilisateur (si UI)
- Tests A11y (axe-core) pour les composants UI
- Tests RLS négatifs si la Story touche aux données sensibles
- Tests harnais sur repos fixtures si la Story touche EP-06
```

Cible **coverage ≥80%** sur le code modifié.

### Étape 6 — Vérifier qualité locale

```bash
pnpm lint                # ESLint 9 — doit passer
pnpm typecheck           # vue-tsc strict — doit passer
pnpm test                # Vitest — doit passer + coverage ≥80% sur fichiers modifiés
pnpm test:e2e            # Playwright si UI touchée
pnpm build               # Nuxt build — doit passer
```

Si une étape échoue → corriger jusqu'à OK. **Max 3 tentatives**, sinon `_blockers.md` + STOP.

### Étape 7 — Self-review (sub-agent code-reviewer)

Lancer le sub-agent `code-reviewer` avec :

- Le diff Git de la branche
- Le fichier `tasks/EP-XX/ST-XX.Y-<slug>.md` (pour vérifier les AC)
- `09-engineering-playbook.md` (pour les standards)

Le sub-agent retourne une note `/10` et une liste de remarques.

- Si note ≥ 8/10 → continuer
- Si note < 8/10 → appliquer les corrections, refaire le self-review
- Max 2 itérations, sinon escalation `_blockers.md`

### Étape 8 — Commit

```bash
git add .
git commit -m "feat(scope): description courte

Body optionnel expliquant les choix non évidents.

Closes ST-XX.Y / CUR-NN"
```

**Conventional commits OBLIGATOIRE** : `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `perf`, `style`, `build`, `ci`.

### Étape 9 — Push + ouvrir PR

```bash
git push -u origin feat/ST-XX.Y-<slug>
gh pr create \
  --title "ST-XX.Y: <titre>" \
  --body "$(cat <<EOF
## Story
$(yq '.title' tasks/EP-XX/ST-XX.Y.md)

## Critères d'acceptation cochés
- [x] AC 1
- [x] AC 2
- [x] AC 3

## Tests
- Coverage : XX%
- E2E : OK
- A11y : OK

## Sub-agent reviewer score
9/10 — voir comments inline

## Closes
- ST-XX.Y
- CUR-NN

🤖 Generated with Claude Code
EOF
)"
```

Update frontmatter :

- `status: review`
- `pr: <url retournée par gh>`

### Étape 10 — Attendre CI verte

```bash
gh pr checks --watch
```

- Si CI verte → étape 11
- Si CI rouge → debug, push fix, max 3 push de correctifs
- Si toujours rouge après 3 push → `_blockers.md` + STOP + demander à Mohamed

### Étape 11 — Auto-merge

**Si autonomie totale activée (option par défaut)** :

```bash
gh pr merge --squash --delete-branch --auto
```

**Sinon** (semi-autonomie) :

- STOP ici
- Append `[YYYY-MM-DD HH:MM] AWAITING REVIEW ST-XX.Y — <pr url>` dans `_changelog.md`
- Passer à la Story suivante si en mode sprint

### Étape 12 — Post-merge

Une fois la PR mergée (auto ou par humain) :

```
1. Update frontmatter :
   - status: done
   - merged_at: <timestamp ISO>
2. Sync JIRA : transition du ticket vers "Done"
3. Append dans tasks/_changelog.md :
   [YYYY-MM-DD HH:MM] DONE ST-XX.Y — <titre>
4. Trigger hook post-merge (.claude/hooks/post-merge.sh) :
   - Notification Slack/Discord si configuré
   - Update tasks/_index.md (compteurs)
5. Continuer à la Story suivante (si en mode sprint)
```

---

## Mode 2 — `/start-sprint <N>` (exécuter TOUT un sprint)

### Setup

```
1. Lire tasks/_index.md → identifier toutes les Stories avec sprint: N
2. Calculer l'ordre topologique selon depends_on
3. Filtrer celles avec status: pending
4. Estimer durée totale (somme des story_points × 1.5h en moyenne)
5. Confirmer à l'utilisateur : "Je vais enchaîner X Stories du Sprint N. Estimation : Y heures. Go ?"
6. Attendre validation explicite
```

### Boucle d'exécution

```
For Story in ordered_stories:
    if Story.depends_on includes Story_not_done:
        log warning, skip, continue

    Execute /start-task Story  (étapes 1-12 ci-dessus)

    if status == blocked:
        log in _blockers.md
        skip dependents (mark cancelled or postponed)

    if 3 consecutive blocks:
        STOP sprint, présenter le résumé

    Sleep 30s entre chaque Story (laisser Vercel deploy preview se stabiliser)
```

### Récap de fin de sprint

```markdown
# Sprint N — Récap [YYYY-MM-DD HH:MM]

## ✅ Done (X Stories, Y story points)

- ST-01.1 (CUR-25) — PR #12 mergée à 09:45
- ST-01.2 (CUR-26) — PR #13 mergée à 11:20
- ...

## 🟡 En review (en attente CI / merge)

- ST-XX.Y (CUR-NN) — PR #15

## 🔴 Bloqués (cf \_blockers.md)

- ST-XX.Y (CUR-NN) — raison courte

## ⏭️ Reportées au sprint suivant

- ST-XX.Y — dépendait d'une Story bloquée

## 🎯 Métriques

- Vélocité réalisée : X story points
- Vélocité prévue : Y story points
- Temps total : Z heures
- Coverage moyenne : XX%
- Tests E2E ajoutés : NN

## 🚨 Décisions Mohamed nécessaires

- Bloquage 1 → décision à prendre
- ...

## 🎁 Bonus (refactos opportuns / améliorations détectées)

- ...
```

---

## Règles de sécurité (HARD STOPS)

L'agent **arrête immédiatement** et demande à Mohamed dans ces cas :

| Trigger                                                        | Action                                     |
| -------------------------------------------------------------- | ------------------------------------------ |
| Migration Prisma destructive (DROP)                            | STOP, demander validation avec impact      |
| Engagement financier (upgrade plan)                            | STOP, demander validation                  |
| Modification hors périmètre de la Story (refacto opportuniste) | STOP, créer Story dédiée                   |
| 3 essais d'auto-fix CI échouent                                | STOP, présenter le bloquage + hypothèses   |
| 1 dépendance JIRA pas Done                                     | STOP cette Story, skip, log                |
| Sub-agent reviewer note < 5/10 (problème majeur détecté)       | STOP, présenter analyse                    |
| Secret leaké détecté par gitleaks                              | STOP IMMÉDIAT, alerter Mohamed             |
| Test E2E qui révèle un bug dans une Story déjà mergée          | STOP, créer Story de fix, prévenir Mohamed |
| Sprint goal devenant inatteignable (>50% Stories bloquées)     | STOP sprint, présenter recap d'urgence     |

---

## Sub-agents disponibles

Définis dans `.claude/agents/` :

| Agent               | Rôle                                           | Quand l'utiliser                                                      |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| **code-writer**     | Implémente le code de la Story                 | Story > 5 SP, ou code complexe (Prisma migrations, harnais, Realtime) |
| **test-writer**     | Écrit les tests (unit, integration, E2E, a11y) | Toujours en parallèle de code-writer                                  |
| **code-reviewer**   | Self-review critique avant PR                  | Toujours, étape 7                                                     |
| **task-auditor**    | Vérifie les 12 critères d'un task file         | Lors de `/audit-tasks`                                                |
| **pm-synchronizer** | Sync JIRA ↔ local (status, PR links)           | Après chaque transition (in_progress, review, done)                   |

Lancement type :

```typescript
// Dans Claude Code
await Task({
  description: 'Écrire tests pour ST-01.1',
  subagent_type: 'test-writer',
  prompt: `
    Écris la suite de tests complète pour la Story ST-01.1 (tasks/EP-01-fondations/ST-01.1-bootstrap.md).
    
    Cible : coverage ≥80% sur les fichiers modifiés dans la branche feat/ST-01.1-bootstrap.
    
    Couvrir : unit (validation Zod env), integration (smoke test page 200), CI lint.
    
    Reporter les fichiers de tests créés et le coverage atteint.
  `,
});
```

---

## En cas de problème non listé

L'agent **doit** :

1. Documenter le problème dans `_blockers.md`
2. Présenter 2-3 hypothèses de résolution
3. Ne pas inventer une solution risquée — préférer la prudence et déférer à Mohamed
4. Reprendre la Story suivante si en mode sprint

Si le problème est **immédiatement bloquant pour tout le sprint** (ex: CI cassée globalement) → STOP sprint, alerter, ne pas continuer.
