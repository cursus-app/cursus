# Runbook — Setup Grafana Cloud pour Cursus

**Audience** : Mohamed (Product Owner) + devs ops  
**Dernière mise a jour** : 2026-06-24  
**Story** : ST-16.8

---

## 1. Creer un compte Grafana Cloud (free tier)

1. Aller sur [grafana.com/auth/sign-up](https://grafana.com/auth/sign-up)
2. Choisir "Start for free" — le free tier inclut :
   - 3 utilisateurs
   - 10 000 series de metriques
   - 14 jours de retention logs
   - Dashboards illimites
3. Choisir le nom de l'organisation : `cursus-app`
4. Selectionner la region **EU (Frankfurt)** pour la conformite RGPD
5. Noter l'URL de votre instance : `https://cursus-app.grafana.net`

---

## 2. Obtenir l'API key (Service Account)

Les API keys classiques sont depreciees depuis Grafana 10. Utiliser les **Service Accounts** :

1. Dans Grafana Cloud, aller dans **Administration > Service Accounts**
2. Cliquer **Add service account**
   - Nom : `cursus-gitops`
   - Role : `Editor` (necessaire pour importer des dashboards)
3. Dans le service account cree, cliquer **Add service account token**
   - Nom : `github-actions`
   - Expiration : choisir 1 an ou "No expiration" selon la politique de rotation
4. Copier le token genere — il ne sera affiche qu'une seule fois

---

## 3. Configurer les secrets GitHub

Dans le repo GitHub Cursus :

1. **Settings > Secrets and variables > Actions**
2. Ajouter les deux secrets suivants :

| Secret              | Valeur                             | Exemple                          |
| ------------------- | ---------------------------------- | -------------------------------- |
| `GRAFANA_CLOUD_URL` | URL de l'instance sans slash final | `https://cursus-app.grafana.net` |
| `GRAFANA_API_KEY`   | Token du service account           | `glsa_xxxxxxxxxxxx`              |

3. Pour les datasources Postgres, ajouter egalement :

| Secret                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `SUPABASE_DB_HOST`     | Host du replica read-only Supabase       |
| `SUPABASE_DB_USER`     | Utilisateur Postgres (read-only)         |
| `SUPABASE_DB_PASSWORD` | Mot de passe Postgres                    |
| `SUPABASE_DB_NAME`     | Nom de la base (ex: `postgres`)          |
| `SENTRY_API_TOKEN`     | Token API Sentry (scope: `project:read`) |
| `PLAUSIBLE_API_TOKEN`  | Token API Plausible                      |

---

## 4. Configurer les datasources manuellement (premiere fois)

Les fichiers YAML dans `infra/grafana/datasources/` servent de reference de configuration.
Pour Grafana Cloud, les datasources se configurent via l'UI (pas de provisioning YAML automatique
sur le free tier sans agent self-hosted).

### Datasource Postgres (Supabase replica read-only)

1. **Connections > Data sources > Add data source > PostgreSQL**
2. Remplir :
   - Name : `Cursus Postgres`
   - Host URL : `<SUPABASE_DB_HOST>:5432`
   - Database name : `postgres`
   - Username : `<SUPABASE_DB_USER>` (utilisateur read-only)
   - Password : `<SUPABASE_DB_PASSWORD>`
   - TLS/SSL Mode : `require`
   - PostgreSQL version : 15
3. Cliquer **Save & test** — verifier "Database Connection OK"
4. Noter l'UID genere (visible dans l'URL) — doit correspondre a `cursus-postgres`

### Datasource Sentry

1. **Connections > Add new connection > rechercher "Sentry"**
2. Installer le plugin Sentry si pas deja present
3. Configurer avec le token API Sentry (scope minimal : `project:read`, `event:read`)
4. Org slug : `cursus-app`

---

## 5. Lancer le provisioning des dashboards

### Via GitHub Actions (recommande)

Pousser un commit sur `main` qui touche `infra/grafana/dashboards/**` — le workflow
`.github/workflows/grafana-sync.yml` se declenche automatiquement.

Pour un provisioning manuel (re-import complet) :

1. Aller dans **Actions > Sync Grafana Dashboards**
2. Cliquer **Run workflow**
3. Laisser `dry_run` a `false` pour un import reel
4. Verifier le job summary pour voir les dashboards importes

