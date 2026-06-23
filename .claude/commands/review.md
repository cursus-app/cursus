---
description: Lance le sub-agent code-reviewer sur la PR/branche courante. Retourne un score /10 et des remarques actionnables.
---

Tu vas lancer une review critique de la PR/branche courante via le sub-agent `code-reviewer`.

## Workflow

1. Identifier le contexte :
   - Branche : `git branch --show-current`
   - PR : `gh pr view --json number` si existe
   - Sinon : diff `main...HEAD`

2. Identifier la Story :
   - Parser branche : `feat/ST-XX.Y-<slug>` → ST-XX.Y
   - Localiser `tasks/EP-XX/ST-XX.Y-<slug>.md`

3. Invoquer sub-agent `code-reviewer` :

```typescript
await Task({
  description: 'Review PR ST-XX.Y',
  subagent_type: 'code-reviewer',
  prompt: `
    Review la PR/branche courante pour la Story ST-XX.Y.
    
    Inputs :
    - Diff : git diff main...HEAD
    - Task file : tasks/EP-XX/ST-XX.Y-<slug>.md
    - Standards : docs/product/09-engineering-playbook.md
    - Design : docs/product/10-design-system.md (si UI)
    
    Applique les 12 critères. Retourne note /10 + remarques classées (must/should/nit/praise).
  `,
});
```

4. Récupérer rapport, présenter à Mohamed
5. Si ≥ 8 → recommander merge
6. Si 6-7 → demander à code-writer d'appliquer `must:` et `should:`
7. Si < 6 → recommander refonte ou clarification produit
