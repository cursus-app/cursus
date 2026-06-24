# Runbook: Harnais — latence p95 élevée

> **Alerte** : `alerts.harness.latency`
> **Seuil** : p95 > 7 min sur 30 min consécutives
> **Sévérité** : WARNING

---

## 1. Symptômes

- Alerte Slack `#ops` : "Harnais: latence p95 élevée"
- Les stagiaires attendent plus de 7 min pour voir leur résultat de validation

## 2. Diagnostic

```bash
# 1. Vérifier la queue Inngest
# Dashboard Inngest → Functions → alerts.harness.latency.check → voir les dernières exécutions

# 2. Vérifier les GitHub Actions en cours
gh run list --repo cursus-app/cursus --status in_progress --limit 20

# 3. Vérifier le rate limit GitHub API
gh api rate_limit

# 4. Vérifier les logs Cursus pour des patterns de timeout
# Vercel Dashboard → Logs → filtrer "harness" + "timeout"
```

## 3. Actions correctives

### Si backlog GitHub Actions important

```bash
# Annuler les runs bloqués (> 15 min)
gh run list --repo cursus-app/cursus --status in_progress \
  | awk '{print $7}' | while read id; do gh run cancel "$id"; done
```

### Si GitHub API rate limited

- Vérifier les credentials de la GitHub App "Cursus Harness"
- Attendre la fenêtre de reset (indiquée dans `X-RateLimit-Reset`)

### Si runners surchargés

- Augmenter les runners dans GitHub → Settings → Actions → Runners (ou self-hosted)

## 4. Résolution

L'alerte se résout automatiquement quand p95 repasse sous 7 min.

## 5. Escalade

Si non résolu en 30 min → contacter Mohamed Sadjad (ousmanesadjad@gmail.com).

---

_Runbook v1.0 — 2026-06-24_
