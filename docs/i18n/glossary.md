# Cursus — Glossaire de traduction FR → EN

> Source de vérité terminologique pour toutes les traductions de l'interface Cursus.
> Tout nouveau terme UI doit être ajouté ici avant d'être utilisé dans `locales/en.json`.

## Règles générales

- **Voix** : ton amical mais professionnel, tutoiement FR → "you" EN (pas de "thou").
- **Longueur** : l'EN est souvent 10–30 % plus court que le FR — exploiter cet espace pour être plus direct.
- **Casse** : Title Case pour les actions/boutons (e.g. "Save Changes"), Sentence case pour les descriptions.
- **Acronymes** : RGPD → GDPR, CV → résumé/CV (contextuel), CGU → Terms of Service.
- **Pluriel** : utiliser le format CLDR `none/one/other` pour l'interpolation Vue i18n.

## Glossaire des termes produit

| Terme FR              | Terme EN            | Notes                                                                |
| --------------------- | ------------------- | -------------------------------------------------------------------- |
| stagiaire             | intern / learner    | "intern" dans le contexte RH, "learner" dans le contexte pédagogique |
| formateur (principal) | (lead) instructor   | Éviter "trainer" (trop générique)                                    |
| co-formateur          | co-instructor       |                                                                      |
| cursus                | program / track     | "program" pour le contenu pédagogique structuré, "track" acceptable  |
| cohorte               | cohort              | Terme commun en EdTech                                               |
| harnais               | validator / harness | "validator" côté UI, "harness" acceptable côté technique             |
| livrable              | deliverable         |                                                                      |
| module                | module              | Identique FR/EN                                                      |
| soumission            | submission          |                                                                      |
| badge                 | badge               | Identique FR/EN                                                      |
| certificat            | certificate         |                                                                      |
| capstone              | capstone            | Terme en EN inchangé                                                 |
| brouillon             | draft               |                                                                      |
| publié                | published           |                                                                      |
| archivé               | archived            |                                                                      |
| onboarding            | onboarding          | Terme EN conservé en FR                                              |
| moulinette            | grader / CI runner  | Ne pas traduire en UI, terme technique interne                       |

## Glossaire technique / UI commun

| Terme FR        | Terme EN       | Notes                          |
| --------------- | -------------- | ------------------------------ |
| Adresse email   | Email address  |                                |
| Mot de passe    | Password       |                                |
| Connexion       | Sign in        | Préférer "Sign in" à "Login"   |
| Déconnexion     | Sign out       | Préférer "Sign out" à "Logout" |
| Créer un compte | Create account |                                |
| Profil          | Profile        |                                |
| Paramètres      | Settings       |                                |
| Tableau de bord | Dashboard      |                                |
| Enregistrer     | Save           |                                |
| Annuler         | Cancel         |                                |
| Supprimer       | Delete         |                                |
| Modifier        | Edit           |                                |
| Retour          | Back           |                                |
| Suivant         | Next           |                                |
| Précédent       | Previous       |                                |
| Fermer          | Close          |                                |
| Chargement      | Loading        |                                |
| Erreur          | Error          |                                |
| Succès          | Success        |                                |
| Avertissement   | Warning        |                                |
| Information     | Info           |                                |

## Glossaire dates & formats

| Contexte                     | Format FR   | Format EN    |
| ---------------------------- | ----------- | ------------ |
| Date courte                  | DD/MM/YYYY  | M/D/YYYY     |
| Date longue                  | D MMMM YYYY | MMMM D, YYYY |
| Date courte avec mois abrégé | D MMM YYYY  | D MMM YYYY   |
| Heure                        | HH:mm       | h:mm AM/PM   |

## Termes volontairement intraduisibles

Ces termes restent en EN dans l'interface FR car ils sont universellement reconnus :

- `GitHub` — nom propre
- `OAuth` — terme technique
- `TOTP` — terme technique
- `CSV` — acronyme universel
- `PDF` — acronyme universel
- `URL` — acronyme universel
- `API` — terme technique universel

## Processus de mise à jour

1. Toute nouvelle string UI doit d'abord être ajoutée à `locales/fr.json`.
2. L'équivalent EN doit être défini dans ce glossaire si le terme est nouveau.
3. La traduction EN est ajoutée à `locales/en.json` en respectant ce glossaire.
4. La CI (`pnpm check:i18n` et les tests Vitest) vérifie la parité des clés.
