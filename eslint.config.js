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
          // Attributs techniques exemptés (pas affichés à l'utilisateur)
          attributes: {
            '/.*/': [
              'class',
              'style',
              'id',
              'name',
              'data-testid',
              'data-cy',
              'href',
              'to',
              'src',
              'key',
              'value',
            ],
          },
          // Strings purement techniques exemptées :
          // - Tailwind classes (lowercase + espace + ponctuation CSS, >2 chars)
          // - Single chars / punctuation (%, —, @, —, S, etc.)
          // - URLs et chemins (/dashboard, https://…)
          // - Constantes UPPER_CASE
          // - Identifiants techniques kebab-case
          // Les strings UI visibles commencent par une majuscule ou contiennent des accents.
          ignorePattern: [
            // Tailwind CSS classes : 2+ mots lowercase séparés par espace
            '^[a-z0-9][a-z0-9\\s:/.\\-\\[\\]!()]+$',
            // Identifiant technique single-word kebab/snake/camelCase
            '^[a-z0-9_-]+$',
            '^[a-z][a-zA-Z0-9]+$',
            // Liens d'ancrage HTML (#main, #content…)
            '^#[a-zA-Z0-9_-]+$',
            // URLs et chemins
            '^https?://',
            '^/',
            // Constantes UPPER_CASE (ex: ENV_VAR)
            '^[A-Z][A-Z0-9_]+$',
            // Chars spéciaux et ponctuations seules (%, —, @, ·, etc.)
            '^[^a-zA-Z]{1,5}$',
            // Single lettre ou chiffre
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
