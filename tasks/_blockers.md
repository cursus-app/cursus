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

## [2026-06-26 14:40] ST-04.4 — Bloquée par ST-08.1 (sprint 3 — écheancier / calendrier)

**Contexte** : ST-04.4 (Echéancier et gestion du décalage) dépend de ST-04.1 (CRUD cohorte) ET ST-08.1 (module calendrier sprint 3). ST-04.1 sera mergé ce sprint, mais ST-08.1 est planifié en sprint 3.

**Ce que j'ai essayé** :

- Vérification des dépendances dans le frontmatter YAML de ST-04.4

**Hypothèses** :

- ST-08.1 peut être avancé au sprint 2 si la complexité le permet (à évaluer)

**Décision nécessaire** : Mohamed doit confirmer si ST-04.4 reste bloquée jusqu'au sprint 3 ou si ST-08.1 peut être implémenté plus tôt.

**Impact** : ST-04.4 ne peut pas démarrer ce sprint. 1 story (2 SP) reportée.

**Statut** : 🔴 Open
