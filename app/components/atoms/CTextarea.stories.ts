import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CTextarea from './CTextarea.vue';

const meta: Meta<typeof CTextarea> = {
  title: 'Atoms/Textarea',
  component: CTextarea,
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
    modelValue: { control: 'text', description: 'Valeur du champ (v-model)' },
    label: { control: 'text', description: 'Label affiché au-dessus du champ' },
    placeholder: { control: 'text', description: 'Texte placeholder' },
    error: { control: 'text', description: "Message d'erreur (vide = pas d'erreur)" },
    disabled: { control: 'boolean', description: 'Désactive le champ' },
    rows: { control: 'number', description: 'Nombre de lignes visibles' },
  },
  args: {
    label: 'Description',
    placeholder: 'Décrivez votre projet...',
    modelValue: null,
    disabled: false,
    rows: 4,
    error: null,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    modelValue: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Description',
    modelValue: 'trop court',
    error: 'La description doit faire au moins 50 caractères',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Description (lecture seule)',
    modelValue: 'Contenu non modifiable.',
    disabled: true,
  },
};

export const ManyRows: Story = {
  args: {
    label: 'Notes longues',
    placeholder: 'Vos notes détaillées...',
    rows: 8,
  },
};

export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CTextarea },
    template: `
      <div class="flex flex-col gap-4 max-w-sm">
        <CTextarea label="Défaut" placeholder="Écrivez ici..." :model-value="null" :error="null" />
        <CTextarea label="Rempli" model-value="Un contenu rempli." :error="null" />
        <CTextarea label="Erreur" model-value="Ko" error="La description est trop courte" />
        <CTextarea label="Désactivé" model-value="Lecture seule." :disabled="true" :error="null" />
      </div>
    `,
  }),
};
