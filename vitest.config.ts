import { defineVitestConfig } from '@nuxt/test-utils/config';
import { fileURLToPath } from 'node:url';

export default defineVitestConfig({
  resolve: {
    alias: {
      // Module virtuel Nuxt généré par @nuxtjs/supabase — remplacé par un stub
      // pour que les tests server (// @vitest-environment node) puissent s'exécuter
      // sans le runtime Nuxt complet.
      '#supabase/server': fileURLToPath(
        new URL('./tests/__stubs__/supabase-server.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    include: [
      'tests/unit/**/*.{test,spec}.ts',
      'tests/integration/**/*.{test,spec}.ts',
      'tests/rls/**/*.{test,spec}.ts',
    ],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', '.nuxt/**', '.output/**'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Périmètre du gate de couverture UNITAIRE : les couches de logique pure
      // (utils server, code partagé, futurs composables/utils app). Les pages,
      // layouts, le shell `app.vue`, les routes API et les plugins Nitro sont
      // validés par les tests d'intégration / E2E (Playwright) — cf. pyramide de
      // tests (09-engineering-playbook §test). Ce périmètre s'élargira au fur et à
      // mesure que des composants/composables à logique sont ajoutés (component tests).
      include: [
        'server/utils/**/*.ts',
        'shared/**/*.ts',
        'app/composables/**/*.{ts,vue}',
        'app/utils/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/*.{test,spec}.ts',
        '**/types/**',
        '**/*.stories.ts',
        '**/node_modules/**',
        '.nuxt/**',
      ],
      thresholds: {
        // Cf. 09-engineering-playbook DoD : 80% sur le code modifié
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    reporters: process.env['CI'] ? ['default', 'junit', 'github-actions'] : ['default'],
    outputFile: { junit: './test-results/junit.xml' },
  },
});
