# Runbook Incident Opérationnel

> **Cursus — Ops Runbook v1.0 — 2026-06-24**
>
> Ce runbook couvre les 4 scénarios d'incident les plus fréquents. Pour les incidents de sécurité (données exposées, compte compromis), voir `docs/security/incident-response-runbook.md`.

---

## Accès rapide

| Service        | Dashboard                            | Status              |
| -------------- | ------------------------------------ | ------------------- |
| Vercel         | vercel.com/cursus-app                | vercel-status.com   |
| Supabase       | supabase.com/dashboard               | status.supabase.com |
| Sentry         | sentry.io/organizations/cursus       | sentry.io/status    |
| Inngest        | app.inngest.com                      | status.inngest.com  |
| Upstash        | console.upstash.com                  | —                   |
| GitHub Actions | github.com/cursus-app/cursus/actions | githubstatus.com    |

---

## Scénario 1 — App down (HTTP 500 / page blanche)

### Symptômes

- Page d'accueil retourne 500 ou CORS error
- Sentry error rate > 10x normal
- Utilisateurs signalent "impossible de se connecter"

### Diagnostic (copier-coller)

```bash
# 1. Vérifier le dernier déploiement Vercel
gh run list --repo cursus-app/cursus --workflow ci.yml --limit 5

# 2. Voir les logs Vercel (Runtime logs)
# Vercel Dashboard → cursus → Functions → Runtime Logs

# 3. Tester l'API health
curl -I https://cursus.app/api/health

# 4. Vérifier Supabase status
curl https://[PROJECT_REF].supabase.co/rest/v1/ -H "apikey: [ANON_KEY]"
```

### Actions

**Option A — Rollback immédiat (< 2 min)**

```bash
# Vercel Dashboard → Deployments → [dernier deploy stable] → … → Promote to Production
# Ou via CLI:
vercel rollback --scope cursus-app
```

**Option B — Hotfix (si rollback impossible)**

```bash
git checkout main
git pull
git checkout -b hotfix/[description-courte]
# ... fix ...
git push origin hotfix/[description-courte]
gh pr create --repo cursus-app/cursus --title "hotfix: [description]" --base main
# Merger en urgence après validation rapide
```

### Contacts escalade

- Vercel down : @vercel_status + support.vercel.com
- Supabase down : status.supabase.com + Discord Supabase #support

---

## Scénario 2 — Latence élevée (p95 > 2s)

### Symptômes

- Sentry performance dashboard : transaction latence > 2s
- Utilisateurs signalent lenteur de l'application
- Logs Pino montrent des `durationMs` > 1500

### Diagnostic — 5 actions dans l'ordre

```bash
# 1. Vercel Functions logs — identifier l'endpoint lent
# Vercel Dashboard → Functions → sort by duration

# 2. Sentry Performance — identifier les transactions lentes
# Sentry → Performance → Sort by p95 → identifier les traces

# 3. Supabase — slow queries
# Supabase Dashboard → Database → Query Performance
# ou:
# SELECT query, calls, total_exec_time/calls as avg_ms
# FROM pg_stat_statements ORDER BY avg_ms DESC LIMIT 10;

# 4. Inngest — queue backlog
# app.inngest.com → Events → vérifier si queue normale ou backlogued

# 5. Upstash Redis — connexions
# console.upstash.com → Redis → Connections
```

### Actions correctives fréquentes

| Cause                     | Fix                                                 |
| ------------------------- | --------------------------------------------------- |
| Query Prisma sans index   | Ajouter un `@@index` dans schema.prisma + migration |
| N+1 queries               | Ajouter `include: { relation: true }` dans Prisma   |
| Cold start Vercel         | Ajouter edge middleware pour warm-up                |
| Inngest queue saturée     | Vérifier le concurrency limit + scale               |
| Redis rate limiter saturé | Vérifier les clés + TTL                             |

---

## Scénario 3 — Data corruption suspectée

### Symptômes

- Un utilisateur signale des données incorrectes (mauvais résultat harnais, badge incorrect)
- Erreur de validation Zod au runtime sur des données censées être valides
- Incohérence entre ce qu'affiche l'UI et ce qu'est en DB

### Diagnostic

```sql
-- Vérifier l'audit log de l'utilisateur concerné
SELECT * FROM audit_logs
WHERE actor_id = '[USER_ID]'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Vérifier les dernières soumissions
SELECT * FROM harness_runs
WHERE user_id = '[USER_ID]'
ORDER BY created_at DESC
LIMIT 10;
```

### Actions

```bash
# 1. NE PAS modifier les données en production sans audit complet
# 2. Identifier le job Inngest qui a produit la corruption
# app.inngest.com → Functions → [function name] → Failed runs

# 3. Replay le job sur des données test
# (Inngest permet le replay depuis le dashboard)

# 4. Si correction nécessaire en DB : migration manuelle versionnée
# Écrire le SQL dans prisma/migrations/YYYYMMDDHHMMSS_manual_fix/migration.sql
# Documenter dans _blockers.md
```

---

## Scénario 4 — Clé tierce compromise (ex: RESEND_API_KEY)

**Voir `docs/security/incident-response-runbook.md` §8.2 — procédure complète.**

Résumé rapide :

1. Révoquer la clé dans la console du service
2. Regénérer + mettre à jour dans Vercel env vars
3. Redéployer
4. Auditer les logs (envois d'email frauduleux ?)
5. Si emails envoyés frauduleusement → notification CNIL

---

## Postmortem template

Créer `docs/postmortems/YYYY-MM-DD-[slug].md` avec ce format :

```markdown
# Postmortem — [Titre] — YYYY-MM-DD

**MTTD** : Xmin | **MTTC** : Xmin | **MTTR** : Xmin | **Impact** : [N users/Xmin down]

## Timeline

| Heure | Événement |
| ----- | --------- |

## Cause racine

## Ce qui a bien fonctionné / mal fonctionné

## Actions correctives (Stories à créer)

| Action | Story | Owner | Date |
| ------ | ----- | ----- | ---- |
```

---

## Alertes liées

Ce runbook est référencé par les alertes Sentry définies dans ST-16.7 (alertes opérationnelles).
Chaque alerte pointe vers la section correspondante de ce runbook.
