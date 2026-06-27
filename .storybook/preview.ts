import type { Preview } from '@storybook/vue3';
import { setup } from '@storybook/vue3';
import { createI18n } from 'vue-i18n';
import '../assets/css/main.css';

// Fournit useI18n() aux composants qui le consomment via Nuxt auto-import.
// `missing` retourne la clé brute — suffisant pour afficher les stories sans traductions réelles.
const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  messages: { fr: {} },
  missing: (_locale: string, key: string) => key,
});

setup((app) => {
  app.use(i18n);
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      // Désactivé : on gère le dark mode via la classe `.dark` sur le wrapper
      disable: true,
    },
    chromatic: {
      modes: {
        light: { backgrounds: { value: 'transparent' } },
        dark: { backgrounds: { value: 'transparent' } },
      },
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Bascule light / dark (classe .dark sur <html>)',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      const theme = (context.globals['theme'] ?? 'light') as string;
      return {
        setup() {
          return { theme };
        },
        template: `<div
          :class="theme === 'dark' ? 'dark bg-app' : 'bg-app'"
          style="min-height: 100vh; padding: 1.5rem; box-sizing: border-box;"
        ><story /></div>`,
      };
    },
  ],
};

export default preview;
