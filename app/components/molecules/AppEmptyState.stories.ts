import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppEmptyState from './AppEmptyState.vue';

const meta: Meta<typeof AppEmptyState> = {
  title: 'Molecules/EmptyState',
  component: AppEmptyState,
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
    title: { control: 'text', description: 'Titre court' },
    description: { control: 'text', description: 'Description empathique' },
    illustrationAlt: { control: 'text', description: "Texte alternatif de l'illustration" },
    icon: { control: 'text', description: 'Icône Tabler (mode simplifié)' },
    actionLabel: { control: 'text', description: 'Libellé du CTA' },
    actionIcon: { control: 'text', description: 'Icône du CTA' },
  },
  args: {
    title: 'Aucun cursus trouvé',
    description: 'Commencez par créer votre premier cursus pour encadrer des stagiaires.',
    illustrationAlt: "Une boîte vide symbolisant l'absence de contenu",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCTA: Story = {
  args: {
    title: 'Aucun cursus trouvé',
    description: 'Créez votre premier cursus pour commencer.',
    actionLabel: 'Créer un cursus',
    actionIcon: 'i-tabler-plus',
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Aucune donnée disponible',
    description: "Essayez d'ajuster vos filtres de recherche.",
    icon: 'i-tabler-filter-off',
  },
};

export const SearchEmpty: Story = {
  args: {
    title: 'Aucun résultat pour votre recherche',
    description: "Essayez d'autres mots-clés ou effacez les filtres.",
    icon: 'i-tabler-search-off',
    actionLabel: 'Effacer les filtres',
    actionIcon: 'i-tabler-x',
  },
};

export const TableEmpty: Story = {
  args: {
    title: 'Aucune soumission',
    description: 'Les soumissions de livrables apparaîtront ici.',
    icon: 'i-tabler-file-off',
  },
};
