import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppBanner from './AppBanner.vue';

const meta: Meta<typeof AppBanner> = {
  title: 'Molecules/Banner',
  component: AppBanner,
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
      options: ['info', 'success', 'warning', 'danger', 'neutral'],
      description: 'Variant sémantique',
    },
    message: { control: 'text', description: 'Message du bandeau' },
    dismissible: { control: 'boolean', description: 'Bouton de fermeture' },
  },
  args: {
    id: 'storybook-banner',
    variant: 'info',
    message: 'Nouvelle version disponible. Rechargez la page pour profiter des améliorations.',
    dismissible: true,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = {
  args: {
    id: 'storybook-banner-success',
    variant: 'success',
    message: 'Votre profil est maintenant complet.',
  },
};

export const Warning: Story = {
  args: {
    id: 'storybook-banner-warning',
    variant: 'warning',
    message: 'Votre compte expire dans 7 jours. Renouvelez votre abonnement.',
  },
};

export const Danger: Story = {
  args: {
    id: 'storybook-banner-danger',
    variant: 'danger',
    message: 'Service dégradé : les soumissions peuvent être lentes.',
  },
};

export const Neutral: Story = {
  args: {
    id: 'storybook-banner-neutral',
    variant: 'neutral',
    message: 'Maintenance planifiée dimanche de 02h00 à 04h00.',
    dismissible: false,
  },
};
