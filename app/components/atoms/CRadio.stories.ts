import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CRadio from './CRadio.vue';

const levelOptions = [
  { label: 'Débutant', value: 'beginner' },
  { label: 'Intermédiaire', value: 'intermediate' },
  { label: 'Avancé', value: 'advanced' },
];

const meta: Meta<typeof CRadio> = {
  title: 'Atoms/Radio',
  component: CRadio,
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
    options: { control: 'object', description: 'Options radio disponibles' },
    label: { control: 'text', description: 'Libellé du groupe' },
    error: { control: 'text', description: "Message d'erreur" },
    disabled: { control: 'boolean', description: 'Désactive le groupe' },
  },
  args: {
    label: 'Niveau',
    options: levelOptions,
    modelValue: null,
    error: null,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { modelValue: 'intermediate' },
};

export const WithError: Story = {
  args: {
    modelValue: null,
    error: 'Veuillez sélectionner un niveau',
  },
};

export const Disabled: Story = {
  args: {
    modelValue: 'beginner',
    disabled: true,
  },
};

export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CRadio },
    setup: () => ({ levelOptions }),
    template: `
      <div class="flex flex-col gap-6 max-w-sm">
        <CRadio label="Défaut" :options="levelOptions" :model-value="null" />
        <CRadio label="Avec valeur" :options="levelOptions" model-value="advanced" />
        <CRadio label="Erreur" :options="levelOptions" :model-value="null" error="Sélection requise" />
        <CRadio label="Désactivé" :options="levelOptions" model-value="beginner" :disabled="true" />
      </div>
    `,
  }),
};
