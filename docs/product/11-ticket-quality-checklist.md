# 11 — Méthode d'audit qualité des tickets JIRA

> Document de référence pour garantir qu'un ticket JIRA est **autonome** (self-contained), **actionnable** (un dev peut commencer sans poser de questions), et **vérifiable** (la complétion peut être objectivement attestée).

---

## 1. Principe directeur

> **Un ticket JIRA doit pouvoir être lu et compris seul, sans ouvrir aucun autre fichier ou document externe.** Si la description renvoie vers un fichier markdown, un Confluence, un Notion, ou même un autre ticket sans en reprendre l'essentiel, c'est un mauvais ticket.

Corollaire : la duplication d'information entre le ticket JIRA et la source de vérité (le markdown du repo) est **assumée et nécessaire**. Le markdown est utile pour la cohérence inter-tickets et la lisibilité globale du backlog ; le ticket JIRA est utile pour l'exécution. Les deux doivent contenir le même niveau de détail sur le périmètre couvert par le ticket.

---

## 2. La checklist 12 critères

Tout ticket de type **Story** doit valider ces 12 critères. Score sur 12.

| #   | Critère                                      |   Obligatoire ?    | Comment vérifier                                                                                                              |
| --- | -------------------------------------------- | :----------------: | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Contexte business**                        |         ✅         | Le ticket explique _pourquoi_ on fait ça (problème utilisateur, valeur, lien avec la stratégie produit). 1-3 phrases minimum. |
| 2   | **Description fonctionnelle**                |         ✅         | Le ticket explique _quoi_ est livré, vu côté utilisateur. Pas de jargon technique gratuit.                                    |
| 3   | **Critères d'acceptation au format Gherkin** |         ✅         | Au moins 3 scénarios `Given / When / Then`. Le bonheur path + au moins 1 cas d'erreur + 1 cas limite.                         |
| 4   | **Cas limites identifiés**                   |         ✅         | Liste explicite de situations à traiter : valeurs nulles, dépassements, conflits, états transitoires. Au moins 2.             |
| 5   | **Sous-tâches techniques décomposées**       |         ✅         | Liste de tâches concrètes (`TT-XX.Y.Z`) que le dev exécutera. Au moins 3 sous-tâches.                                         |
| 6   | **Dépendances identifiées**                  |         ✅         | Liste des autres tickets/stories bloquantes ou liées. Si aucune, écrire explicitement "Aucune".                               |
| 7   | **Non-goals explicites**                     |         ✅         | Liste de ce que la story NE FAIT PAS, pour éviter le scope creep. Au moins 1.                                                 |
| 8   | **Tests à écrire**                           |         ✅         | Liste des tests obligatoires : unit / integration / E2E / a11y / security. Au moins 2 niveaux.                                |
| 9   | **Observabilité**                            |         ✅         | Logs, métriques, traces, alertes à instrumenter. Si vraiment N/A (ex : story purement UI), l'écrire.                          |
| 10  | **Considérations sécurité**                  |   si applicable    | Si la story touche auth, données utilisateur, API, ou input externe : RLS, validation, rate limit, OWASP.                     |
| 11  | **Considérations accessibilité**             |       si UI        | Si UI : clavier, ARIA, contraste, lecteur d'écran, prefers-reduced-motion.                                                    |
| 12  | **Considérations performance**               | si chemin critique | Si la story impacte un chemin critique : budget LCP/INP, latence cible, perfs DB.                                             |

**Score d'acceptation minimum : 10/12**. En dessous, le ticket retourne en _Not Ready_ et n'entre pas en sprint.

Pour les **Epics**, la checklist est différente — voir section 6.

---

## 3. Format de référence d'un ticket Story "production-ready"

Tout ticket Story doit avoir cette structure dans son champ `description` JIRA :

```markdown
## Contexte business

<1-3 paragraphes expliquant le pourquoi : problème utilisateur, valeur livrée,
lien avec la stratégie produit (référence à un pilier si pertinent)>

## Description fonctionnelle

<1-2 paragraphes décrivant le périmètre côté utilisateur :
quels écrans, quelles interactions, quels résultats observables>

## Critères d'acceptation (Gherkin)

**Scénario 1 — <titre court>**
```

