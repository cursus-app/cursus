// @ts-check
// ESLint 9 flat config. Layers : @nuxt/eslint base + overrides projet.
import withNuxt from './.nuxt/eslint.config.mjs';

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
  });
