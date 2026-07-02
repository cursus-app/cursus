// @ts-check
// ESLint 9 flat config. Layers : @nuxt/eslint base + overrides projet.
import withNuxt from './.nuxt/eslint.config.mjs';
import vueI18nPlugin from '@intlify/eslint-plugin-vue-i18n';

export default withNuxt({
  rules: {
    // Cf. 09-engineering-playbook §3.1
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-ignore': true,
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      },
    ],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    curly: ['error', 'all'],
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    // Align with Prettier: void elements use self-closing />
    'vue/html-self-closing': [
      'warn',
      { html: { void: 'always', normal: 'always', component: 'always' } },
    ],
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/define-macros-order': [
      'error',
      { order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'] },
    ],
  },
})
  .append({
    // `consistent-type-imports` est type-aware : sur les fichiers JS (configs hors
    // projet TS), `getParserServices` n'a pas d'info de type → ESLint plante. On
    // l'éteint donc pour ces fichiers (un import de type n'a pas de sens en JS).
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  })
  // `.append` (et non `.override('nuxt/rules', …)`) : on AJOUTE un override ciblé
  // sur les tests/stories, sans restreindre la portée des règles de base Nuxt.
  .append({
    files: ['tests/**/*.ts', 'stories/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    rules: {
      // Plus permissif dans les tests (mocks libs externes)
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  })
  // Exclure les worktrees laissés par les sub-agents : ils ont leur propre
  // eslint.config.js qui importe .nuxt/eslint.config.mjs (non généré → crash).
  .append({
    ignores: ['.claude/worktrees/**'],
  })
  // Spike code (spikes/) = scripts jetables JS pur, pas soumis aux règles app.
  .append({
    ignores: ['spikes/**'],
  })
  // ST-19.6 — Garde-fou i18n : aucune string visible codée en dur dans les templates Vue.
  // Niveau warn (pas error) pour ne pas bloquer les itérations rapides en local ;
  // les nouvelles PRs UI doivent adresser les avertissements avant merge.
  // Exemptions : tests, stories, fichiers de config serveur (logs en EN structuré).
  .append({
    files: ['app/**/*.vue'],
    plugins: { 'vue-i18n': vueI18nPlugin },
    rules: {
      // Détecte les strings UI visibles sans $t()
      'vue-i18n/no-raw-text': [
        'warn',
        {
          // Attributs contenant du texte UI visible à contrôler (en plus des text nodes).
          // Note : `attributes` liste les attributs À VÉRIFIER, pas ceux à exempter.
          // Les attributs non listés (class, id, data-testid…) sont ignorés par défaut.
          attributes: {
            '/.*/': ['placeholder', 'aria-label', 'title', 'alt', 'label'],
          },
          // Patterns techniques exemptés des text nodes et attributs contrôlés :
          // - Tailwind multi-word classes (espace obligatoire entre tokens)
          // - camelCase avec majuscule (startDate, cursusId, repoUrl)
          // - kebab-case / snake_case (data-testid, start_date, text-sm)
          // - URLs, chemins, ancres, constantes UPPER_CASE, ponctuation
          // Les strings UI visibles commencent par une majuscule ou contiennent des accents.
          ignorePattern: [
            // Tailwind CSS multi-word classes (au moins un espace requis)
            '^[a-z0-9][a-z0-9:/.\\-\\[\\]!()]*(?:\\s[a-z0-9:/.\\-\\[\\]!()]+)+$',
            // Vrai camelCase (au moins une majuscule : startDate, cursusId)
            '^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$',
            // kebab-case / snake_case (data-testid, start_date, text-sm)
            '^[a-z0-9]+(?:[_-][a-z0-9]+)+$',
            // Liens d'ancrage HTML (#main, #content…)
            '^#[a-zA-Z0-9_-]+$',
            // URLs et chemins
            '^https?://',
            '^/',
            // Constantes UPPER_CASE avec underscore (ENV_VAR, MAX_RETRIES)
            '^[A-Z][A-Z0-9]*_[A-Z0-9_]+$',
            // Chars spéciaux et ponctuations seules (%, —, @, ·, etc.)
            '^[^a-zA-Z]{1,5}$',
            // Caractère unique
            '^.$',
          ].join('|'),
        },
      ],
    },
    settings: {
      'vue-i18n': {
        localeDir: './locales/*.json',
      },
    },
  })
  // Exemption complète : tests, stories, scripts serveur (logs structurés EN)
  .append({
    files: ['tests/**', 'stories/**', 'server/**', 'prisma/**'],
    plugins: { 'vue-i18n': vueI18nPlugin },
    rules: {
      'vue-i18n/no-raw-text': 'off',
    },
  });
