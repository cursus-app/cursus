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
