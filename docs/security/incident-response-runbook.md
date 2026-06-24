# Plan de Réponse à Incident Sécurité

> **Cursus — Runbook Sécurité v1.0 — 2026-06-24**
>
> Ce document est une procédure opérationnelle destinée à l'équipe on-call. Garder une copie imprimée accessible hors bande (Drive partagé, coffre de clés, etc.).

---

## Table des matières

1. [Niveaux de criticité](#1-niveaux-de-criticité)
2. [Phase 1 — Détection](#2-phase-1--détection)
3. [Phase 2 — Containment](#3-phase-2--containment)
4. [Phase 3 — Éradication](#4-phase-3--éradication)
5. [Phase 4 — Recovery](#5-phase-4--recovery)
6. [Phase 5 — Notification](#6-phase-5--notification)
7. [Phase 6 — Postmortem](#7-phase-6--postmortem)
8. [Scénarios spécifiques](#8-scénarios-spécifiques)
9. [Contacts](#9-contacts)
10. [Template postmortem](#10-template-postmortem)
11. [Checklist P0 imprimable](#11-checklist-p0-imprimable)

---

## 1. Niveaux de criticité

| Niveau | Définition                                                                  | Temps de réponse cible | Exemples                                     |
| ------ | --------------------------------------------------------------------------- | ---------------------- | -------------------------------------------- |
| **P0** | Incident catastrophique — données personnelles exposées, app down pour tous | 15 min                 | Fuite DB, clé Supabase publique, down global |
| **P1** | Incident majeur — impact fort sur un sous-ensemble d'utilisateurs           | 1 h                    | Compte formateur compromis, harnais KO       |
| **P2** | Incident modéré — dégradation perceptible                                   | 4 h                    | Latence élevée, erreurs 5xx sporadiques      |
| **P3** | Incident mineur — impact limité                                             | 24 h                   | Bug UI, analytics cassé                      |

---

## 2. Phase 1 — Détection

### Sources d'alerte

- **Sentry** : erreurs frontend/backend avec taux anormal
- **Upstash Redis** : rate limiting déclenché en masse
- **Supabase Dashboard** : connexions anormales, queries lentes
- **GitHub Dependabot** : CVE critique sur une dépendance
- **Signalement utilisateur** : email/Slack de l'utilisateur
- **Bug bounty** : rapport de chercheur externe
- **Audit log Cursus** : pattern login anormal (voir ST-16.7 alertes)

### Qualifier l'incident

1. Reproduire le symptôme sur un compte de test (jamais un compte prod)
2. Estimer le périmètre : combien d'utilisateurs/données affectés ?
3. Assigner le niveau P0–P3
4. Créer un fil de crise dans Slack `#incidents` avec le tag `@on-call`

---

## 3. Phase 2 — Containment

### Actions immédiates selon le type d'incident

**Compte compromis (formateur ou stagiaire) :**

```bash
# Via Supabase Dashboard → Authentication → Users
# Ou via API:
curl -X DELETE "https://[PROJECT_REF].supabase.co/auth/v1/admin/users/[USER_ID]" \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "apikey: [SERVICE_ROLE_KEY]"

# Révoquer toutes les sessions (Supabase → Auth → Users → Revoke)
# Forcer reset password par email
```

**Clé API compromise (SUPABASE_SERVICE_ROLE_KEY, SENTRY_AUTH_TOKEN, etc.) :**

1. Vercel Dashboard → Project → Settings → Environment Variables → Supprimer la clé
2. Régénérer la clé depuis la console du service concerné
3. Redéployer : `gh workflow run ci.yml --repo cursus-app/cursus`
4. Auditer les logs pour usage de la clé compromise (timeframe : 48h avant détection)

**App down / déploiement cassé :**

```bash
# Rollback au dernier déploiement stable
# Vercel Dashboard → Deployments → [dernière bonne version] → Promote to production

# Ou via Vercel CLI
vercel rollback [DEPLOYMENT_ID] --token [TOKEN]
```

**DDoS / flood de requêtes :**

- Upstash Redis rate-limiting activé → vérifier les logs
- Activer Cloudflare Bot Management si disponible
- Bloquer l'IP/range via Vercel Firewall Rules (Settings → Security)

**Kill-switch feature flag :**

```typescript
// Via PostHog / feature flag
// Désactiver la feature affectée en production immédiatement
```

---

## 4. Phase 3 — Éradication

1. Identifier la cause racine (CVE, mauvaise config, bug logique, credentials)
2. Patch :
   - **CVE dépendance** : `pnpm update [pkg]` → test → PR → merge rapide
   - **Bug logique** : hotfix branch → test → PR urgente (bypass review délai normal)
   - **Mauvaise config** : corriger dans Vercel env vars / Supabase dashboard
3. Vérifier qu'aucun backdoor n'a été introduit (audit git log des dernières 48h)
4. Scanner avec `pnpm audit --audit-level=high`

---

## 5. Phase 4 — Recovery

1. Redéployer le correctif en production
2. Vérifier le bon fonctionnement sur les parcours critiques (login, soumission, harnais)
3. Activer monitoring renforcé : Sentry sampling rate → 100% pendant 2h
4. Réactiver les fonctionnalités désactivées en containment si applicable
5. Vérifier l'intégrité des données si DB touchée (count(\*) sur tables critiques)

---

## 6. Phase 5 — Notification

### Notifications internes

| Timing       | Action                             |
| ------------ | ---------------------------------- |
| T+0          | Fil de crise `#incidents` Slack    |
| T+30min (P0) | Notification hiérarchie (Mohamed)  |
| T+1h (P0/P1) | Update statut page (si applicable) |

### Notification CNIL (P0 uniquement — données personnelles fuites)

**Délai légal : 72h après la prise de connaissance de la violation.**

- Formulaire : [notifications.cnil.fr](https://notifications.cnil.fr)
- Informations à fournir :
  - Nature de la violation (vol, accès non autorisé, destruction)
  - Catégories de données (emails, mots de passe, soumissions...)
  - Nombre approximatif de personnes concernées
  - Conséquences probables
  - Mesures prises

### Notification utilisateurs (P0/P1 si données exposées)

Email via Resend depuis `security@cursus.app` :

```
Objet: [Important] Incident sécurité sur votre compte Cursus

Nous avons détecté [description brève]. Par précaution, nous avons [mesures de containment].

Actions requises de votre part :
- Changer votre mot de passe immédiatement
- Vérifier les accès récents à votre compte

Nos équipes travaillent à la résolution. Nous vous informerons dès que l'incident sera clos.

— L'équipe Cursus
```

---

## 7. Phase 6 — Postmortem

**Délai : dans les 48h après clôture de l'incident.**

Format : blameless (pas de désignation de coupable, focalisation sur les processus).

Voir template section 10 ci-dessous.

Publication : `docs/postmortems/YYYY-MM-DD-<slug>.md` dans le repo.

---

## 8. Scénarios spécifiques

### 8.1 — Compromise d'un compte formateur

```
1. Détection : alerte Sentry (actions anormales) ou signalement
2. Containment :
   - Révoquer toutes les sessions (Supabase Admin)
   - Suspendre le compte (flag is_suspended=true en DB)
   - Notifier le formateur par email secondaire connu
3. Éradication :
   - Identifier les actions effectuées depuis le compte (audit_logs)
   - Annuler les actions frauduleuses (certificats émis, stagiaires ajoutés)
4. Recovery :
   - Reset password via magic link
   - Débloquer le compte après vérification identité
5. Notification :
   - Si données stagiaires exposées → notification CNIL + stagiaires concernés
```

### 8.2 — Fuite de clé API (ex: SERVICE_ROLE_KEY)

```
1. Révoquer IMMÉDIATEMENT la clé dans Supabase Dashboard
2. Régénérer → mettre à jour dans Vercel env vars
3. Auditer les logs Supabase pour usage non autorisé (timeframe: depuis le dernier rotation)
4. Vérifier qu'aucune donnée n'a été exfiltrée (count par table, audit exports)
5. Si données exposées → P0 → notification CNIL
```

### 8.3 — Harnais GitHub Actions compromis

```
1. Révoquer l'accès de la GitHub App "Cursus Harness"
2. Auditer les workflows runs récents
3. Vérifier l'intégrité des repos fixtures utilisés pour les tests
4. Regénérer les secrets GitHub Actions (GITHUB_APP_PRIVATE_KEY, etc.)
```

---

## 9. Contacts

| Rôle                                   | Nom            | Contact                   | Backup                      |
| -------------------------------------- | -------------- | ------------------------- | --------------------------- |
| Product Owner / Responsable traitement | Mohamed Sadjad | ousmanesadjad@gmail.com   | —                           |
| Ingénieur principal                    | Claude Agent   | (via session Claude Code) | —                           |
| Supabase Support                       | —              | support.supabase.com      | Status: status.supabase.com |
| Sentry Support                         | —              | sentry.io/support         | status.sentry.io            |
| Vercel Support                         | —              | vercel.com/support        | vercel-status.com           |
| GitHub Support                         | —              | support.github.com        | githubstatus.com            |
| CNIL                                   | —              | notifications.cnil.fr     | +33 1 53 73 22 22           |

---

## 10. Template postmortem

```markdown
# Postmortem — [Titre de l'incident] — YYYY-MM-DD

## Résumé

**Durée** : [start] → [end] ([durée totale])
**Impact** : [N utilisateurs affectés, services down, etc.]
**Niveau** : P[0-3]
**Cause racine** : [1 phrase]

## Timeline

| Heure | Événement               |
| ----- | ----------------------- |
| HH:MM | Détection de [symptôme] |
| HH:MM | Alerte reçue par [qui]  |
| HH:MM | Début investigation     |
| HH:MM | Cause identifiée        |
| HH:MM | Containment appliqué    |
| HH:MM | Fix déployé             |
| HH:MM | Clôture incidenté       |

## Analyse blameless

### Ce qui a bien fonctionné

- ...

### Ce qui a mal fonctionné

- ...

### Où avons-nous eu de la chance

- ...

## Cause racine

[Description technique détaillée]

## Actions correctives

| Action | Propriétaire | Story créée | Deadline |
| ------ | ------------ | ----------- | -------- |
| ...    | ...          | ...         | ...      |

## Métriques incident

- MTTD (Mean Time To Detect) : Xmin
- MTTC (Mean Time To Contain) : Xmin
- MTTR (Mean Time To Recover) : Xmin
```

---

## 11. Checklist P0 imprimable

```
□ T+0   Créer fil de crise #incidents
□ T+0   Estimer périmètre (qui, quoi, combien)
□ T+15  Containment : révoquer accès / isoler le système
□ T+30  Notifier hiérarchie
□ T+1h  Évaluer besoin notification CNIL (données perso ?)
□ T+2h  Correctif en cours de développement
□ T+4h  Correctif déployé et vérifié
□ T+6h  Communication utilisateurs si nécessaire
□ T+24h CNIL notifiée si données exposées (délai légal 72h)
□ T+48h Postmortem blameless rédigé et partagé
□ Done  Story créée pour chaque action corrective
```
