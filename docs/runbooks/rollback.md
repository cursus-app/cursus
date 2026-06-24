# Runbook — Rollback déploiement Vercel

**Dernière mise à jour :** 2026-06-24  
**Niveau d'urgence :** Critique (prod cassée) → exécuter immédiatement

---

## 1. Rollback rapide Vercel (< 1 min — sans migration DB)

Utilisé quand **le code a régressé** mais que les migrations DB n'ont pas été appliquées ou n'ont pas de breaking change.

```bash
# Lister les déploiements récents
vercel ls --scope cursus-app

# Rollback au déploiement précédent
vercel rollback [deployment-url] --scope cursus-app
```

Ou via le **dashboard Vercel** :

1. Ouvrir https://vercel.com/cursus-app/cursus/deployments
2. Cliquer sur le déploiement précédent sain
3. "..." → **Promote to Production**
4. Confirmer — le DNS bascule en < 30 s

**Vérification :** `curl https://cursus.app/api/health` doit retourner `200 OK`.

---

## 2. Rollback avec migration Prisma (procédure étendue)

Utilisé quand **une migration additive a été appliquée** et qu'on doit revenir en arrière.

### 2.1 Évaluer la migration

```bash
# Voir les migrations appliquées en prod
DATABASE_URL="<prod_url>" prisma migrate status
```

**Si la migration est additive** (nouvelle colonne nullable, nouvelle table) : le rollback Vercel seul est suffisant — l'ancien code fonctionne avec la migration présente.

**Si la migration est destructive** (suppression colonne/table, type change) : procédure §2.2 requise.

### 2.2 Rollback migration destructive

> ⚠️ Cette procédure doit être validée par 2 personnes avant exécution.

```bash
# 1. Mettre l'app en maintenance (optionnel si downtime < 5 min acceptable)
# → Vercel : activer la page maintenance via variable NUXT_MAINTENANCE_MODE=1

# 2. Créer une migration de rollback manuelle
prisma migrate resolve --rolled-back <migration-name>

# 3. Appliquer manuellement le SQL inverse
psql $DATABASE_URL -f docs/runbooks/migrations/<migration-name>-rollback.sql

# 4. Rollback Vercel (cf §1)
vercel rollback [deployment-url] --scope cursus-app

# 5. Vérifier l'intégrité
DATABASE_URL="<prod_url>" prisma migrate status
curl https://cursus.app/api/health
```

---

## 3. Rollback partiel (feature flag)

Si une feature est cassée mais que le reste de l'app fonctionne, désactiver via variable d'env Vercel :

```bash
vercel env add NUXT_FEATURE_<NAME>_ENABLED preview
# valeur : false
vercel redeploy --prod
```

---

## 4. Procédure d'urgence (> 5 min de downtime)

1. **Ouvrir un incident** dans `tasks/_blockers.md`
2. **Notifier** l'équipe sur Slack #ops
3. **Rollback immédiat** via §1 (sans attendre validation)
4. **Post-mortem** dans `docs/runbooks/` sous 48h

---

## 5. Contacts d'urgence

| Rôle                    | Contact                 |
| ----------------------- | ----------------------- |
| Responsable déploiement | Mohamed (Product Owner) |
| Accès Vercel            | ousmanesadjad@gmail.com |
| Accès Supabase          | ousmanesadjad@gmail.com |

---

## 6. Checklist post-rollback

- [ ] `curl https://cursus.app/api/health` retourne `200 OK`
- [ ] `prisma migrate status` montre un état cohérent
- [ ] Logs Sentry montrent une réduction des erreurs
- [ ] Alertes PostHog normalisées
- [ ] PR cause identifiée + label `regression` ajouté
- [ ] Post-mortem planifié
