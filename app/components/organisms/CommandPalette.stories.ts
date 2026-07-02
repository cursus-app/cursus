import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CommandPalette from './CommandPalette.vue';

const meta: Meta<typeof CommandPalette> = {
  title: 'Organisms/CommandPalette',
  component: CommandPalette,
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
**CommandPalette** est la palette de commandes globale (Cmd+K / Ctrl+K).

Montée une seule fois dans \`app.vue\`. Utilise \`useCommandPalette()\` pour le contrôle depuis n'importe quel composant.

\`\`\`ts
const { open, close, toggle, isOpen } = useCommandPalette()

// Ouvrir programmatiquement
open()
\`\`\`

La palette est vide au MVP — les providers de commandes seront branchés en ST-20.2+.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  render: () => ({
    components: { CommandPalette },
    setup() {
      const { close } = useCommandPalette();
      close();
      return {};
    },
    template: `
      <div class="flex flex-col items-center justify-center h-48 bg-app rounded-lg gap-4">
        <p class="text-text-muted text-sm">Palette fermée — appuie sur Cmd+K / Ctrl+K pour ouvrir</p>
        <CommandPalette />
      </div>
    `,
  }),
};

export const Open: Story = {
  render: () => ({
    components: { CommandPalette },
    setup() {
      const { open } = useCommandPalette();
      open();
      return {};
    },
    template: `
      <div class="relative h-96 bg-app rounded-lg">
        <CommandPalette />
      </div>
    `,
  }),
};
