import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CEmptyState from './CEmptyState.vue';
import CButton from './CButton.vue';

const meta: Meta<typeof CEmptyState> = {
  title: 'Atoms/EmptyState',
  component: CEmptyState,
  tags: ['autodocs'],
  parameters: {
    chromatic: {
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      },
    },
  },
  argTypes: {
    icon: {
      control: 'text',
      description: 'Classe icône Tabler (i-tabler-*)',
    },
    title: {
      control: 'text',
      description: 'Titre principal (obligatoire)',
    },
    description: {
      control: 'text',
      description: 'Description optionnelle',
    },
  },
  args: {
    icon: 'i-tabler-inbox',
    title: 'Aucune soumission',
    description: "Vous n'avez pas encore soumis de travail cette semaine.",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  render: (args) => ({
    components: { CEmptyState, CButton },
    setup: () => ({ args }),
    template: `
      <CEmptyState v-bind="args">
        <CButton variant="primary" size="sm">Créer une soumission</CButton>
      </CEmptyState>
    `,
  }),
};

// NoDescription : on omet 'description' plutôt que de passer undefined
// (exactOptionalPropertyTypes interdit `prop: undefined` pour les props string optionnelles)
export const NoDescription: Story = {
  args: { title: 'Aucune soumission', icon: 'i-tabler-inbox' },
};

export const CustomIcon: Story = {
  args: {
    icon: 'i-tabler-file-off',
    title: 'Aucun fichier',
    description: 'Téléversez un fichier pour commencer.',
  },
};

export const SearchEmpty: Story = {
  args: {
    icon: 'i-tabler-search-off',
    title: 'Aucun résultat',
    description: "Essayez avec d'autres mots-clés.",
  },
};
