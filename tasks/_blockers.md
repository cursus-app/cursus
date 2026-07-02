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

---

## [2026-06-27 09:45] 💡 AMÉLIORATION — HarnessStatus ↔ useHarnessRunRealtime : duplication subscription

**Contexte** : `HarnessStatus.vue` (ST-05.2) implémente sa propre subscription Supabase Realtime inline + polling fallback. `useHarnessRunRealtime` (ST-06.4) fait la même chose en composable. Les deux coexistent sans se partager la logique.

**Risque** : une future modification Realtime (nouveau statut, changement de table) devra être faite dans les deux endroits. Risque de dérive silencieuse.

**Action suggérée** : créer une story de refacto (1-2 SP) dans EP-06 pour migrer `HarnessStatus.vue` vers `useHarnessRunRealtime`. Non urgent — aucun bug fonctionnel.

**Priorité** : basse — à planifier en Sprint 4 ou 5.

**Statut** : 💡 Improvement (non bloquant)

---

## [2026-06-27 09:45] 💡 AMÉLIORATION — Double source de vérité check labels

**Contexte** : `server/utils/harnessReport.ts` a `CHECK_I18N` hardcodé (labels/messages côté server), et `locales/en.json` + `locales/fr.json` ont `harness.checks.*.label/help` (côté client via `HarnessReport.vue`). Ces deux jeux de données doivent rester synchronisés manuellement.

**Risque** : dérive silencieuse — un check ajouté ou renommé dans le harnais pourrait avoir des labels incohérents entre les logs serveur et l'affichage client.

**Action suggérée** : ajouter un test de cohérence automatique (unit, ~30 min de travail) qui vérifie que chaque `check_id` dans `CHECK_I18N` a une entrée correspondante dans les locales, et vice versa. Non urgent — à déclencher si des checks sont ajoutés en Sprint 4+.

**Priorité** : basse — à planifier quand le harnais sera utilisé en prod ou qu'un nouveau check sera ajouté.

**Statut** : 💡 Improvement (non bloquant)

## [2026-07-02 12:10] PR-84 — Chromatic UI Tests pending (baseline acceptance)

**Contexte** : PR #84 (ST-06.6 Queue Inngest) a toutes ses vérifications CI vertes (lint, typecheck, tests, E2E, build, Lighthouse, security, Chromatic visual regression) sauf "UI Tests" qui est en statut pending : "78 changes must be accepted as baselines" dans le dashboard Chromatic.

**Ce que j'ai essayé** :

- Vérification que ce sont des nouveaux composants (storybook build #18), pas des régressions
- Tous les autres checks CI sont verts

**Hypothèses** :

- Les 78 changements sont de nouveaux baselines (1ère exécution Chromatic pour ces stories), pas des régressions visuelles — Chromatic attend validation humaine
- Résolution : aller sur https://www.chromatic.com/build?appId=6a3f4a5c6071560d89b74a83&number=18 et accepter les baselines

**Décision nécessaire** : Mohamed doit accepter les 78 baselines dans le dashboard Chromatic pour débloquer le merge de PR #84

**Impact** : ST-06.6 reste en statut "review" jusqu'au merge
