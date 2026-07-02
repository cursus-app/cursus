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
[2026-07-02T13:37:27Z] REVIEW ST-07.1 — PR #86 ouverte — quiz builder CRUD + QuizEditor
[2026-07-02T18:57:00Z] DONE ST-20.1 — Setup Command Palette (PR #88 mergée)
[2026-07-02T20:00:00Z] DONE ST-11.1 — Attribution XP automatique (PR #89 mergée)
[2026-07-02T21:15:00Z] DONE ST-11.2 — Système badges (PR #90 mergée)
[2026-07-02T21:43:00Z] DONE ST-06.6 — Queue Inngest pour jobs Harness (PR #91 mergée)
