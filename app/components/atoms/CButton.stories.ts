import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CButton from './CButton.vue';

const meta: Meta<typeof CButton> = {
  title: 'Atoms/Button',
  component: CButton,
  tags: ['autodocs'],
  parameters: {
    chromatic: { modes: { light: true, dark: true } },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'] satisfies Array<
        NonNullable<InstanceType<typeof CButton>['$props']['variant']>
      >,
      description: 'Style visuel du bouton',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'] satisfies Array<
        NonNullable<InstanceType<typeof CButton>['$props']['size']>
      >,
      description: 'Taille du bouton',
    },
    disabled: {
      control: 'boolean',
      description: 'Désactive le bouton',
    },
    loading: {
      control: 'boolean',
      description: 'Affiche le spinner de chargement',
    },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  render: (args) => ({
    components: { CButton },
    setup: () => ({ args }),
    template: '<CButton v-bind="args">Continuer</CButton>',
  }),
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
  render: (args) => ({
    components: { CButton },
    setup: () => ({ args }),
    template: '<CButton v-bind="args">Annuler</CButton>',
  }),
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
  render: (args) => ({
    components: { CButton },
    setup: () => ({ args }),
    template: '<CButton v-bind="args">Voir plus</CButton>',
  }),
};

export const Danger: Story = {
  args: { variant: 'danger' },
  render: (args) => ({
    components: { CButton },
    setup: () => ({ args }),
    template: '<CButton v-bind="args">Supprimer</CButton>',
  }),
};

export const Loading: Story = {
  args: { loading: true },
  render: (args) => ({
    components: { CButton },
    setup: () => ({ args }),
    template: '<CButton v-bind="args">Chargement...</CButton>',
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => ({
    components: { CButton },
    setup: () => ({ args }),
    template: '<CButton v-bind="args">Désactivé</CButton>',
  }),
};

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CButton },
    template: `
      <div class="flex gap-3 items-center flex-wrap">
        <CButton variant="primary">Primary</CButton>
        <CButton variant="secondary">Secondary</CButton>
        <CButton variant="ghost">Ghost</CButton>
        <CButton variant="danger">Danger</CButton>
      </div>
    `,
  }),
};

export const AllSizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CButton },
    template: `
      <div class="flex gap-3 items-center flex-wrap">
        <CButton variant="primary" size="sm">Petit</CButton>
        <CButton variant="primary" size="md">Moyen</CButton>
        <CButton variant="primary" size="lg">Grand</CButton>
      </div>
    `,
  }),
};
