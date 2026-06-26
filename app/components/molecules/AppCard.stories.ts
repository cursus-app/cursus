import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppCard from './AppCard.vue';

const meta: Meta<typeof AppCard> = {
  title: 'Molecules/Card',
  component: AppCard,
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
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Padding interne',
    },
    shadow: {
      control: 'boolean',
      description: 'Ombre portée',
    },
  },
  args: {
    padding: 'md',
    shadow: true,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { AppCard },
    setup: () => ({ args }),
    template: `
      <AppCard v-bind="args">
        <p class="text-text-default">Contenu de la carte</p>
      </AppCard>
    `,
  }),
};

export const WithHeader: Story = {
  render: (args) => ({
    components: { AppCard },
    setup: () => ({ args }),
    template: `
      <AppCard v-bind="args">
        <template #header>
          <h3 class="text-base font-semibold text-text-strong">Titre de la carte</h3>
        </template>
        <p class="text-sm text-text-default">Corps du contenu de la carte.</p>
      </AppCard>
    `,
  }),
};

export const WithHeaderAndFooter: Story = {
  render: (args) => ({
    components: { AppCard },
    setup: () => ({ args }),
    template: `
      <AppCard v-bind="args">
        <template #header>
          <h3 class="text-base font-semibold text-text-strong">Titre</h3>
        </template>
        <p class="text-sm text-text-default">Corps du contenu.</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <button class="px-4 py-2 text-sm text-text-muted hover:text-text-default">Annuler</button>
            <button class="rounded-lg bg-accent px-4 py-2 text-sm text-text-on-accent">Enregistrer</button>
          </div>
        </template>
      </AppCard>
    `,
  }),
};

export const NoShadow: Story = {
  args: { shadow: false },
  render: (args) => ({
    components: { AppCard },
    setup: () => ({ args }),
    template: `
      <AppCard v-bind="args">
        <p class="text-text-default">Carte sans ombre portée</p>
      </AppCard>
    `,
  }),
};

export const SmallPadding: Story = {
  args: { padding: 'sm' },
  render: (args) => ({
    components: { AppCard },
    setup: () => ({ args }),
    template: `
      <AppCard v-bind="args">
        <p class="text-sm text-text-default">Carte avec petit padding</p>
      </AppCard>
    `,
  }),
};
