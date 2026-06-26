import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppToast from './AppToast.vue';

const meta: Meta<typeof AppToast> = {
  title: 'Molecules/Toast',
  component: AppToast,
  tags: ['autodocs'],
  parameters: {
    chromatic: {
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      },
    },
    docs: {
      description: {
        component: `
**AppToast** est un composant provider qui monte le système de toasts @nuxt/ui.

Placez \`<AppToast />\` une seule fois dans votre layout racine.

Utilisez ensuite \`useAppToast()\` pour émettre des toasts depuis n'importe quel composant :

\`\`\`ts
const { success, warning, danger, info } = useAppToast()

success('Modifications enregistrées')
danger('Erreur de sauvegarde', 'Réessayez plus tard')
\`\`\`

La queue est limitée à 3 toasts simultanés.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Provider: Story = {
  render: () => ({
    components: { AppToast },
    setup() {
      const { success, warning, danger, info } = useAppToast();
      return { success, warning, danger, info };
    },
    template: `
      <div class="flex flex-col gap-3">
        <AppToast />
        <p class="text-sm text-text-muted">Cliquez sur les boutons pour déclencher des toasts :</p>
        <div class="flex flex-wrap gap-2">
          <button
            class="rounded-lg bg-success-solid px-3 py-1.5 text-sm text-text-on-accent"
            @click="success('Succès', 'Opération réalisée avec succès.')"
          >
            Toast succès
          </button>
          <button
            class="rounded-lg bg-warning-solid px-3 py-1.5 text-sm text-text-on-accent"
            @click="warning('Attention', 'Vérifiez vos données.')"
          >
            Toast warning
          </button>
          <button
            class="rounded-lg bg-danger-solid px-3 py-1.5 text-sm text-text-on-accent"
            @click="danger('Erreur', 'Quelque chose a échoué.')"
          >
            Toast danger
          </button>
          <button
            class="rounded-lg bg-info-solid px-3 py-1.5 text-sm text-text-on-accent"
            @click="info('Information', 'Voici une info utile.')"
          >
            Toast info
          </button>
        </div>
      </div>
    `,
  }),
};
