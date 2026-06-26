import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppFormField from './AppFormField.vue';

const meta: Meta<typeof AppFormField> = {
  title: 'Molecules/FormField',
  component: AppFormField,
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
    label: { control: 'text', description: 'Libellé du champ' },
    name: { control: 'text', description: 'Nom du champ (vee-validate)' },
    error: { control: 'text', description: "Message d'erreur" },
    hint: { control: 'text', description: "Message d'aide" },
    required: { control: 'boolean', description: 'Champ requis' },
  },
  args: {
    label: 'Adresse email',
    name: 'email',
    required: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { AppFormField },
    setup: () => ({ args }),
    template: `
      <AppFormField v-bind="args">
        <input
          type="email"
          placeholder="toi@exemple.com"
          class="flex w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default placeholder:text-text-subtle focus:ring-2 focus:ring-ring focus:outline-none"
        />
      </AppFormField>
    `,
  }),
};

export const WithError: Story = {
  args: {
    label: 'Email',
    error: 'Adresse email invalide',
    name: 'email',
  },
  render: (args) => ({
    components: { AppFormField },
    setup: () => ({ args }),
    template: `
      <AppFormField v-bind="args">
        <input
          type="email"
          value="pas-un-email"
          class="flex w-full rounded-lg border border-danger-solid bg-surface px-3 py-2 text-sm text-text-default"
        />
      </AppFormField>
    `,
  }),
};

export const WithHint: Story = {
  args: {
    label: 'Identifiant public',
    hint: 'Uniquement des lettres minuscules, chiffres et tirets.',
    name: 'slug',
  },
  render: (args) => ({
    components: { AppFormField },
    setup: () => ({ args }),
    template: `
      <AppFormField v-bind="args">
        <input
          type="text"
          placeholder="mon-identifiant"
          class="flex w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default placeholder:text-text-subtle focus:ring-2 focus:ring-ring focus:outline-none"
        />
      </AppFormField>
    `,
  }),
};

export const Required: Story = {
  args: {
    label: 'Nom complet',
    required: true,
    name: 'fullName',
  },
  render: (args) => ({
    components: { AppFormField },
    setup: () => ({ args }),
    template: `
      <AppFormField v-bind="args">
        <input
          type="text"
          placeholder="Prénom Nom"
          class="flex w-full rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default placeholder:text-text-subtle focus:ring-2 focus:ring-ring focus:outline-none"
        />
      </AppFormField>
    `,
  }),
};
