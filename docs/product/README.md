# docs/product — Spécifications produit

> Source de vérité interne au repo pour toutes les spécifications produit de Cursus. Versionnée avec le code, modifiée via PR comme tout le reste.

---

## Index des documents

### Cadrage stratégique et produit (numéroté 00-13)

| #   | Fichier                                                                | Contenu                                                                                          | Lignes |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -----: |
| 00  | [00-audit-premium.md](./00-audit-premium.md)                           | Audit critique du cadrage initial + axes premium retenus + changelog de pensée                   |    215 |
| 01  | [01-vision.md](./01-vision.md)                                         | Positioning, 5 piliers Core, 7 axes Premium, 5 Differentiators, trajectoire long-terme           |    238 |
| 02  | [02-personas.md](./02-personas.md)                                     | 4 personas (Stagiaire, Formateur principal, Co-formateur, Admin) + matrice permissions           |    172 |
| 03  | [03-user-journeys.md](./03-user-journeys.md)                           | 6 parcours utilisateurs détaillés                                                                |    226 |
| 04  | [04-architecture-fonctionnelle.md](./04-architecture-fonctionnelle.md) | 12 modules fonctionnels, modèle de données conceptuel, flux d'événements                         |    275 |
| 05  | [05-backlog-jira.md](./05-backlog-jira.md)                             | Backlog synchronisé depuis JIRA — 24 Epics + EP-01 détaillé                                      |   2717 |
| 06  | [06-mvp-pilote.md](./06-mvp-pilote.md)                                 | Scope MVP 5 semaines + Spike S0, planning, RACI                                                  |    304 |
| 07  | [07-stack-tech.md](./07-stack-tech.md)                                 | Stack technique complète avec versions latest stables                                            |    678 |
| 09  | [09-engineering-playbook.md](./09-engineering-playbook.md)             | Bonnes pratiques d'ingénierie consignées (Git, tests, sécurité, a11y, perf, observabilité, ADRs) |    778 |
| 10  | [10-design-system.md](./10-design-system.md)                           | Design system premium : tokens, composants, motion, dark/light, AAA a11y                         |    466 |
| 11  | [11-ticket-quality-checklist.md](./11-ticket-quality-checklist.md)     | Méthodologie d'audit qualité des tickets (12 critères)                                           |    376 |
| 12  | [12-pre-flight-checklist.md](./12-pre-flight-checklist.md)             | Checklist pré-vol Phase A/B/C/0 avant Sprint 1                                                   |    268 |
| 13  | [13-ressources-externes.md](./13-ressources-externes.md)               | Catalogue curatif des ressources libres (nodeschool, MDN, OWASP, etc.)                           |    186 |

### Contenus opérationnels (sous-dossiers)

| Dossier                                  | Contenu                                                                       | Quand l'utiliser                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`curriculums/`](./curriculums/)         | Cursus complets prêts à utiliser dans le Cursus Builder de l'app              | Quand le formateur crée une cohorte sur un cursus connu    |
| [`pilot-pack/`](./pilot-pack/)           | Pack communication pilote : email invitation, FAQ, onboarding, brief kick-off | Au moment de recruter et briefer les 3-5 stagiaires pilote |
| [`legal-templates/`](./legal-templates/) | Drafts CGU, Privacy Policy, Mentions légales, DPA (à valider par avocat)      | Avant publication / mise en prod / accueil de stagiaires   |

---

## Quand modifier ces docs

| Type de changement                    | Process                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| Correction typo / clarification       | PR directe avec commit `docs(scope): description`                                   |
| Évolution d'une décision déjà prise   | Ouvrir un ADR dans `docs/adr/` qui supersede la décision, puis mettre à jour le doc |
| Nouvelle décision structurante        | ADR d'abord, puis intégration dans le(s) doc(s) impacté(s)                          |
| Ajout d'une nouvelle Story au backlog | Créer le ticket JIRA → `/sync-jira-to-local` → audit qualité                        |
| Ajout d'un cursus                     | Créer le fichier dans `curriculums/` en suivant le format de `cybersec-l1.md`       |

---

## Conventions

- **Numérotation 00-99** : ordre suggéré de lecture pour un nouvel arrivant
- **Lisibilité avant exhaustivité** : sections courtes, exemples concrets, peu de jargon non défini
- **Pas de duplication majeure** entre docs : préférer un lien vers la source
- **Cohérence stack** : toute mention de version doit refléter `07-stack-tech.md`
- **Source de vérité opérationnelle = JIRA** pour les Stories, ce dossier = doc produit canonique

---

## Génération initiale

Ces docs ont été générés en mai-juin 2026 lors du cadrage initial du projet (cf. `00-audit-premium.md` qui retrace l'histoire). Score qualité moyen tickets : 11.5/12 sur la checklist du `11-ticket-quality-checklist.md`.
