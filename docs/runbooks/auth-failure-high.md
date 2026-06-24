# Runbook: Auth — taux d'échec élevé

> **Alerte** : `alerts.auth.failure`
> **Seuil** : taux > 10% sur 10 min (min 5 tentatives)
> **Sévérité** : CRITICAL

---

## 1. Symptômes

- Alerte Slack `#ops` : "Auth: taux d'échec élevé"
- Possible signe de brute force ou de bug dans le flux d'authentification

## 2. Diagnostic rapide

```bash
# 1. Vérifier les audit logs en DB
# via Supabase Dashboard → SQL Editor :
SELECT action, count(*) as n, date_trunc('minute', created_at) as min
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '15 minutes'
  AND action LIKE 'auth.%'
GROUP BY 1, 3
ORDER BY 3 DESC;

# 2. Vérifier le status Supabase Auth
# https://status.supabase.com

# 3. Vérifier les erreurs Sentry sur les endpoints auth
# Sentry → Issues → filtrer sur /api/auth
```

## 3. Si brute force confirmé (même IP)

```bash
# Bloquer l'IP via Vercel Firewall Rules
# Vercel Dashboard → Project → Settings → Security → Firewall Rules

# Révoquer toutes les sessions Supabase de l'IP suspecte
# Supabase → Auth → Users → filtrer sur last_sign_in_ip
```

## 4. Si bug Supabase Auth

- Rollback du dernier déploiement si récent
- Contacter Supabase Support : support.supabase.com

## 5. Résolution

L'alerte se résout automatiquement quand le taux repasse sous 10%.

## 6. Escalade

Si > 50 % de taux d'échec ou brute force confirmé → escalade P0 → voir `incident-response.md`.

---

_Runbook v1.0 — 2026-06-24_
