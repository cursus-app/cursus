import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CInput from './CInput.vue';

const meta: Meta<typeof CInput> = {
  title: 'Atoms/Input',
  component: CInput,
  tags: ['autodocs'],
  parameters: {
    chromatic: { modes: { light: true, dark: true } },
  },
  argTypes: {
    modelValue: { control: 'text', description: 'Valeur du champ (v-model)' },
    label: { control: 'text', description: 'Label affiché au-dessus du champ' },
    placeholder: { control: 'text', description: 'Texte placeholder' },
    error: { control: 'text', description: "Message d'erreur (vide = pas d'erreur)" },
    disabled: { control: 'boolean', description: 'Désactive le champ' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search'],
      description: 'Type HTML du champ',
    },
  },
  args: {
    label: 'Email',
    placeholder: 'mohamed@cursus.app',
    modelValue: null,
    disabled: false,
    type: 'text',
    error: null,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { modelValue: 'stagiaire@cursus.app' },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    modelValue: 'bad-email',
    error: 'Format email invalide',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Email (lecture seule)',
    modelValue: 'read@only.com',
    disabled: true,
  },
};

export const Password: Story = {
  args: {
    label: 'Mot de passe',
    placeholder: '••••••••',
    type: 'password',
    modelValue: null,
  },
};

export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CInput },
    template: `
      <div class="flex flex-col gap-4 max-w-sm">
        <CInput label="Défaut" placeholder="Email..." :model-value="null" :error="null" />
        <CInput label="Rempli" model-value="stagiaire@cursus.app" :error="null" />
        <CInput label="Erreur" model-value="bad-email" error="Format email invalide" />
        <CInput label="Désactivé" model-value="lecture@seule.fr" :disabled="true" :error="null" />
      </div>
    `,
  }),
};
