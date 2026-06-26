import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CSwitch from './CSwitch.vue';

const meta: Meta<typeof CSwitch> = {
  title: 'Atoms/Switch',
  component: CSwitch,
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
    modelValue: { control: 'boolean', description: 'État activé (v-model)' },
    label: { control: 'text', description: "Libellé de l'interrupteur" },
    description: { control: 'text', description: 'Description secondaire' },
    disabled: { control: 'boolean', description: "Désactive l'interrupteur" },
  },
  args: {
    modelValue: false,
    label: 'Notifications push',
    description: null,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: { modelValue: true },
};

export const WithDescription: Story = {
  args: {
    label: 'Mode sombre',
    description: 'Basculer entre le thème clair et sombre.',
    modelValue: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Fonctionnalité indisponible',
    modelValue: false,
    disabled: true,
  },
};

export const AllStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CSwitch },
    template: `
      <div class="flex flex-col gap-4 max-w-sm">
        <CSwitch label="Inactif" :model-value="false" />
        <CSwitch label="Actif" :model-value="true" />
        <CSwitch label="Avec description" description="Sous-texte d'explication" :model-value="true" />
        <CSwitch label="Désactivé" :model-value="false" :disabled="true" />
      </div>
    `,
  }),
};
