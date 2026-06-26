import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CCheckbox from './CCheckbox.vue';

const meta: Meta<typeof CCheckbox> = {
  title: 'Atoms/Checkbox',
  component: CCheckbox,
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
    modelValue: { control: 'boolean', description: 'État coché (v-model)' },
    label: { control: 'text', description: 'Libellé de la case' },
    description: { control: 'text', description: 'Description secondaire' },
    error: { control: 'text', description: "Message d'erreur" },
    disabled: { control: 'boolean', description: 'Désactive la case' },
    indeterminate: { control: 'boolean', description: 'État intermédiaire' },
  },
  args: {
    modelValue: false,
    label: "J'accepte les conditions d'utilisation",
    description: null,
    error: null,
    disabled: false,
    indeterminate: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  args: { modelValue: true },
};

export const WithDescription: Story = {
  args: {
    label: 'Notifications par email',
    description: 'Recevez un résumé hebdomadaire de votre activité.',
    modelValue: true,
  },
};

export const WithError: Story = {
  args: {
    label: "J'accepte les conditions",
    error: 'Vous devez accepter les conditions pour continuer',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Option non disponible',
    modelValue: false,
    disabled: true,
  },
};

export const Indeterminate: Story = {
  args: {
    label: 'Sélectionner tout',
    indeterminate: true,
  },
};

export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CCheckbox },
    template: `
      <div class="flex flex-col gap-4 max-w-sm">
        <CCheckbox label="Non coché" :model-value="false" />
        <CCheckbox label="Coché" :model-value="true" />
        <CCheckbox label="Avec description" description="Sous-texte d'aide" :model-value="true" />
        <CCheckbox label="Erreur" error="Champ requis" :model-value="false" />
        <CCheckbox label="Désactivé" :model-value="false" :disabled="true" />
        <CCheckbox label="Intermédiaire" :indeterminate="true" />
      </div>
    `,
  }),
};
