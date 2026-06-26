import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppAlert from './AppAlert.vue';

const meta: Meta<typeof AppAlert> = {
  title: 'Molecules/Alert',
  component: AppAlert,
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
    variant: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'info'],
      description: 'Variant sémantique',
    },
    title: { control: 'text', description: 'Titre' },
    description: { control: 'text', description: 'Description' },
    dismissible: { control: 'boolean', description: 'Bouton de fermeture' },
  },
  args: {
    variant: 'info',
    title: 'Information',
    description: 'Ceci est un message informatif.',
    dismissible: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
  args: {
    variant: 'success',
    title: 'Succès',
    description: 'Votre profil a été mis à jour avec succès.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    title: 'Attention',
    description: 'Cette action est irréversible. Veuillez confirmer.',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    title: 'Erreur',
    description: 'Impossible de sauvegarder vos modifications. Réessayez.',
  },
};

export const Dismissible: Story = {
  args: {
    variant: 'info',
    title: 'Fermer cette alerte',
    description: 'Cliquez sur la croix pour fermer.',
    dismissible: true,
  },
};

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { AppAlert },
    template: `
      <div class="flex flex-col gap-3 max-w-lg">
        <AppAlert variant="success" title="Succès" description="Opération réalisée avec succès." :dismissible="true" />
        <AppAlert variant="warning" title="Attention" description="Vérifiez vos informations avant de continuer." />
        <AppAlert variant="danger" title="Erreur" description="Une erreur est survenue." />
        <AppAlert variant="info" title="Information" description="Voici une information utile." />
      </div>
    `,
  }),
};
