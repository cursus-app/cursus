import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CBadge from './CBadge.vue';

const meta: Meta<typeof CBadge> = {
  title: 'Atoms/Badge',
  component: CBadge,
  tags: ['autodocs'],
  parameters: {
    chromatic: { modes: { light: true, dark: true } },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger', 'info'] satisfies Array<
        NonNullable<InstanceType<typeof CBadge>['$props']['variant']>
      >,
      description: 'Variante sémantique du badge',
    },
    size: {
      control: 'select',
      options: ['sm', 'md'] satisfies Array<
        NonNullable<InstanceType<typeof CBadge>['$props']['size']>
      >,
      description: 'Taille du badge',
    },
  },
  args: { variant: 'default', size: 'md' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { CBadge },
    setup: () => ({ args }),
    template: '<CBadge v-bind="args">Brouillon</CBadge>',
  }),
};

export const Success: Story = {
  args: { variant: 'success' },
  render: (args) => ({
    components: { CBadge },
    setup: () => ({ args }),
    template: '<CBadge v-bind="args">Validé</CBadge>',
  }),
};

export const Warning: Story = {
  args: { variant: 'warning' },
  render: (args) => ({
    components: { CBadge },
    setup: () => ({ args }),
    template: '<CBadge v-bind="args">En attente</CBadge>',
  }),
};

export const Danger: Story = {
  args: { variant: 'danger' },
  render: (args) => ({
    components: { CBadge },
    setup: () => ({ args }),
    template: '<CBadge v-bind="args">Rejeté</CBadge>',
  }),
};

export const Info: Story = {
  args: { variant: 'info' },
  render: (args) => ({
    components: { CBadge },
    setup: () => ({ args }),
    template: '<CBadge v-bind="args">Info</CBadge>',
  }),
};

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CBadge },
    template: `
      <div class="flex gap-2 flex-wrap items-center">
        <CBadge variant="default">Brouillon</CBadge>
        <CBadge variant="success">Validé</CBadge>
        <CBadge variant="warning">En attente</CBadge>
        <CBadge variant="danger">Rejeté</CBadge>
        <CBadge variant="info">Info</CBadge>
      </div>
    `,
  }),
};

export const AllSizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CBadge },
    template: `
      <div class="flex gap-2 items-center flex-wrap">
        <CBadge variant="success" size="sm">Validé (sm)</CBadge>
        <CBadge variant="success" size="md">Validé (md)</CBadge>
      </div>
    `,
  }),
};
