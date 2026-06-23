---
description: Marquer la Story courante comme terminée. Update frontmatter, sync JIRA, append au changelog.
---

Tu vas marquer la Story de la branche courante comme `done`.

## Workflow

1. Identifier la Story :
   - Branche courante : `git branch --show-current`
   - Parser : `feat/ST-XX.Y-<slug>` → Story ID

2. Vérifier que la PR est mergée :
   - `gh pr view --json state,mergedAt`
   - Si pas mergée → STOP, message "PR pas encore mergée"

3. Update frontmatter `tasks/EP-XX/ST-XX.Y-<slug>.md` :

   ```yaml
   status: done
   merged_at: <timestamp ISO du merge>
   ```

4. Append à `tasks/_changelog.md` :

   ```
   [YYYY-MM-DD HH:MM] DONE ST-XX.Y — <titre> (PR #NN)
   ```

5. Invoquer sub-agent `pm-synchronizer` mode `local-to-jira` pour la Story
   - Transition JIRA → Done
   - Comment avec lien PR

6. Update `tasks/_index.md` (compteurs)

7. Suggérer la prochaine Story du sprint :
   - Stories du sprint en cours avec `status: pending` ET `depends_on` toutes `done`
   - Retourner la première (ou suggérer `/start-sprint N`)
