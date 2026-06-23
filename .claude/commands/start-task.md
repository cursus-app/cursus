---
description: Travailler sur une Story spécifique du backlog (1 Story = 1 PR). Suit le workflow autonome en 13 étapes documenté dans tasks/_workflow.md.
---

Tu vas exécuter la Story spécifiée en argument selon le workflow autonome de Cursus.

## Argument attendu

Format : `ST-XX.Y` (ex : `ST-01.1`)

Si pas d'argument fourni, demande lequel.

## Workflow (résumé — détail dans `tasks/_workflow.md`)

1. **Charger contexte** : lis `tasks/EP-XX/ST-XX.Y-<slug>.md` complet + CLAUDE.md
2. **Vérifier dépendances** : tous les `depends_on` doivent être `status: done`. Sinon STOP.
3. **Marquer in_progress** : update frontmatter, sync JIRA
4. **Créer branche** : `git checkout -b feat/ST-XX.Y-<slug>`
5. **Implémenter** : sub-agent `code-writer` si Story > 5 SP
6. **Tester** : sub-agent `test-writer` en parallèle. Cible 80% coverage
7. **Quality gates** : `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
8. **Self-review** : sub-agent `code-reviewer`. Score ≥ 8/10 requis
9. **Commit** : conventional commit message
10. **PR** : `gh pr create` avec template (AC cochés, coverage, score reviewer)
11. **Attendre CI** : `gh pr checks --watch`
12. **Auto-merge** : si CI verte → `gh pr merge --squash --delete-branch --auto`
13. **Post-merge** : update frontmatter `status: done`, sync JIRA, log `_changelog.md`

## Hard stops (alerter Mohamed avant d'agir)

- Migration Prisma destructive (DROP)
- Engagement financier
- 3 essais d'auto-fix CI échouent
- Reviewer score < 6/10
- Secret leaké détecté

En cas de hard stop : append entrée dans `tasks/_blockers.md` avec contexte, hypothèses, décision nécessaire.

## Sub-agents à invoquer

| Étape | Sub-agent         | Quand                            |
| ----- | ----------------- | -------------------------------- |
| 5     | `code-writer`     | Story > 5 SP ou logique complexe |
| 6     | `test-writer`     | Toujours, en parallèle           |
| 8     | `code-reviewer`   | Toujours après quality gates     |
| 13    | `pm-synchronizer` | Toujours post-merge              |

## Output final attendu

Mise à jour du frontmatter, commit + PR, et un récap :

```markdown
# ST-XX.Y — Done ✅ / Blocked 🔴 / In Review 🟡

- Branche : feat/ST-XX.Y-<slug>
- PR : <url>
- Coverage : XX%
- Reviewer score : X/10
- Temps total : Xh

## Fichiers touchés

- ...

## Tests ajoutés

- ...

## Prochaine Story : ST-XX.Z (ou "Sprint terminé")
```
