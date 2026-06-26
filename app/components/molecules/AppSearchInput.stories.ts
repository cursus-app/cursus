import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppSearchInput from './AppSearchInput.vue';

const meta: Meta<typeof AppSearchInput> = {
  title: 'Molecules/SearchInput',
  component: AppSearchInput,
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
    modelValue: { control: 'text', description: 'Valeur (v-model)' },
    placeholder: { control: 'text', description: 'Placeholder' },
    enableShortcut: { control: 'boolean', description: 'Active le raccourci Cmd+K' },
    disabled: { control: 'boolean', description: 'Désactiver' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Taille',
    },
  },
  args: {
    modelValue: '',
    placeholder: null,
    enableShortcut: true,
    disabled: false,
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { AppSearchInput },
    setup() {
      const value = ref(args.modelValue ?? '');
      return { args, value };
    },
    template: `
      <AppSearchInput v-bind="args" v-model="value" class="max-w-sm" />
    `,
  }),
};

export const WithValue: Story = {
  render: () => ({
    components: { AppSearchInput },
    setup() {
      const value = ref('Alice Dupont');
      return { value };
    },
    template: `
      <AppSearchInput v-model="value" class="max-w-sm" />
    `,
  }),
};

export const NoShortcut: Story = {
  args: { enableShortcut: false },
  render: (args) => ({
    components: { AppSearchInput },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template: `
      <AppSearchInput v-bind="args" v-model="value" class="max-w-sm" />
    `,
  }),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => ({
    components: { AppSearchInput },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template: `
      <AppSearchInput v-bind="args" v-model="value" class="max-w-sm" />
    `,
  }),
};

export const AllSizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { AppSearchInput },
    setup() {
      const values = { sm: ref(''), md: ref(''), lg: ref('') };
      return values;
    },
    template: `
      <div class="flex flex-col gap-3 max-w-sm">
        <AppSearchInput v-model="sm" size="sm" :enable-shortcut="false" placeholder="Petit" />
        <AppSearchInput v-model="md" size="md" :enable-shortcut="false" placeholder="Moyen" />
        <AppSearchInput v-model="lg" size="lg" :enable-shortcut="false" placeholder="Grand" />
      </div>
    `,
  }),
};
