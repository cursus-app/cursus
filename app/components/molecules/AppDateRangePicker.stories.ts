import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppDateRangePicker from './AppDateRangePicker.vue';
import type { DateRange } from './AppDateRangePicker.vue';

const meta: Meta<typeof AppDateRangePicker> = {
  title: 'Molecules/DateRangePicker',
  component: AppDateRangePicker,
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
    min: { control: 'text', description: 'Borne min (YYYY-MM-DD)' },
    max: { control: 'text', description: 'Borne max (YYYY-MM-DD)' },
    disabled: { control: 'boolean', description: 'Désactiver' },
    label: { control: 'text', description: 'Label du groupe' },
  },
  args: {
    min: null,
    max: null,
    disabled: false,
    label: 'Période de la cohorte',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { AppDateRangePicker },
    setup() {
      const range = ref<DateRange>({ start: null, end: null });
      return { args, range };
    },
    template: `
      <AppDateRangePicker v-bind="args" v-model="range" class="max-w-lg" />
    `,
  }),
};

export const WithValues: Story = {
  render: () => ({
    components: { AppDateRangePicker },
    setup() {
      const range = ref<DateRange>({ start: '2026-09-01', end: '2026-12-31' });
      return { range };
    },
    template: `
      <AppDateRangePicker v-model="range" label="Période de la cohorte" class="max-w-lg" />
    `,
  }),
};

export const WithError: Story = {
  render: () => ({
    components: { AppDateRangePicker },
    setup() {
      // Date de fin avant date de début → erreur
      const range = ref<DateRange>({ start: '2026-12-01', end: '2026-09-01' });
      return { range };
    },
    template: `
      <AppDateRangePicker v-model="range" label="Période invalide" class="max-w-lg" />
    `,
  }),
};

export const WithBounds: Story = {
  render: () => ({
    components: { AppDateRangePicker },
    setup() {
      const range = ref<DateRange>({ start: null, end: null });
      return { range };
    },
    template: `
      <AppDateRangePicker
        v-model="range"
        min="2026-01-01"
        max="2026-12-31"
        label="Seulement en 2026"
        class="max-w-lg"
      />
    `,
  }),
};

export const Disabled: Story = {
  render: () => ({
    components: { AppDateRangePicker },
    setup() {
      const range = ref<DateRange>({ start: '2026-09-01', end: '2026-12-31' });
      return { range };
    },
    template: `
      <AppDateRangePicker v-model="range" :disabled="true" label="Période (lecture seule)" class="max-w-lg" />
    `,
  }),
};