### En local (diagnostic / urgence)

```bash
export GRAFANA_URL="https://cursus-app.grafana.net"
export GRAFANA_API_KEY="glsa_xxxxxxxxxxxx"

# Dry-run d'abord
DRY_RUN=true bash infra/grafana/provisioning.sh

# Import reel
bash infra/grafana/provisioning.sh
```

---

## 6. Ajouter un nouveau dashboard

Workflow GitOps :

1. **Creer le dashboard dans Grafana** via l'UI (plus simple pour iterer)
2. Une fois satisfait, **exporter le JSON** :
   - Dashboard > Share > Export > Export for sharing externally
   - Cocher "Export for sharing externally" pour inclure les `__inputs`
3. **Sauvegarder dans `infra/grafana/dashboards/`** :
   ```
   infra/grafana/dashboards/05-mon-nouveau-dashboard.json
   ```
4. Verifier les champs obligatoires :
   - `"uid"` : identifiant unique snake-case (ex: `cursus-mon-dashboard`)
   - `"title"` : titre lisible
   - `"schemaVersion"` : version du schema Grafana (ex: `39`)
   - `"tags"` : inclure `["cursus"]` au minimum
5. **Ouvrir une PR** — la CI valide le JSON automatiquement
6. Apres merge sur `main`, le workflow sync importera le dashboard

---

## 7. Gerer les modifications de dashboard (drift)

### Detecter le drift

Si un dashboard a ete modifie directement dans Grafana (hors GitOps) :

1. Dans Grafana : Dashboard > Version history
2. Exporter la version actuelle en JSON
3. Comparer avec le fichier du repo :
   ```bash
   diff <(jq --sort-keys . infra/grafana/dashboards/01-ops-global.json) \
        <(jq --sort-keys . ~/Downloads/ops-global-grafana-export.json)
   ```
4. Si le dashboard Grafana est meilleur : mettre a jour le fichier repo et merger
5. Si le repo fait foi : re-pousser via provisioning (overwrite: true)

### Regle de priorite

> Le **repo Git est la source de verite**. Tout changement fait directement dans Grafana
> doit etre rapatrie dans le repo avant d'etre considere comme permanent.

Le workflow CI utilise `"overwrite": true` — chaque push sur main ecrase la version Grafana.

---

## 8. Configurer le SSO (acces deleguе)

Pour eviter un mot de passe partage Grafana :

1. Dans **Administration > Authentication > Auth0** (ou Google, GitHub)
2. Pour GitHub OAuth :
   - Grafana Cloud > Settings > Security > Auth providers > GitHub
   - Client ID / Secret depuis [github.com/settings/developers](https://github.com/settings/developers)
   - Autoriser uniquement l'organisation `cursus-app` (ou les membres du repo)
3. Desactiver les logins par email/password une fois le SSO configure

---

## 9. Troubleshooting

### Le provisioning echoue avec 401

Verifier que :

- Le secret `GRAFANA_API_KEY` est bien un token de Service Account (prefixe `glsa_`)
- Le Service Account a le role `Editor` (pas `Viewer`)
- L'URL dans `GRAFANA_CLOUD_URL` n'a pas de slash final

### Les panels affichent "No data"

Verifier que :

- La datasource Postgres est bien configuree et le test reussit
- Les tables `api_logs`, `harness_runs`, etc. existent (cf. migrations Prisma)
- La fenetre temporelle du dashboard correspond a des donnees existantes

### Timeout Sentry (>10s)

Grafana Cloud limite les requetes datasource a 30s. Si Sentry est rate-limited :

- Augmenter le cache Grafana (Dashboard settings > Auto refresh : minimum 5m)
- Reduire la fenetre temporelle par defaut du dashboard

### JSON invalide en CI

```bash
# Valider localement avant de pousser
jq empty infra/grafana/dashboards/*.json && echo "Tous valides"
```

---

## References

- [Grafana HTTP API — Dashboards Import](https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/)
- [Grafana Service Accounts](https://grafana.com/docs/grafana/latest/administration/service-accounts/)
- [Supabase — Read replicas](https://supabase.com/docs/guides/platform/read-replicas)
- [Grafana — Provisioning datasources](https://grafana.com/docs/grafana/latest/administration/provisioning/)
