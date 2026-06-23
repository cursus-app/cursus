---
description: Synchronise les frontmatter locaux avec JIRA. Mode bi-directionnel selon argument (push, pull, audit).
---

Tu vas synchroniser l'état entre `tasks/` (local) et JIRA project CUR.

## Arguments

- `push` (défaut) : pousser l'état local vers JIRA
- `pull` : récupérer changements de JIRA vers local
- `audit` : comparer sans modifier, lister divergences
- `--story=ST-XX.Y` : limiter à une Story

## Workflow

1. Charger via ToolSearch : `searchJiraIssuesUsingJql`, `getJiraIssue`, `editJiraIssue`, `transitionJiraIssue`

2. Invoquer sub-agent `pm-synchronizer` :

```typescript
await Task({
  description: 'Sync JIRA/local',
  subagent_type: 'pm-synchronizer',
  prompt: `
    Mode : ${args.mode || 'push'}
    Story filter : ${args.story || 'all'}
    
    Configuration :
    - cloudId : f2195618-fd43-49c7-bd5f-bdf58c8468c3
    - projectKey : CUR
    
    Suit le workflow documenté dans ton fichier agent.
  `,
});
```

3. Présenter le rapport