Given <pré-condition>
When <action>
Then <résultat observable>
And <résultat additionnel>

```

**Scénario 2 — <titre court>**
```

Given ...

```

**Scénario 3 — <titre court>**
```

Given ...

```

## Cas limites à traiter
- <cas 1> : <comportement attendu>
- <cas 2> : <comportement attendu>
- <cas 3> : <comportement attendu>

## Sous-tâches techniques
- **TT-X.Y.1** — <action concrète, verbe à l'infinitif>
- **TT-X.Y.2** — <action concrète>
- **TT-X.Y.3** — <action concrète>

## Dépendances
- **Bloqué par** : <ID(s) ticket> — <raison courte>
- **Bloque** : <ID(s) ticket> — <raison courte>

## Non-goals (hors scope de cette story)
- <ce qu'on ne fait pas et pourquoi>
- <ce qu'on traite dans une autre story (référence)>

## Tests à écrire
- **Unit** : <fichiers/fonctions à couvrir, cas principaux>
- **Integration** : <interactions à tester, ex: API + DB>
- **E2E (Playwright)** : <parcours utilisateur à scénariser, si applicable>
- **A11y (axe-core)** : <règles à valider, si UI>
- **Security** : <attaques à simuler, si applicable>
- **Performance** : <benchmark à exécuter, si critique>

## Observabilité
- **Logs** : événements à émettre (avec niveau et payload)
- **Métriques** : compteurs/histograms à incrémenter
- **Traces** : spans à ouvrir si chemin critique
- **Alertes** : seuils à configurer si production-critical

## Considérations sécurité (si applicable)
- <RLS, validation input, rate limit, etc.>

## Considérations accessibilité (si UI)
- <clavier, ARIA, contraste, lecteur d'écran>

## Considérations performance (si chemin critique)
- <budget LCP/INP, latence API cible, optimisation DB>

## Definition of Done spécifique à cette story
(si différente de la DoD globale du playbook)
- <critère 1>
- <critère 2>
```

---

## 4. Exemple avant / après

### Version "avant" — pas conforme

```markdown
ST-05.3 Bouton "Je suis bloqué" (escalade ciblée)

CONTEXTE : Demande d'aide explicite sans hésitation. Formateur reçoit contexte complet en 1 clic.

AC GHERKIN :

- Bouton toujours visible page livrable
- Clic → modal "Décris ton blocage en 3 phrases" min 20 char
- Soumit → Alert créée, notif (in-app+email) au formateur principal, statut module → bloqué, toast positif "Mohamed a été prévenu"

Voir 05-backlog-jira.md > ST-05.3 pour le détail.
```

**Audit** : score ~4/12. Manque : description fonctionnelle, cas limites détaillés, sous-tâches techniques, dépendances, non-goals, tests, observabilité, sécurité. Et la référence à un fichier externe est rédhibitoire.

### Version "après" — conforme

```markdown
## Contexte business

Le stagiaire bloqué doit pouvoir demander de l'aide _sans hésitation_. Aujourd'hui (sans Cursus), il hésite à déranger son formateur pour une question qu'il pense triviale, et finit par abandonner ou rester bloqué plusieurs jours en silence. Cette story matérialise l'un des 5 piliers du produit : **"suivi formateur asynchrone"** — le formateur n'est dérangé que quand sa valeur ajoutée est nécessaire, et le stagiaire a un canal officiel pour escalader.

La friction zéro est cruciale : un seul clic, un seul champ. Sinon le stagiaire ne l'utilisera pas.

## Description fonctionnelle

Sur la page d'un livrable hebdo, un bouton **"Je suis bloqué"** est visible en permanence en haut à droite. Au clic, une modal s'ouvre avec un seul champ texte : "Décris ton blocage en 3 phrases" (minimum 20 caractères, maximum 500). À la soumission, une `Alert` est créée côté serveur, le statut du module passe à `bloqué`, et le formateur principal de la cohorte est notifié (in-app + email).

Côté stagiaire, un toast positif s'affiche : "Mohamed a été prévenu, il va te répondre rapidement." Pas de message négatif, pas de barrière émotionnelle.

## Critères d'acceptation (Gherkin)

**Scénario 1 — Demande d'aide depuis un livrable en cours**
```

