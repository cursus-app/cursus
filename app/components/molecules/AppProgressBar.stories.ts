import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppProgressBar from './AppProgressBar.vue';

const meta: Meta<typeof AppProgressBar> = {
  title: 'Molecules/ProgressBar',
  component: AppProgressBar,
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
    value: { control: { type: 'range', min: 0, max: 100, step: 5 }, description: 'Valeur (0-100)' },
    max: { control: 'number', description: 'Valeur maximale' },
    type: {
      control: 'select',
      options: ['linear', 'circular'],
      description: 'Mode de rendu',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Taille',
    },
    showValue: { control: 'boolean', description: 'Affiche la valeur' },
    indeterminate: { control: 'boolean', description: 'Mode indéterminé' },
  },
  args: {
    value: 45,
    max: 100,
    type: 'linear',
    size: 'md',
    showValue: false,
    indeterminate: false,
    label: null,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Linear: Story = {};

export const LinearWithValue: Story = {
  args: { value: 72, showValue: true },
};

export const LinearSmall: Story = {
  args: { size: 'sm', value: 30 },
};

export const LinearLarge: Story = {
  args: { size: 'lg', value: 60 },
};

export const LinearIndeterminate: Story = {
  args: { indeterminate: true },
};

export const Circular: Story = {
  args: { type: 'circular', value: 65, showValue: true },
};

export const CircularSmall: Story = {
  args: { type: 'circular', size: 'sm', value: 80 },
};

export const CircularIndeterminate: Story = {
  args: { type: 'circular', indeterminate: true },
};

export const AllSizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { AppProgressBar },
    template: `
      <div class="flex flex-col gap-4 max-w-sm">
        <AppProgressBar :value="60" size="sm" label="Progression petite" />
        <AppProgressBar :value="60" size="md" label="Progression moyenne" />
        <AppProgressBar :value="60" size="lg" label="Progression grande" />
      </div>
    `,
  }),
};

export const AllCircular: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { AppProgressBar },
    template: `
      <div class="flex gap-6 items-center">
        <AppProgressBar type="circular" :value="25" size="sm" :show-value="true" />
        <AppProgressBar type="circular" :value="55" size="md" :show-value="true" />
        <AppProgressBar type="circular" :value="85" size="lg" :show-value="true" />
      </div>
    `,
  }),
};
