import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CSkeleton from './CSkeleton.vue';

const meta: Meta<typeof CSkeleton> = {
  title: 'Atoms/Skeleton',
  component: CSkeleton,
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
    width: { control: 'text', description: 'Largeur (ex: 200, "100%", "8rem")' },
    height: { control: 'text', description: 'Hauteur (ex: 20, "1rem")' },
    rounded: { control: 'boolean', description: 'Forme pill (rounded-full)' },
    class: { control: 'text', description: 'Classes Tailwind supplémentaires' },
  },
  args: {
    width: 200,
    height: 20,
    rounded: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Rounded: Story = {
  args: { width: 48, height: 48, rounded: true },
};

export const FullWidth: Story = {
  args: { width: '100%', height: 16 },
};

export const CardSkeleton: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CSkeleton },
    template: `
      <div class="max-w-sm space-y-4 rounded-xl border border-border-subtle bg-surface p-6">
        <div class="flex items-center gap-3">
          <CSkeleton :width="48" :height="48" :rounded="true" />
          <div class="flex flex-col gap-2">
            <CSkeleton width="120" :height="16" />
            <CSkeleton width="80" :height="12" />
          </div>
        </div>
        <CSkeleton width="100%" :height="12" />
        <CSkeleton width="80%" :height="12" />
        <CSkeleton width="60%" :height="12" />
      </div>
    `,
  }),
};

export const ListSkeleton: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CSkeleton },
    template: `
      <div class="flex flex-col gap-3 max-w-sm">
        <div v-for="i in 4" :key="i" class="flex items-center gap-3">
          <CSkeleton :width="32" :height="32" :rounded="true" />
          <CSkeleton width="70%" :height="14" />
        </div>
      </div>
    `,
  }),
};
