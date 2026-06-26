# Machine à états — Progression stagiaire

> Source de vérité : `server/utils/progressionStateMachine.ts`  
> Migration : `prisma/migrations/20260626223425_add_progressions`

## Diagramme ASCII

```
                     ┌──────────────────────────────────────┐
                     │          * → VALIDE_OVERRIDE          │
                     │     (formateur, reason obligatoire)   │
                     └──────────────────────────────────────┘

  ┌─────────┐   cohorte    ┌──────────┐   user submit   ┌────────┐
  │ A_VENIR │ ──démarre──► │ EN_COURS │ ──────────────► │ SOUMIS │
  └─────────┘              └──────────┘                  └────────┘
                                │   ▲                        │   │
                         user   │   │ harness fail           │   │ harness
                        blocked │   └────────────────────────┘   │ pass
                                ▼                                 ▼
                           ┌────────┐                       ┌────────┐
                           │ BLOQUE │                       │ VALIDE │ ──► (terminal)
                           └────────┘                       └────────┘

  Détection nocturne (job 02h00 UTC) :

  EN_COURS │ SOUMIS ──── dueDate - now < 24h ──► EN_ALERTE
  EN_COURS │ SOUMIS │ EN_ALERTE ── dueDate < now ──► EN_RETARD

                          ┌──────────┐
                          │ EN_ALERTE│ ──► EN_RETARD (si date passée)
                          └──────────┘
                          ┌──────────┐
                          │ EN_RETARD│ (non-terminal mais aucune
                          └──────────┘  transition autorisée sauf override)

  États terminaux : VALIDE, VALIDE_OVERRIDE (aucune transition depuis ces états)
```

## Matrice des transitions

| From          | To              | Déclencheur                         | Acteur         |
|---------------|-----------------|-------------------------------------|----------------|
| `A_VENIR`     | `EN_COURS`      | Cohorte démarre                     | Système (auto) |
| `EN_COURS`    | `SOUMIS`        | User soumet un livrable             | Stagiaire      |
| `EN_COURS`    | `BLOQUE`        | User déclare être bloqué            | Stagiaire      |
| `SOUMIS`      | `VALIDE`        | Harnais valide                      | Harnais CI     |
| `SOUMIS`      | `EN_COURS`      | Harnais échoue (retry)              | Harnais CI     |
| `EN_COURS`    | `EN_ALERTE`     | J-1 deadline (job nocturne)         | Système (cron) |
| `SOUMIS`      | `EN_ALERTE`     | J-1 deadline (job nocturne)         | Système (cron) |
| `EN_COURS`    | `EN_RETARD`     | J+0 deadline passée (job nocturne)  | Système (cron) |
| `SOUMIS`      | `EN_RETARD`     | J+0 deadline passée (job nocturne)  | Système (cron) |
| `EN_ALERTE`   | `EN_RETARD`     | J+0 deadline passée (job nocturne)  | Système (cron) |
| `*`           | `VALIDE_OVERRIDE` | Formateur override (reason requis)| Formateur      |

## États terminaux

`VALIDE` et `VALIDE_OVERRIDE` sont **terminaux** : aucune transition n'est possible
depuis ces états (sauf bug système — escalader à l'ADMIN).

## Considérations sécurité

- Toutes les transitions sont **server-side** (PATCH `/api/progressions/:id/transition`).
- La transition `* → VALIDE_OVERRIDE` nécessite le rôle `FORMATEUR_PRINCIPAL` ou `ADMIN`
  ET une `reason` non vide.
- Chaque transition est loggée (`progression.transitioned`) avec `from`, `to`, `byUserId`.
- RLS Supabase : stagiaire voit sa progression, formateur voit ses cohortes uniquement.
