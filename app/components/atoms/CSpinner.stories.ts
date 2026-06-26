import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CSpinner from './CSpinner.vue';

const meta: Meta<typeof CSpinner> = {
  title: 'Atoms/Spinner',
  component: CSpinner,
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
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'] satisfies Array<
        NonNullable<InstanceType<typeof CSpinner>['$props']['size']>
      >,
      description: 'Taille du spinner',
    },
    ariaLabel: {
      control: 'text',
      description: "Label accessible (obligatoire) pour les lecteurs d'écran",
    },
  },
  args: {
    size: 'md',
    ariaLabel: 'Chargement en cours',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'sm', ariaLabel: 'Chargement...' },
};

export const Large: Story = {
  args: { size: 'lg', ariaLabel: 'Chargement en cours' },
};

export const AllSizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CSpinner },
    template: `
      <div class="flex items-center gap-4">
        <CSpinner size="sm" :ariaLabel="'Petit'" />
        <CSpinner size="md" :ariaLabel="'Moyen'" />
        <CSpinner size="lg" :ariaLabel="'Grand'" />
      </div>
    `,
  }),
};

export const InContext: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CSpinner },
    template: `
      <div class="flex flex-col items-center gap-2 p-8">
        <CSpinner size="lg" :ariaLabel="'Chargement du contenu'" />
        <p class="text-sm text-text-muted">Chargement en cours…</p>
      </div>
    `,
  }),
};
