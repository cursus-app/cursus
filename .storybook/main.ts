import type { StorybookConfig } from '@storybook/vue3-vite';

const worktreeRoot = process.cwd();

const config: StorybookConfig = {
  stories: ['../app/components/**/*.stories.ts', '../stories/**/*.stories.ts'],
  // Storybook 10 : controls, docs, backgrounds, viewport et actions sont bundlés
  // dans le package `storybook` lui-même — pas besoin d'addon-* séparés.
  // @storybook/addon-a11y et @storybook/addon-themes ne sont pas installés (MVP).
  addons: [],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    // Imports dynamiques : ces packages sont des peer deps / devDeps mais
    // ne sont pas résolvables depuis un import statique dans .storybook/main.ts
    // (contexte Node de Storybook différent du contexte Vite).
    const [{ mergeConfig }, { default: vue }, { default: tailwindcss }, { default: autoImport }] =
      await Promise.all([
        import('vite'),
        import('@vitejs/plugin-vue'),
        import('@tailwindcss/vite'),
        // Réplique les auto-imports Nuxt pour que les composables Vue (ref, computed,
        // useSlots…) fonctionnent dans Storybook sans import explicite.
        import('unplugin-auto-import/vite'),
      ]);
    return mergeConfig(config, {
      plugins: [
        vue(),
        tailwindcss(),
        autoImport({
          imports: [
            'vue',
            'vue-router',
            // Réplique l'auto-import Nuxt de vue-i18n (useI18n) pour les composants
            // qui appellent useI18n() sans import explicite.
            { 'vue-i18n': ['useI18n'] },
          ],
          // useToast() de @nuxt/ui n'est pas disponible hors Nuxt — on fournit un mock.
          dirs: [`${worktreeRoot}/.storybook/mocks`],
          dts: false,
        }),
      ],
      resolve: {
        alias: {
          '~~': worktreeRoot,
          '~': `${worktreeRoot}/app`,
        },
      },
    });
  },
};

export default config;
