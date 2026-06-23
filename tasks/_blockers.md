# Blockers — Cursus

> **Append-only log** des bloquages rencontrés pendant l'exécution autonome. Chaque entrée est laissée intacte (historique) ; les bloquages résolus sont marqués `✅ RESOLVED [YYYY-MM-DD HH:MM]` en bas, jamais supprimés.

---

## Format d'une entrée

```markdown
## [YYYY-MM-DD HH:MM] ST-XX.Y — <titre court du blocage>

**Contexte** : <2-3 phrases décrivant la situation>

**Ce que j'ai essayé** :

- <tentative 1>
- <tentative 2>

**Hypothèses** :

- <hypothèse 1 + comment la tester>
- <hypothèse 2 + comment la tester>

**Décision nécessaire** : <ce que Mohamed doit décider ou faire>

**Impact** : <quelles Stories sont bloquées par ça>

**Statut** : 🔴 Open / 🟡 In discussion / ✅ RESOLVED [date]
```

---

<!-- Les bloquages apparaîtront ci-dessous, plus récent en haut -->
