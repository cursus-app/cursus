# Règles ESLint i18n — ST-19.6

## Règle active : `vue-i18n/no-raw-text`

Plugin : `@intlify/eslint-plugin-vue-i18n`  
Niveau : **`warn`** (pas `error` pour ne pas bloquer les itérations rapides)

### Objectif

Détecter les strings UI visibles codées en dur dans les templates Vue.  
Toute string affichée à l'utilisateur doit utiliser `$t('clé')` ou `t('clé')`.

### Ce qui est détecté (exemples)

```vue
<!-- ❌ Hardcoded — lint warn -->
<button>Enregistrer</button>
<p>Aucune notification pour l'instant</p>
<span>Voir toutes les notifications</span>
```

### Ce qui est exempté

```vue
<!-- ✅ Tailwind CSS classes — ignoré -->
<div class="flex items-center gap-2 text-sm font-medium">

<!-- ✅ Identifiants techniques camelCase/kebab -->
<input name="startDate" />

<!-- ✅ Liens d'ancrage -->
<a href="#main">...</a>

<!-- ✅ URLs et chemins -->
<a href="/dashboard">...</a>
```

### Exemptions par fichier

- `tests/**` — entièrement exempté
- `stories/**` — entièrement exempté (stories montrent des exemples avec strings)
- `server/**` — exempté (logs serveur en EN structuré)

### Comment corriger un warning

```vue
<!-- Avant -->
<button>Enregistrer</button>

<!-- Après -->
<button>{{ $t('common.save') }}</button>
```

```typescript
// Dans le <script setup>
const { t } = useI18n();
const label = t('common.save');
```

### Comment désactiver ponctuellement (justification obligatoire)

```vue
<!-- eslint-disable-next-line vue-i18n/no-raw-text -->
<span>GitHub</span>
<!-- Brand name, pas traduit intentionnellement -->
```

Ajouter un commentaire justifiant le disable.  
Cible : < 10 disable dans tout le repo.

### Métriques

- **CI** : 0 nouvelles violations `vue-i18n/no-raw-text` en error (warn uniquement)
- **Cible post-MVP** : < 50 warnings dans tout le repo (réduction progressive)
