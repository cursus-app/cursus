import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CTag from './CTag.vue';

const meta: Meta<typeof CTag> = {
  title: 'Atoms/Tag',
  component: CTag,
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
    label: { control: 'text', description: 'Texte du tag' },
    variant: {
      control: 'select',
      options: ['default', 'info', 'success', 'warning', 'danger'] satisfies Array<
        NonNullable<InstanceType<typeof CTag>['$props']['variant']>
      >,
      description: 'Variante de couleur',
    },
    removable: { control: 'boolean', description: 'Affiche le bouton de suppression' },
  },
  args: {
    label: 'TypeScript',
    variant: 'default',
    removable: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Removable: Story = {
  args: { label: 'Vue.js', removable: true },
};

export const Info: Story = {
  args: { label: 'En cours', variant: 'info' },
};

export const Success: Story = {
  args: { label: 'Validé', variant: 'success' },
};

export const Warning: Story = {
  args: { label: 'En attente', variant: 'warning' },
};

export const Danger: Story = {
  args: { label: 'Échoué', variant: 'danger' },
};

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CTag },
    template: `
      <div class="flex flex-wrap gap-2">
        <CTag label="Default" variant="default" />
        <CTag label="Info" variant="info" />
        <CTag label="Succès" variant="success" />
        <CTag label="Attention" variant="warning" />
        <CTag label="Erreur" variant="danger" />
      </div>
    `,
  }),
};

export const AllVariantsRemovable: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CTag },
    template: `
      <div class="flex flex-wrap gap-2">
        <CTag label="TypeScript" variant="default" :removable="true" />
        <CTag label="Vue 3" variant="info" :removable="true" />
        <CTag label="Livré" variant="success" :removable="true" />
        <CTag label="Brouillon" variant="warning" :removable="true" />
        <CTag label="Bloqué" variant="danger" :removable="true" />
      </div>
    `,
  }),
};