Given un stagiaire est connecté
And il est sur la page d'un livrable du module "Git avancé"
When il clique sur le bouton "Je suis bloqué"
Then une modal s'ouvre avec un textarea
And le textarea est focus automatiquement
And le bouton "Envoyer" est désactivé tant que <20 caractères

```

**Scénario 2 — Soumission valide**
```

Given la modal est ouverte
And le stagiaire a saisi "Je n'arrive pas à comprendre git rebase, j'ai essayé 3 fois"
When il clique sur "Envoyer"
Then une Alert de type "blocked" est créée en DB
And le statut de la progression sur ce module passe à "bloqué"
And le formateur principal reçoit une notification in-app
And il reçoit un email avec le contexte (livrable + dernier rapport harnais + message)
And un toast vert "Mohamed a été prévenu" s'affiche au stagiaire
And la modal se ferme

```

**Scénario 3 — Alerte déjà ouverte sur le même module**
```

Given une Alert "blocked" est déjà ouverte pour ce stagiaire sur ce module
When le stagiaire reclique sur "Je suis bloqué"
Then la modal s'ouvre avec un message "Tu as déjà demandé de l'aide pour ce module"
And le bouton "Envoyer" est désactivé
And un lien "Voir ma demande en cours" redirige vers la fiche alerte

