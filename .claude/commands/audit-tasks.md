---
description: Lance le sub-agent task-auditor sur les 158 task files. Vérifie les 12 critères, calcule un score, liste les tickets sous le seuil 10/12.
---

Tu vas lancer le sub-agent `task-auditor` pour vérifier la qualité de tous les task files.

## Workflow

1. Invoque le sub-agent :

```typescript
await Task({
  description: 'Audit qualité 158 task files',
  subagent_type: 'task-auditor',
  prompt:
    'Mode: audit global. Analyse tous les fichiers tasks/EP-*/ST-*.md selon les 12 critères. Retourne le score moyen, la liste des fichiers <10/12, et les patterns de manques.',
});
```

2. Récupère le rapport
3. Présente à Mohamed :
   - Score moyen global
   - Top 5 manques fréquents
   - Stories à corriger en priorité (Sprint en cours d'abord)
4. Propose action :
   - ≥ 11/12 : "Tout est bon, prêt pour `/start-sprint`"
   - 10-10.9/12 : "Acceptable, mais X Stories à corriger avant de les démarrer"
   - < 10/12 : "Qualité insuffisante, re-générer depuis JIRA via pm-synchronizer"

## Argument optionnel

`--story=ST-XX.Y` pour auditer une seule Story.
