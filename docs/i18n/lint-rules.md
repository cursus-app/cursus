# Règles ESLint i18n — ST-19.6

## Règle active : `vue-i18n/no-raw-text`

Plugin : `@intlify/eslint-plugin-vue-i18n`  
Niveau : **`warn`** (pas `error` pour ne pas bloquer les itérations rapides)

### Objectif

Détecter les strings UI visibles codées en dur dans les templates Vue.  
Toute string affichée à l'utilisateur doit utiliser `$t('clé')` ou `t('clé')`.

### Ce qui est détecté (exemples)

```vue
<!-- ❌ Text node hardcodé — lint warn -->
<button>Enregistrer</button>
<p>Aucune notification pour l'instant</p>
<span>Cancel</span>

<!-- ❌ Attribut UI hardcodé — lint warn -->
<input placeholder="Ton email" />
<button aria-label="Fermer">×</button>
<img alt="Photo de profil" />
```

### Attributs contrôlés

L'option `attributes` liste les attributs **à inspecter** (en plus des text nodes) :

| Attribut      | Raison                              |
| ------------- | ----------------------------------- |
| `placeholder` | Texte visible dans les champs vides |
| `aria-label`  | Texte pour les lecteurs d'écran     |
| `title`       | Infobulle au survol                 |
| `alt`         | Description des images              |
| `label`       | Labels de composants                |

Les attributs techniques (`class`, `id`, `data-testid`, `style`, `href`, `src`…) sont **ignorés par défaut** car non listés dans `attributes`.

### Ce qui est exempté (`ignorePattern`)

```vue
<!-- ✅ Tailwind CSS multi-word classes (espace requis) — ignoré -->
<div class="flex items-center gap-2 text-sm font-medium">

<!-- ✅ Attributs techniques (non dans la liste attributes) — ignoré -->
<input data-testid="email-input" />
<a href="/dashboard">…</a>
<img src="/avatar.png" />

<!-- ✅ camelCase avec majuscule (startDate, cursusId) — ignoré -->
<input name="startDate" />

<!-- ✅ kebab-case / snake_case (data-testid, text-sm) — ignoré -->
<component name="some-component" />

<!-- ✅ Ancres (#main), URLs, chemins (/dashboard) — ignoré -->
<a href="#main">…</a>

<!-- ✅ Ponctuation / chars spéciaux (%, —, ·) — ignoré -->
<span>—</span>
```

### Ce qui N'est PAS exempté

- Mots simples en minuscules : `<button>cancel</button>`, `<span>submit</span>` → flaggé
- Chaînes français avec accents : `<p>Aucune notification</p>` → flaggé
- Chaînes anglaises commençant par majuscule : `<button>Save changes</button>` → flaggé

### Exemptions par fichier

- `tests/**` — entièrement exempté
- `stories/**` — entièrement exempté (stories montrent des exemples avec strings)
- `server/**` — exempté (logs serveur en EN structuré)
- `prisma/**` — exempté

### Comment corriger un warning

```vue
<!-- Avant -->
<button>Enregistrer</button>
<input placeholder="Ton email" />

<!-- Après -->
<button>{{ $t('common.save') }}</button>
<input :placeholder="$t('auth.email.placeholder')" />
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

- **CI** : 0 nouvelles violations `vue-i18n/no-raw-text` (warn uniquement pour l'instant)
- **Cible post-MVP** : < 50 warnings dans tout le repo (réduction progressive par TT-19.6.3)
- **Cible long terme** : passage en `error` après TT-19.6.3 (premier pass de fix sur l'existant)