```

## Cas limites à traiter

- **Multi-clic rapide** : debounce 2 secondes côté serveur sur `POST /api/alerts` (idempotence par stagiaire + module + 5 dernières minutes).
- **Texte vide ou < 20 caractères** : bouton désactivé côté client, refus 400 côté serveur avec message clair.
- **Texte > 500 caractères** : refus avec message "Garde-le court, tu pourras détailler en visio".
- **Stagiaire qui se débloque seul** : possibilité de fermer son alerte avec un bouton "C'est bon, j'ai trouvé" sur la fiche alerte (auto-résolution).
- **Formateur principal indisponible (vacances)** : si feature "vacances" activée (v1.1), notif basculée vers co-formateur le plus actif. Au MVP : tombe quand même chez le formateur principal.
- **Stagiaire sans connexion réseau** : la modal le détecte (offline event) et propose "Réessayer quand la connexion revient" + sauvegarde locale du brouillon.

## Sous-tâches techniques

- **TT-05.3.1** — Endpoint `POST /api/alerts` avec validation Zod (`{ moduleId, message }`)
- **TT-05.3.2** — Service `alertService.createBlockedAlert()` avec idempotence par clé composite
- **TT-05.3.3** — Composant `BlockedButton.vue` réutilisable (props : `moduleId`, `currentStatus`)
- **TT-05.3.4** — Composant `BlockedModal.vue` avec textarea + compteur de caractères + bouton
- **TT-05.3.5** — Composable `useBlockedAlert(moduleId)` qui expose `isAlreadyOpen` et `createAlert()`
- **TT-05.3.6** — Transition state machine : trigger `progressionStateMachine` pour passer en `bloqué`
- **TT-05.3.7** — Émission événement `alert.created` vers handler de notification (EP-12)
- **TT-05.3.8** — Template email "Stagiaire bloqué" (Vue Email)

## Dépendances

- **Bloqué par** :
  - ST-05.1 (page "Cette semaine" existe pour héberger le bouton)
  - ST-08.1 (state machine de progression définie)
  - ST-12.1 (centre de notifications in-app)
  - ST-12.2 (envoi d'emails Resend)
- **Bloque** :
  - ST-08.3 (gestion des alertes côté formateur — sans alertes, rien à gérer)

## Non-goals

- Pas de chat en temps réel avec le formateur (Slack/Discord externes font ça mieux).
- Pas d'upload de fichiers (capture d'écran, vidéo) dans la modal au MVP — le formateur peut demander en commentaire si besoin.
- Pas de catégorisation du blocage (technique/conceptuel/autre) — texte libre uniquement, on analysera en v1.x si pattern.
- Pas de SLA visible côté stagiaire (ex : "Réponse sous 4h") — engagement informel, formalisable en v1.x.

## Tests à écrire

- **Unit** :
  - `alertService.createBlockedAlert()` : cas idempotent (2 appels → 1 seule Alert)
  - Composable `useBlockedAlert()` : transitions d'état
  - Validation Zod : payload valide / invalide
- **Integration** :
  - `POST /api/alerts` → row insérée + notification déclenchée
  - Race condition : 2 requêtes simultanées → 1 seule Alert créée (test concurrent)
- **E2E (Playwright)** :
  - Parcours stagiaire : clic → modal → saisie → envoi → toast → notif visible côté formateur
  - Re-clic après alerte ouverte : message + bouton désactivé
- **A11y (axe-core)** :
  - Modal a un `role="dialog"`, focus piégé, esc ferme
  - Bouton "Je suis bloqué" accessible au clavier avec annonce lecteur d'écran
  - Textarea a un label explicite
- **Security** :
  - Tentative d'injection HTML dans le message → échappé en DB et en email
  - Stagiaire d'une autre cohorte ne peut pas créer une alerte sur ce module (RLS test)

## Observabilité

- **Logs** :
  - `alert.created` (level: info, payload: alert_id, user_id, module_id, kind="blocked")
  - `alert.duplicate_blocked` (level: warn, quand idempotence rejette)
- **Métriques** :
  - Compteur `cursus.alerts.created.total` labellisé par `kind=blocked`
  - Histogram `cursus.alerts.time_to_resolution.seconds` (calculé à la résolution)
- **Traces** :
  - Span sur `POST /api/alerts` incluant : validation, DB insert, notification trigger
- **Alertes ops** : aucune nouvelle alerte ops nécessaire (l'instrumentation EP-12 couvre).

## Considérations sécurité

- Validation Zod stricte sur le payload (`moduleId` UUID, `message` 20-500 chars).
- RLS Supabase : un user ne peut créer une Alert que pour un module qu'il suit en tant que stagiaire (table `progressions` jointure).
- Rate limit : 5 alertes par heure par stagiaire (Upstash Redis), sinon le bouton devient suspect.
- Échappement HTML systématique dans le rendu email (sinon XSS vers le formateur).

## Considérations accessibilité

- Bouton "Je suis bloqué" : taille touch target ≥ 44px, contraste 4.5:1 minimum, label aria.
- Modal : `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointant vers le titre, focus piégé.
- Touche Esc ferme la modal (annonce "Modal fermée" via aria-live).
- Toast d'envoi : `aria-live="polite"`, durée 4s, pas de disparition trop rapide.
- Respect `prefers-reduced-motion` : pas d'animation de modal (fade direct).

## Considérations performance

- Endpoint `POST /api/alerts` : cible p95 < 300ms (validation + 2 inserts DB + 1 push notification + 1 email enqueue).
- Pas d'impact frontend significatif (composant léger, ~5kb gzip).

## Definition of Done spécifique

