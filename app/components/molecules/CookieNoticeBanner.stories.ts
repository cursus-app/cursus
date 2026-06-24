/**
 * Story CookieNoticeBanner — ST-16.10
 *
 * CookieNoticeBanner dépend de :
 *  - useCookieNotice() → useCookie() de @nuxtjs/supabase (Nuxt runtime)
 *  - NuxtLink → Nuxt router
 *  - UButton → @nuxt/ui (composables Nuxt internes)
 *
 * TODO: Ces dépendances Nuxt runtime ne sont pas disponibles dans Vite pur
 * (Storybook). Pour les showcaser, il faudrait soit :
 *  1. Mocker les composables via Storybook's `fn()` + un plugin Vite de stub
 *  2. Extraire un composant CookieNoticeBannerUI.vue sans état (slot-driven)
 *     et l'utiliser dans les stories + CookieNoticeBanner comme wrapper.
 *
 * Pour l'instant, on expose une version locale fidèle au rendu visuel final,
 * avec des props simulées (visible/dismiss inlined), sans aucune dépendance Nuxt.
 *
 * Le composant réel reste `app/components/molecules/CookieNoticeBanner.vue`.
 */

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { defineComponent, ref } from 'vue';

// Composant de prévisualisation locale (fidèle visuellement, sans Nuxt runtime)
const CookieNoticeBannerPreview = defineComponent({
  name: 'CookieNoticeBannerPreview',
  props: {
    visible: { type: Boolean, default: true },
  },
  setup(props) {
    const dismissed = ref(false);
    const isVisible = ref(props.visible);

    function dismiss() {
      dismissed.value = true;
      isVisible.value = false;
    }

    return { isVisible, dismissed, dismiss };
  },
  template: `
    <div style="position: relative; min-height: 80px;">
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isVisible"
          role="region"
          aria-label="Information sur les cookies"
          class="border-t border-border-subtle bg-surface shadow-md"
          style="bottom: 0; left: 0; right: 0;"
        >
          <div class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-text-default">
              Cursus utilise uniquement des cookies essentiels au fonctionnement du site (session,
              préférences). Pas de tracking publicitaire.
              <a
                href="/legal/cookies"
                class="ml-1 font-medium text-accent-text underline-offset-2 hover:underline"
              >
                En savoir plus
              </a>
            </p>
            <button
              class="inline-flex items-center justify-center rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-text-on-accent hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fermer le bandeau d'information cookies"
              @click="dismiss"
            >
              OK
            </button>
          </div>
        </div>
      </Transition>
      <p v-if="dismissed" class="text-sm text-text-muted p-4">
        Bandeau dismissé (cookie posé en prod).
      </p>
    </div>
  `,
});

const meta: Meta = {
  title: 'Molecules/CookieNoticeBanner',
  component: CookieNoticeBannerPreview,
  tags: ['autodocs'],
  parameters: {
    chromatic: { modes: { light: true, dark: true } },
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Bandeau d'information cookies conforme ePrivacy + RGPD (doctrine CNIL art. 82).

**Note** : Cette story utilise un composant de prévisualisation locale car
\`CookieNoticeBanner.vue\` dépend de \`useCookie\` (Nuxt runtime), \`NuxtLink\`
et \`UButton\` (@nuxt/ui), non disponibles dans Vite pur.

Pour supprimer cette limitation, extraire une version UI pure dans
\`CookieNoticeBannerUI.vue\` (voir TODO dans le fichier stories).
        `.trim(),
      },
    },
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Contrôle la visibilité initiale du bandeau',
    },
  },
  args: { visible: true },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { CookieNoticeBannerPreview },
    setup: () => ({ args }),
    template: '<CookieNoticeBannerPreview v-bind="args" />',
  }),
};

export const Hidden: Story = {
  args: { visible: false },
  render: (args) => ({
    components: { CookieNoticeBannerPreview },
    setup: () => ({ args }),
    template: '<CookieNoticeBannerPreview v-bind="args" />',
  }),
};
