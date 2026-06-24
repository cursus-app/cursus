# Catalogue des événements analytics

> **Source de vérité** : ce fichier liste tous les événements custom envoyés à Plausible.
> Toute nouvelle propriété ou événement doit être documenté ici avant d'être implémenté.

---

## Configuration

- **Provider** : [Plausible.io](https://plausible.io) (cookie-less, RGPD-friendly, hébergé EU)
- **Domaine** : configuré via `NUXT_PUBLIC_PLAUSIBLE_DOMAIN` (ex: `cursus.app`)
- **Script** : `https://plausible.io/js/script.js` chargé via `app/plugins/analytics.client.ts`
- **Pageviews** : trackés automatiquement par le script Plausible
- **PII** : aucune — pas d'email, pas de nom, jamais d'identifiant direct

---

## Politique de tracking

| Règle              | Valeur                                                               |
| ------------------ | -------------------------------------------------------------------- |
| Cookies posés      | Non (cookie-less)                                                    |
| DNT respecté       | Oui — `navigator.doNotTrack === '1'` désactive tout tracking         |
| IP stockée         | Non (hashée par Plausible, non récupérable)                          |
| PII dans les props | Interdit — linter CI bloque les patterns `email`, `name`, `password` |
| Domaines isolés    | production / staging / preview (variables d'env distinctes)          |

---

## Événements custom

### `signup_started`

Déclenché quand un utilisateur commence le formulaire d'inscription.

| Prop       | Type | Description |
| ---------- | ---- | ----------- |
| _(aucune)_ | —    | —           |

### `signup_completed`

Déclenché après confirmation de l'email (compte actif).

| Prop     | Type                                  | Description        |
| -------- | ------------------------------------- | ------------------ |
| `method` | `'email' \| 'github' \| 'magic_link'` | Mode d'inscription |

### `first_submission`

Première soumission de livrable d'un stagiaire (toutes cohortes).

| Prop        | Type     | Description                                |
| ----------- | -------- | ------------------------------------------ |
| `module_id` | `string` | Identifiant du module (opaque, pas de PII) |

### `harness_validated`

Harnais GitHub Actions a validé un livrable (résultat OK).

| Prop        | Type     | Description                      |
| ----------- | -------- | -------------------------------- |
| `module_id` | `string` | Identifiant du module            |
| `attempt_n` | `number` | Numéro de la tentative (1-based) |

### `capstone_submitted`

Stagiaire soumet son projet capstone pour soutenance.

| Prop       | Type | Description |
| ---------- | ---- | ----------- |
| _(aucune)_ | —    | —           |

### `certificate_issued`

Certificat numérique émis et signé pour un stagiaire.

| Prop       | Type | Description |
| ---------- | ---- | ----------- |
| _(aucune)_ | —    | —           |

### `feature_flag_activated`

Feature flag activé pour un utilisateur (opt-in feature preview).

| Prop   | Type     | Description                        |
| ------ | -------- | ---------------------------------- |
| `flag` | `string` | Nom du flag (ex: `capstone_async`) |

---

## Funnels configurés dans Plausible

| Funnel                 | Étapes                                                     |
| ---------------------- | ---------------------------------------------------------- |
| **Activation**         | `signup_started` → `signup_completed` → `first_submission` |
| **Validation harnais** | `first_submission` → `harness_validated` (attempt_n=1)     |
| **Certification**      | `capstone_submitted` → `certificate_issued`                |

---

## Usage dans le code

```typescript
import { useAnalytics } from '~/composables/useAnalytics';

const { track } = useAnalytics();

// Pageview → automatique, pas besoin d'appel explicite

// Événement custom :
track('harness_validated', { module_id: 'mod-42', attempt_n: 2 });

// Sans props :
track('capstone_submitted');
```

---

## Ajout d'un nouvel événement

1. Ajouter le nom dans le type `AnalyticsEvent` de `app/composables/useAnalytics.ts`
2. Documenter l'événement dans ce catalogue (avec props et contexte)
3. Configurer un goal dans Plausible Dashboard (Settings → Goals)
4. Ouvrir une PR avec les deux changements ensemble
