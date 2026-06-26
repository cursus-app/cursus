import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CTooltip from './CTooltip.vue';

const meta: Meta<typeof CTooltip> = {
  title: 'Atoms/Tooltip',
  component: CTooltip,
  tags: ['autodocs'],
  parameters: {
    chromatic: {
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      },
    },
    layout: 'centered',
  },
  argTypes: {
    text: { control: 'text', description: "Texte de l'infobulle (obligatoire)" },
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'] satisfies Array<
        NonNullable<InstanceType<typeof CTooltip>['$props']['placement']>
      >,
      description: "Position de l'infobulle par rapport à l'élément",
    },
  },
  args: {
    text: 'Informations supplémentaires',
    placement: 'top',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { CTooltip },
    setup: () => ({ args }),
    template: `
      <div class="p-16">
        <CTooltip v-bind="args">
          <button class="rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm text-text-default">
            Survolez-moi
          </button>
        </CTooltip>
      </div>
    `,
  }),
};

export const AllPlacements: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CTooltip },
    template: `
      <div class="grid grid-cols-2 gap-12 p-20">
        <CTooltip text="Infobulle en haut" placement="top">
          <button class="w-full rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm">Top</button>
        </CTooltip>
        <CTooltip text="Infobulle en bas" placement="bottom">
          <button class="w-full rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm">Bottom</button>
        </CTooltip>
        <CTooltip text="Infobulle à gauche" placement="left">
          <button class="w-full rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm">Left</button>
        </CTooltip>
        <CTooltip text="Infobulle à droite" placement="right">
          <button class="w-full rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm">Right</button>
        </CTooltip>
      </div>
    `,
  }),
};

export const LongText: Story = {
  args: {
    text: 'Une infobulle avec un texte plus long pour tester le retour à la ligne automatique dans le composant.',
  },
  render: (args) => ({
    components: { CTooltip },
    setup: () => ({ args }),
    template: `
      <div class="p-16">
        <CTooltip v-bind="args">
          <button class="rounded-lg border border-border-subtle bg-surface px-4 py-2 text-sm">
            Texte long
          </button>
        </CTooltip>
      </div>
    `,
  }),
};
