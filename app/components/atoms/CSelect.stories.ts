import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CSelect from './CSelect.vue';

const roleOptions = [
  { label: 'Stagiaire', value: 'intern' },
  { label: 'Formateur', value: 'trainer' },
  { label: 'Administrateur', value: 'admin' },
];

const meta: Meta<typeof CSelect> = {
  title: 'Atoms/Select',
  component: CSelect,
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
    modelValue: { control: 'text', description: 'Valeur sélectionnée (v-model)' },
    options: { control: 'object', description: 'Options disponibles' },
    label: { control: 'text', description: 'Label affiché au-dessus' },
    placeholder: { control: 'text', description: 'Option vide / invitation à choisir' },
    error: { control: 'text', description: "Message d'erreur" },
    disabled: { control: 'boolean', description: 'Désactive la sélection' },
  },
  args: {
    label: 'Rôle',
    placeholder: 'Choisissez un rôle',
    options: roleOptions,
    modelValue: null,
    disabled: false,
    error: null,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { modelValue: 'trainer' },
};

export const WithError: Story = {
  args: {
    modelValue: null,
    error: 'Veuillez sélectionner un rôle',
  },
};

export const Disabled: Story = {
  args: {
    modelValue: 'intern',
    disabled: true,
  },
};

export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CSelect },
    setup: () => ({ roleOptions }),
    template: `
      <div class="flex flex-col gap-4 max-w-sm">
        <CSelect label="Défaut" placeholder="Choisir..." :options="roleOptions" :model-value="null" :error="null" />
        <CSelect label="Sélectionné" :options="roleOptions" model-value="trainer" :error="null" />
        <CSelect label="Erreur" :options="roleOptions" :model-value="null" error="Sélection requise" />
        <CSelect label="Désactivé" :options="roleOptions" model-value="intern" :disabled="true" :error="null" />
      </div>
    `,
  }),
};
