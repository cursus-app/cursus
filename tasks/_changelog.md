# Changelog — Cursus

> **Append-only log** des événements de cycle de vie des Stories. Utilisé par `/status` pour calculer la vélocité.

---

## Format

```
[YYYY-MM-DDTHH:MM:SSZ] EVENT ST-XX.Y — <titre>
```

Événements :

- `STARTED` : Story passée en `in_progress`
- `REVIEW` : PR ouverte, en attente CI/review
- `DONE` : PR mergée, Story terminée
- `BLOCKED` : Bloquage détecté (voir `_blockers.md`)
- `CANCELLED` : Story annulée
- `REOPENED` : Story re-ouverte (rare)

---

<!-- Les événements apparaîtront ci-dessous, plus récent en bas -->

[2026-06-30T16:00:00Z] STARTED ST-01.6 — Spike PoC harnais GitHub Actions
[2026-06-30T16:15:00Z] REVIEW ST-01.6 — PR #83 ouverte (feat/ST-01.6-spike-poc-harness)
[2026-06-30T20:30:00Z] DONE ST-01.6 — Spike PoC harnais GitHub Actions (PR #83 mergée)

[2026-07-02T09:00:00Z] STARTED ST-06.6 — Queue Inngest pour jobs Harness
[2026-07-02T11:50:00Z] REVIEW ST-06.6 — PR #84 ouverte (feat/ST-06.6-queue-inngest-jobs-harness)
[2026-07-02T09:55:22Z] STARTED ST-13.3 — Fiche stagiaire détaillée (vue 360)
[2026-07-02T11:43:16Z] REVIEW ST-13.3 — PR #85 ouverte (fiche stagiaire 360)
