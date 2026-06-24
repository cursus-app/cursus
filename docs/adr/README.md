# Architecture Decision Records (ADR)

Toutes les décisions techniques structurantes du projet Cursus sont consignées ici.
Cf. **09-engineering-playbook §10** pour les règles.

---

## Quand écrire un ADR

Tout choix qui :

- Engage le produit sur **plus de 6 mois**
- A des **alternatives crédibles non triviales** (pas juste un "détail d'impl")
- Aura des **conséquences non évidentes** pour les futurs développeurs

**Exemples** :

- Choix d'un ORM (Prisma vs Drizzle vs Kysely)
- Choix d'un backend BaaS (Supabase vs Neon + self-hosted auth)
- Choix d'un format de queue (Inngest vs pg_cron vs Trigger.dev)
- Pattern d'authentification (magic link only vs password + magic link)
- Convention de mapping ORM ↔ DB (camelCase ↔ snake_case)

**Pas besoin d'ADR pour** :

- Bug fix
- Refactos locaux
- Choix d'une lib utilitaire mineure (`date-fns` vs `dayjs`)
- Choix de nommage interne à un module

---

## Règles d'écriture

1. **Numérotation séquentielle** : `001-`, `002-`, `003-`… ne pas réutiliser un numéro même si l'ADR est déprécié.
2. **Kebab-case** dans le nom de fichier : `003-choix-prisma-vs-drizzle.md`
3. **Statut explicite** en en-tête : `Proposé` → `Accepté` → éventuellement `Déprécié` (jamais supprimé, juste marqué).
4. **Format unique** : utiliser `000-template.md`. On ne dévie pas.
5. **Une décision par ADR** : si on a deux décisions liées mais indépendantes, deux ADRs.
6. **Le diff** : un ADR est une PR comme une autre — review obligatoire avant merge.
7. **Trace JIRA** : référencer la story qui motive l'ADR (sinon : pourquoi écrit-on cet ADR ?).
8. **Pas de génération LLM pour la décision finale** (cf. playbook §17) — le LLM peut aider à structurer, pas trancher.

---

## Index

| #   | Titre                  | Statut  | Date       | JIRA                                                        |
| --- | ---------------------- | ------- | ---------- | ----------------------------------------------------------- |
| 000 | Template               | —       | —          | —                                                           |
| 001 | Stack technique Cursus | Accepté | 2026-06-21 | [CUR-29](https://ousmanesadjad.atlassian.net/browse/CUR-29) |

<!--
Ajoute une ligne ci-dessus à chaque nouvel ADR.
Format de date : YYYY-MM-DD.
Lien JIRA : [CUR-XXX](url).
-->

---

## Workflow type

1. **Discussion** sur Slack / GitHub Discussion / sprint planning
2. **Branche** `docs/adr-XXX-<slug>`
3. **Copier `000-template.md` → `XXX-titre.md`**, statut `Proposé`
4. **Pull Request** : review par 1+ personne (2 si décision critique)
5. **Merge** : passage au statut `Accepté`
6. Si plus tard la décision est revue : nouvel ADR `YYY-...` qui _remplace_ l'ancien (marquer `Déprécié` + lien)

---

## Anti-patterns à éviter

- **ADR vide** : écrire l'ADR _après_ avoir codé — ça devient de la doc post-hoc qui rationnalise au lieu d'arbitrer.
- **ADR trop large** : "Choisir notre stack" — décomposer en N ADRs (ORM, hébergement, queue, etc.).
- **Pas de critères de décision** : si tu ne peux pas dire pourquoi tu as choisi X plutôt que Y, c'est que ton ADR n'est pas mûr.
- **Pas de coût** : oublier le $/mois ou l'effort dev fausse la comparaison.
- **Pas de plan de sortie** : que se passe-t-il si on doit revenir en arrière ? L'ADR doit y répondre.
