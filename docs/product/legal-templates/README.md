# legal-templates/ — Templates juridiques

> ⚠️ **DRAFT — À VALIDER PAR UN AVOCAT AVANT MISE EN PROD.** Ces templates sont rédigés en bonne foi mais ne constituent PAS un avis juridique. La conformité RGPD nécessite un audit personnalisé selon ta structure juridique, ta géographie d'utilisateurs, et les spécificités de tes traitements.

---

## Documents fournis

| Fichier                                                                        | Usage                                                                                                   | À valider impérativement                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`01-cgu.md`](./01-cgu.md)                                                     | Conditions Générales d'Utilisation pour les utilisateurs de l'app                                       | Identité de l'éditeur, juridiction, droit applicable                               |
| [`02-politique-confidentialite.md`](./02-politique-confidentialite.md)         | Privacy Policy RGPD-compliant                                                                           | Liste exacte des traitements + bases légales + sous-traitants + transferts hors UE |
| [`03-mentions-legales.md`](./03-mentions-legales.md)                           | Mentions légales obligatoires (LCEN art. 6-III français)                                                | Identité éditeur + hébergeur + directeur de publication                            |
| [`04-dpa-data-processing-agreement.md`](./04-dpa-data-processing-agreement.md) | DPA à signer si tu accueilles des stagiaires d'autres structures qui en sont responsables de traitement | Contrats CCT avec sous-traitants USA, désignation DPO                              |

---

## Workflow recommandé

1. **Lire les disclaimers** en haut de chaque fichier (sérieusement)
2. **Identifier ta structure juridique** (entreprise individuelle, SAS, association, etc.)
3. **Compléter tous les `[À COMPLÉTER]`** avec tes infos réelles
4. **Faire valider par un avocat** spécialisé tech / RGPD (compter 1-2k€ pour une review complète selon localisation)
5. **Publier les versions validées** sur ton site (`/cgu`, `/privacy`, `/mentions`, `/dpa` selon convention)
6. **Versionner** : à chaque modification, créer une copie datée pour archivage

---

## Couverture vs à compléter

### ✅ Couvert par les templates

- Bases légales par finalité (RGPD art. 6)
- Information utilisateur (art. 13-14)
- Droits RGPD (accès, rectif, effacement, portabilité, opposition, limitation — art. 15-22)
- Notification CNIL 72h en cas de violation
- Mesures de sécurité art. 32
- DPA art. 28 complet
- Liste des sous-traitants : Supabase, Vercel, Resend, Sentry, PostHog, Inngest, Upstash
- Durées de conservation détaillées
- Approche cookies minimaliste (essentiels uniquement au MVP)

### ⚠️ À faire compléter par l'avocat

- Identité du responsable de traitement (placeholders `[À COMPLÉTER]`)
- Désignation DPO formelle (interne, externe, ou non requis selon analyse)
- Médiateur de la consommation (obligatoire en France pour B2C)
- Juridiction précise (varies selon le siège)
- Évaluation d'impact (AIPD) si traitement de mineurs (< 18 ans) — fort probable dans le cas de stages d'étudiants
- Clauses Contractuelles Types (CCT) signées avec chaque sous-traitant USA (Sentry, PostHog selon config, Resend si pas EU)
- Garanties contractuelles spécifiques si données sensibles (santé, opinions, etc.) — pas le cas a priori
- Durée de conservation du certificat (10 ans choisi par défaut, à arbitrer selon valeur juridique du certif émis)

---

## Notes spécifiques

### Sur les sous-traitants

Les templates listent les sous-traitants du stack par défaut. **À mettre à jour si tu changes de stack** (ex : si tu remplaces Resend par Postmark, modifier `02-politique-confidentialite.md` ET `04-dpa.md` annexe 2).

### Sur les mineurs

Si tu prévois d'accueillir des stagiaires < 18 ans (probable en stage de fin d'année L1), tu auras besoin :

- D'une **autorisation parentale** spécifique pour le traitement de données
- D'une **AIPD** (analyse d'impact) car traitement à risque pour les droits des mineurs
- D'une **adaptation de la politique de confidentialité** (langage adapté, droit à l'oubli renforcé)

Ces points ne sont **pas couverts** par les templates actuels — à demander explicitement à l'avocat.

### Sur la juridiction

Les templates supposent **droit français + tribunaux français**. À adapter si tu opères depuis un autre pays.

---

## Pourquoi un avocat est obligatoire malgré ces templates ?

Trois raisons :

1. **Responsabilité civile et pénale** : en cas de violation RGPD, des amendes pouvant aller jusqu'à 4 % du CA mondial peuvent être appliquées. Pas un risque à prendre.
2. **Spécificités du contexte** : ton type de structure, la localisation de tes utilisateurs, la nature des données traitées, déterminent des obligations spécifiques que ces templates ne peuvent pas anticiper.
3. **Évolution réglementaire** : RGPD évolue (Schrems II, ePrivacy, AI Act). Un avocat tech récent garantit que tu restes à jour.

**Budget estimé** : 1500-3000 € pour une review complète + ajustements selon ton contexte. Investissement rentable.
