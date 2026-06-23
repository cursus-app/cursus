---
description: Enchaîner toutes les Stories d'un sprint en autonomie. L'agent travaille pendant des heures sans intervention, rend la main avec un récap.
---

Tu vas exécuter **toutes les Stories du sprint N** selon le workflow autonome.

## Argument attendu

Numéro de sprint (0 à 5+). Ex : `/start-sprint 1`

## Avant de lancer

1. Filtre les Stories de `tasks/` avec `sprint: N`
2. Calcule l'ordre topologique selon `depends_on`
3. Filtre celles avec `status: pending`
4. Affiche le plan et demande confirmation

```
# Plan Sprint N

Stories à exécuter (ordre topologique) :
1. ST-01.1 (CUR-25) — Bootstrap projet — 2 SP — ~3h
2. ST-01.2 (CUR-26) — CI/CD GitHub Actions — 2 SP — ~3h
...

X stories, Y story points, ~Z heures.

Hard stops :
- DB destructive : STOP + ask
- 3 CI fails : STOP + present
- Reviewer < 6/10 : STOP + present

Confirme (y/n) :
```

## Boucle d'exécution

```python
for story in ordered_stories:
    for dep in story.depends_on:
        if dep.status != 'done':
            log skip in _blockers.md
            continue

    result = execute_start_task(story.id)

    if result.status == 'done':
        append _changelog.md
    elif result.status == 'blocked':
        log _blockers.md
        consecutive_blocks += 1
        if consecutive_blocks >= 3:
            STOP sprint
    elif result.status == 'review':
        log _changelog.md as 'AWAITING'

    sleep(30)  # laisser Vercel deploy preview stabiliser
```

## Récap final (rendu à Mohamed)

```markdown
# Sprint N — Récap [YYYY-MM-DD HH:MM]

## ✅ Done (X Stories, Y story points)

| Story   | JIRA   | PR  | Mergée à |
| ------- | ------ | --- | -------- |
| ST-01.1 | CUR-25 | #12 | 09:45    |

## 🟡 En review

| Story | PR  | Statut CI |
| ----- | --- | --------- |

## 🔴 Bloquées (cf \_blockers.md)

| Story | Raison | Décision nécessaire |
| ----- | ------ | ------------------- |

## ⏭️ Reportées au sprint suivant

| Story | Pourquoi |
| ----- | -------- |

## 🎯 Métriques

- Vélocité : X / Y SP (Z%)
- Temps total : XX h
- Coverage moyenne : XX%
- E2E ajoutés : NN
- Lighthouse moyen : XX
- Erreurs Sentry (preview) : 0

## 🚨 Décisions Mohamed nécessaires

1. <bloquage 1> → option A ou B ?

## 🎁 Améliorations identifiées (Stories à créer)

1. Refacto X → bénéfice : ...

## Prochains pas suggérés

- Adresser les X bloquages
- `/start-sprint N+1`
```

## Hard stops du sprint

- 3 Stories consécutives bloquées
- Échec CI catastrophique sur main
- Secret leaké
- Bloquage majeur décision humaine
- Mohamed envoie un message pour interrompre

Quand stop : récap immédiat avec score partiel.
