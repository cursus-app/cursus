---
description: Vue d'ensemble du backlog. Compte les Stories par status et sprint, identifie le sprint en cours, liste les Stories prêtes à démarrer.
---

Tu vas produire un dashboard rapide du backlog Cursus.

## Workflow

### 1. Compter Stories par status

Parser tous les frontmatter de `tasks/EP-*/ST-*.md` :

```
Status      Count
─────────────────
pending     N
in_progress N
review      N
done        N
blocked     N
cancelled   N
─────────────────
TOTAL       134
```

### 2. Compter par sprint

```
Sprint  Pending  In Progress  Review  Done  Blocked
────────────────────────────────────────────────────
0       1        0            0       0     0       (Spike)
1       12       2            1       5     0
2-5     ...
v1.1+   48       0            0       0     0       (post-MVP)
```

### 3. Identifier le sprint en cours

Le sprint actif est celui avec au moins une Story `in_progress`/`review`, ou avec `pending` et toutes les Stories des sprints précédents `done`/`cancelled`.

### 4. Lister les Stories prêtes du sprint actif

Story prête = `status: pending` ET toutes `depends_on` `done`.

```
🟢 Prêtes (peuvent démarrer maintenant)
- ST-01.4 (CUR-28) — Schéma DB initial — 3 SP

🟡 Bloquées par dépendance pas done
- ST-01.7 (CUR-31) — attend ST-01.1, ST-01.3

⏸️ Bloquées par décision humaine
- ST-XX.Y — voir _blockers.md
```

### 5. Lire les derniers blockers

Si `tasks/_blockers.md` existe, montrer les 3 derniers non résolus.

### 6. Stats temps

Lire `tasks/_changelog.md` :

- Stories mergées cette semaine
- Vélocité moyenne (story points / semaine)

## Output

Format Markdown propre, prêt à coller dans Slack/Discord, avec recommandation d'action immédiate. Pas de longues explications, juste un dashboard exécutable.