(en plus de la DoD globale du playbook)
- Le test d'idempotence avec 10 requêtes parallèles passe.
- Le rendu de l'email a été vérifié visuellement sur Gmail + Outlook + Apple Mail.
- La latence p95 est mesurée et < 300ms sur l'environnement de staging.
```

**Audit** : score 12/12. Le ticket est autonome, actionnable, vérifiable.

---

## 5. Procédure d'audit

### Audit unitaire (par ticket)

1. **Lire le ticket dans JIRA** (sans ouvrir le markdown).
2. **Cocher la checklist** sur les 12 critères.
3. **Calculer le score** (max 12, plancher 0).
4. **Décision** :
   - ≥ 10/12 → ticket _Ready_
   - 7-9/12 → ticket à enrichir (commentaire dans JIRA)
   - < 7/12 → ticket à refondre (assignation au PM)

### Audit en masse (sur le backlog complet)

- Échantillonnage aléatoire : 10 % des tickets, mix Epics + Stories MVP + Stories v1+
- Tableau de scoring par ticket
- Calcul du score moyen
- Cible : score moyen ≥ 10.5/12 sur le backlog
- Identification des Epics avec score moyen faible → enrichissement ciblé

### Audit continu (à chaque nouvelle Story créée)

- Le créateur applique la checklist _avant_ de marquer la story comme "Ready"
- Le PR/PO valide en review hebdomadaire
- Tout ticket en sprint doit être Ready

---

## 6. Spécificité des Epics

Les Epics ne suivent pas la même checklist (ce ne sont pas des unités de livraison directe). Pour un Epic, on vérifie 8 critères :

| #   | Critère                              | Comment vérifier                                                                       |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| 1   | **Objectif business**                | 1 phrase claire de ce que l'Epic livre comme valeur                                    |
| 2   | **Business value**                   | Quantification ou explication de l'impact attendu                                      |
| 3   | **Liste des Stories rattachées**     | Toutes les Stories listées avec ID, titre, story points                                |
| 4   | **Story points cumulés**             | Somme des points des Stories                                                           |
| 5   | **Sprint cible / Tier**              | Sprint d'attaque + tier (Core / Premium / Differentiator)                              |
| 6   | **Critères de complétion de l'Epic** | Quand l'Epic est-il considéré comme livré (ex : toutes stories DoD + 1 mesure produit) |
| 7   | **Risques identifiés**               | Au moins 2 risques avec mitigations                                                    |
| 8   | **Dépendances inter-Epics**          | Quels autres Epics doivent être livrés avant / en parallèle                            |

Score min : 7/8.

---

## 7. Outil d'audit (à scripter v1.x)

À terme, le projet pourrait avoir un script `pnpm audit:tickets` qui :

1. Récupère tous les tickets JIRA via API.
2. Parse leur description et applique la checklist.
3. Génère un rapport de scoring (CSV ou Markdown).
4. Bloque en CI si le score moyen passe sous 10/12.

Pas au MVP, mais à parker dans le backlog (ajouter en story v1.x quand le projet est mûr).

---

## 8. Anti-patterns systématiques à bannir

Si on voit ces patterns dans un ticket, c'est rouge :

| Anti-pattern                    | Pourquoi c'est rouge         | Correction                                 |
| ------------------------------- | ---------------------------- | ------------------------------------------ |
| "Voir doc X.md"                 | Le ticket n'est pas autonome | Copier le contenu pertinent dans le ticket |
| "TBD" / "à définir" dans les AC | Le ticket n'est pas Ready    | Compléter avant de l'entamer               |
| AC sans format Given/When/Then  | Ambiguïté                    | Reformuler en Gherkin                      |
| Pas de cas limites              | Bugs cachés                  | Lister au moins 2 cas                      |
| Sous-tâches = 1 seule ligne     | Sous-estimation              | Décomposer en 3+ TT                        |
| Pas de non-goals                | Scope creep garanti          | Lister explicitement                       |
| Pas de tests mentionnés         | Story incomplète             | Au moins unit + 1 autre niveau             |
| "Voir avec X" / "Demander à Y"  | Bloquage caché               | Identifier le dépendance précisément       |

---

## 9. Application immédiate au backlog Cursus

Les 158 tickets actuellement dans JIRA seront audités selon cette méthode. Plan d'action :

1. **Sub-agent A** : enrichit les 62 Stories des EP-1 à EP-13 en extrayant la version complète du markdown source.
2. **Sub-agent B** : génère le contenu détaillé conforme pour les 72 Stories des EP-14 à EP-24 (actuellement résumées).
3. **Sub-agent C** : enrichit les 24 Epics avec la liste de Stories + business value + risques.
4. **Vérification finale** : échantillon de 10 tickets, calcul du score moyen, décision Go/No-Go.

Cible : **score moyen ≥ 10.5/12 sur l'ensemble du backlog avant le démarrage du Sprint 0**.
